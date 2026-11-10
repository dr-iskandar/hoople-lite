import type {FastifyInstance,FastifyRequest} from 'fastify';
import type {PoolClient} from 'pg';
import {type AuthSettings,type Creator,type DbPool,setOrganizationContext,withCreator} from './creator-auth.js';
import {creatorCookieNames} from './creator-routes.js';
import {
  type HopayGateway,type HopaySettings,createHopayCheckout,isPaidPlan,STAGING_PLANS,validPaymentMethod,verifiedCheckoutUrl,
} from './hopay.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Response = {status:number;body:Record<string,unknown>};
type CheckoutRow = {id:string;plan_id:string;amount_idr:number;state:string;checkout_url:string|null};
const result = (status:number,body:Record<string,unknown>):Response=>({status,body});

export function registerBillingRoutes(app:FastifyInstance,pool?:DbPool,auth?:AuthSettings,
  hopay?:HopaySettings,gateway:HopayGateway=createHopayCheckout) {
  const cookie=creatorCookieNames(auth?.secureCookies??true).session;

  async function authorized(request:FastifyRequest,
    work:(client:PoolClient,creator:Creator,oid:string)=>Promise<Response>,mutation=false):Promise<Response> {
    if (!pool || !auth || !hopay) return result(503,{error:'BILLING_NOT_CONFIGURED'});
    if (mutation && request.headers.origin!==auth.webOrigin) return result(403,{error:'FORBIDDEN_ORIGIN'});
    const {oid}=request.params as {oid:string};
    if (!uuid.test(oid)) return result(400,{error:'INVALID_ORGANIZATION_ID'});
    try {
      const response=await withCreator(pool,request.cookies[cookie],async({client,creator})=>{
        await setOrganizationContext(client,oid);
        const member=await client.query<{role:string}>(`SELECT m.role FROM memberships m
          JOIN organizations o ON o.id=m.organization_id
          WHERE m.organization_id=$1 AND m.user_id=$2 AND o.archived_at IS NULL`,[oid,creator.id]);
        if (!member.rows[0]) return result(404,{error:'WORKSPACE_NOT_FOUND'});
        if (!['owner','admin','billing'].includes(member.rows[0].role)) return result(403,{error:'INSUFFICIENT_ROLE'});
        return work(client,creator,oid);
      });
      if (!response) return result(401,{error:'UNAUTHENTICATED'});
      return response;
    } catch {
      return result(503,{error:'DATABASE_UNAVAILABLE'});
    }
  }

  app.post('/v1/orgs/:oid/billing/checkout',async(request,reply)=>{
    reply.header('Cache-Control','no-store');
    // Reject before touching a DB or contacting HoPay when security/config prerequisites fail.
    const body=request.body;
    if (!body || typeof body!=='object' || Array.isArray(body)) return reply.code(400).send({error:'INVALID_CHECKOUT'});
    const values=body as Record<string,unknown>;
    if (Object.keys(values).some(key=>!['planId','idempotencyKey','customerPhone','paymentMethod'].includes(key))
      || !isPaidPlan(values.planId) || typeof values.idempotencyKey!=='string' || !uuid.test(values.idempotencyKey)
      || !validPaymentMethod(values.paymentMethod)
      || (values.customerPhone!==undefined && (typeof values.customerPhone!=='string'
        || !/^\+?[0-9\s()-]{7,24}$/.test(values.customerPhone)))) {
      return reply.code(400).send({error:'INVALID_CHECKOUT'});
    }
    const {planId,idempotencyKey}=values as {planId:keyof typeof STAGING_PLANS;idempotencyKey:string};
    const preliminary=await authorized(request,async(client,creator,oid)=>{
      const current=await client.query<CheckoutRow>(`SELECT id,plan_id,amount_idr,state,checkout_url
        FROM billing_checkout_requests WHERE organization_id=$1 AND creator_user_id=$2 AND idempotency_key=$3`,
        [oid,creator.id,idempotencyKey]);
      if (current.rows[0]) {
        const row=current.rows[0];
        if (row.plan_id!==planId) return result(409,{error:'IDEMPOTENCY_CONFLICT'});
        if (row.state==='redirect_ready' && row.checkout_url) return result(200,{checkoutId:row.id,
          checkoutUrl:row.checkout_url,amount:row.amount_idr,currency:'IDR',state:'awaiting_verification',staging:true});
        return result(409,{error:'CHECKOUT_ALREADY_STARTED',checkoutId:row.id});
      }
      const inserted=await client.query<{id:string}>(`INSERT INTO billing_checkout_requests
        (organization_id,creator_user_id,idempotency_key,plan_id,amount_idr)
        VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id`,
        [oid,creator.id,idempotencyKey,planId,STAGING_PLANS[planId].price]);
      if (!inserted.rows[0]) return result(409,{error:'CHECKOUT_ALREADY_STARTED'});
      return result(201,{checkoutId:inserted.rows[0].id,creatorEmail:creator.email,
        creatorName:creator.displayName});
    },true);

    // Do not call the payment provider on an unauthorized or duplicate checkout.
    if (preliminary.status!==201) return reply.code(preliminary.status).send(preliminary.body);
    const info=preliminary.body as {checkoutId:string;creatorEmail:string|null;creatorName:string|null};
    const checkoutId=info.checkoutId;
    let checkoutUrl:string;
    try {
      const customerName=info.creatorName?.trim().slice(0,255);
      const email=info.creatorEmail?.trim();
      checkoutUrl=await gateway({planId,
        ...(customerName?{customerName}:{}),
        ...(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length<=254?{customerEmail:email}:{}),
        ...(typeof values.customerPhone==='string'?{customerPhone:values.customerPhone}:{}),
        ...(values.paymentMethod?{paymentMethod:values.paymentMethod as string|string[]}:{}),
      },hopay!);
      // Even test-injected implementations cannot make us send a browser to an unsafe domain.
      if (verifiedCheckoutUrl({checkoutUrl})!==checkoutUrl) throw new Error('HOPAY_INVALID_RESPONSE');
    } catch {
      try {
        await withCreator(pool!,request.cookies[cookie],async({client})=>{
          await setOrganizationContext(client,(request.params as {oid:string}).oid);
          await client.query(`UPDATE billing_checkout_requests SET state='initiation_failed',updated_at=now()
            WHERE id=$1 AND state='creating'`,[checkoutId]);
        });
      } catch { /* Fail closed; checkout remains pending for reconciliation. */ }
      return reply.code(502).send({error:'HOPAY_CHECKOUT_UNAVAILABLE',checkoutId});
    }
    try {
      const saved=await withCreator(pool!,request.cookies[cookie],async({client})=>{
        await setOrganizationContext(client,(request.params as {oid:string}).oid);
        const row=await client.query<{id:string}>(`UPDATE billing_checkout_requests SET state='redirect_ready',
          checkout_url=$2,updated_at=now() WHERE id=$1 AND state='creating' RETURNING id`,[checkoutId,checkoutUrl]);
        return Boolean(row.rows[0]);
      });
      if (!saved) return reply.code(503).send({error:'CHECKOUT_RECONCILIATION_REQUIRED',checkoutId});
      reply.header('Cache-Control','no-store');
      return reply.code(201).send({checkoutId,checkoutUrl,amount:STAGING_PLANS[planId].price,
        currency:'IDR',state:'awaiting_verification',staging:true});
    } catch {
      return reply.code(503).send({error:'CHECKOUT_RECONCILIATION_REQUIRED',checkoutId});
    }
  });

  app.get('/v1/orgs/:oid/billing/checkouts/:checkoutId',async(req,rep)=>{
    rep.header('Cache-Control','no-store');
    const response=await authorized(req,async(client,creator,oid)=>{
    const {checkoutId}=req.params as {checkoutId:string};
    if (!uuid.test(checkoutId)) return result(400,{error:'INVALID_CHECKOUT_ID'});
    const row=await client.query<CheckoutRow>(`SELECT id,plan_id,amount_idr,state,checkout_url
      FROM billing_checkout_requests WHERE id=$1 AND organization_id=$2 AND creator_user_id=$3`,
      [checkoutId,oid,creator.id]);
    if (!row.rows[0]) return result(404,{error:'CHECKOUT_NOT_FOUND'});
    return result(200,{checkoutId:row.rows[0].id,planId:row.rows[0].plan_id,amount:row.rows[0].amount_idr,
      currency:'IDR',state:row.rows[0].state==='redirect_ready'?'awaiting_verification':row.rows[0].state,
      staging:true});
    });
    return rep.code(response.status).send(response.body);
  });

  // HoPay webhook signing/verification contract has NOT been provided.
  // A forged `settlement` callback must never activate a workspace or change payment state.
  app.post('/v1/billing/callback',async(_request,reply)=>{
    reply.header('Cache-Control','no-store');
    return reply.code(202).send({accepted:false,reason:'WEBHOOK_VERIFICATION_NOT_CONFIGURED'});
  });
}
