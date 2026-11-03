import type {FastifyInstance, FastifyReply, FastifyRequest} from 'fastify';
import type {PoolClient} from 'pg';
import {type AuthSettings, type Creator, type DbPool, setOrganizationContext, withCreator} from './creator-auth.js';
import {creatorCookieNames} from './creator-routes.js';

type Role = 'owner'|'admin'|'editor'|'analyst'|'viewer'|'billing';
type Result = {status:number;data:unknown};
const ok = (data:unknown,status=200):Result => ({status,data});
const bad = (status:number,error:string):Result => ({status,data:{error}});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slug = /^[a-z0-9][a-z0-9-]{1,62}$/;
const mutableRoles:Role[]=['owner','admin','editor'];
const kinds=['checkin','qr','photo','quiz'];
const types=['passport','hunt','quiz'];
const text = (x:unknown,max:number) => typeof x==='string' && x.trim().length>0 && x.trim().length<=max ? x.trim() : null;
const record = (x:unknown): x is Record<string,unknown> => !!x && typeof x==='object' && !Array.isArray(x);
const positiveRevision=(x:unknown)=>Number.isInteger(x)&&Number(x)>0;

// Draft JSON must not contain keys that belong to server-held verification.
// Base64 media belongs in a future private upload service, not PostgreSQL.
function safeJson(x:unknown, depth=0):boolean {
  if (depth>12) return false;
  if (x===null || typeof x==='boolean' || typeof x==='number') return true;
  if (typeof x==='string') return x.length<=8000 && !/^data:/i.test(x);
  if (Array.isArray(x)) return x.length<=200 && x.every(v=>safeJson(v,depth+1));
  if (!record(x) || Object.keys(x).length>100) return false;
  return Object.entries(x).every(([k,v])=>
    !/^(correctIndex|answer|secret|code|privateValidation|private_validation)$/i.test(k)
    && safeJson(v,depth+1));
}
function settings(x:unknown):Record<string,unknown>|null {
  if (!record(x) || !safeJson(x) || JSON.stringify(x).length>64_000) return null;
  return x;
}
function missionFields(body:unknown) {
  if (!record(body)) return null;
  const title=text(body.title,160);
  const kind=body.kind;
  const points=body.points;
  const publicConfig=settings(body.publicConfig??{});
  const privateValidation=record(body.privateValidation)?body.privateValidation:null;
  if (!title || !kinds.includes(String(kind)) || !Number.isInteger(points) || Number(points)<0 || Number(points)>100_000
    || !publicConfig || !privateValidation || JSON.stringify(privateValidation).length>8000) return null;
  if (kind==='quiz') {
    if (!text(publicConfig.question,1000) || !Array.isArray(publicConfig.options)
      || publicConfig.options.length!==4 || !publicConfig.options.every(o=>text(o,500))
      || !Number.isInteger(privateValidation.correctIndex)
      || Number(privateValidation.correctIndex)<0 || Number(privateValidation.correctIndex)>3) return null;
  } else if (kind==='qr') {
    if (!text(privateValidation.code,128)) return null;
  }
  return {title,kind,points:Number(points),publicConfig,privateValidation};
}
async function audit(client:PoolClient,orgId:string,userId:string,action:string,type:string,id:string) {
  await client.query(`INSERT INTO audit_logs(organization_id,actor_user_id,action,target_type,target_id)
    VALUES ($1,$2,$3,$4,$5)`,[orgId,userId,action,type,id]);
}
async function draftExperience(client:PoolClient,orgId:string,id:string) {
  const result=await client.query<{id:string;revision:number;lifecycle_status:string}>(`SELECT id,revision,lifecycle_status
    FROM experiences WHERE organization_id=$1 AND id=$2 FOR UPDATE`,[orgId,id]);
  return result.rows[0]??null;
}
function dbProblem(error:unknown):Result {
  const code=(error as {code?:string})?.code;
  if (code==='23505') return bad(409,'DUPLICATE_RESOURCE');
  if (code==='23503') return bad(409,'RESOURCE_IN_USE');
  if (code==='23514'||code==='22P02') return bad(400,'INVALID_RESOURCE');
  return bad(503,'DATABASE_UNAVAILABLE');
}

export function registerCreatorEngineRoutes(app:FastifyInstance,pool?:DbPool,auth?:AuthSettings) {
  const cookie=creatorCookieNames(auth?.secureCookies??true).session;
  async function guarded(request:FastifyRequest,reply:FastifyReply,
    edit:boolean,work:(client:PoolClient,creator:Creator,orgId:string,role:Role)=>Promise<Result>) {
    if (!pool) return reply.code(503).send({error:'DATABASE_UNAVAILABLE'});
    if (edit && (!auth || request.headers.origin!==auth.webOrigin)) return reply.code(403).send({error:'FORBIDDEN_ORIGIN'});
    const {oid}=request.params as {oid:string};
    if (!uuid.test(oid)) return reply.code(400).send({error:'INVALID_ORGANIZATION_ID'});
    try {
      const outcome=await withCreator(pool,request.cookies[cookie],async ({client,creator})=>{
        await setOrganizationContext(client,oid);
        const member=await client.query<{role:Role}>(`SELECT m.role FROM memberships m
          JOIN organizations o ON o.id=m.organization_id
          WHERE m.organization_id=$1 AND m.user_id=$2 AND o.archived_at IS NULL`,[oid,creator.id]);
        const role=member.rows[0]?.role;
        if (!role) return bad(404,'WORKSPACE_NOT_FOUND');
        if (edit && !mutableRoles.includes(role)) return bad(403,'INSUFFICIENT_ROLE');
        return work(client,creator,oid,role);
      });
      reply.header('Cache-Control','no-store');
      if (!outcome) return reply.code(401).send({error:'UNAUTHENTICATED'});
      return reply.code(outcome.status).send(outcome.data);
    } catch(error) {
      const outcome=dbProblem(error);
      return reply.code(outcome.status).send(outcome.data);
    }
  }

  app.get('/v1/orgs/:oid/brand-kits',async (req,rep)=>guarded(req,rep,false,async(client,_u,oid)=>{
    const items=await client.query(`SELECT id,name,primary_color AS "primaryColor",settings,revision
      FROM brand_kits WHERE organization_id=$1 ORDER BY created_at DESC`,[oid]);
    return ok({items:items.rows});
  }));
  app.post('/v1/orgs/:oid/brand-kits',async (req,rep)=>guarded(req,rep,true,async(client,u,oid)=>{
    const body=req.body as Record<string,unknown>;
    const name=text(body?.name,100),primaryColor=body?.primaryColor??'#981CEB',config=settings(body?.settings??{});
    if (!name || typeof primaryColor!=='string' || !/^#[a-f\d]{6}$/i.test(primaryColor) || !config) return bad(400,'INVALID_BRAND_KIT');
    const rows=await client.query(`INSERT INTO brand_kits(organization_id,name,primary_color,settings)
      VALUES($1,$2,$3,$4::jsonb) RETURNING id,name,primary_color AS "primaryColor",settings,revision`,[oid,name,primaryColor,JSON.stringify(config)]);
    await audit(client,oid,u.id,'brand_kit.created','brand_kit',rows.rows[0].id);
    return ok(rows.rows[0],201);
  }));
  app.get('/v1/orgs/:oid/brand-kits/:bid',async(req,rep)=>guarded(req,rep,false,async(client,_u,oid)=>{
    const {bid}=req.params as {bid:string};
    if (!uuid.test(bid)) return bad(400,'INVALID_ID');
    const rows=await client.query(`SELECT id,name,primary_color AS "primaryColor",settings,revision
      FROM brand_kits WHERE id=$1 AND organization_id=$2`,[bid,oid]);
    return rows.rows[0]?ok(rows.rows[0]):bad(404,'BRAND_KIT_NOT_FOUND');
  }));
  app.patch('/v1/orgs/:oid/brand-kits/:bid',async(req,rep)=>guarded(req,rep,true,async(client,u,oid)=>{
    const {bid}=req.params as {bid:string},body=req.body as Record<string,unknown>;
    if (!uuid.test(bid) || !positiveRevision(body?.expectedRevision)) return bad(400,'INVALID_REVISION_OR_ID');
    const name=body.name===undefined?null:text(body.name,100);
    const color=body.primaryColor===undefined?null:body.primaryColor;
    const config=body.settings===undefined?null:settings(body.settings);
    if ((body.name!==undefined&&!name) || (color!==null&&(typeof color!=='string'||!/^#[a-f\d]{6}$/i.test(color)))
      || (body.settings!==undefined&&!config)) return bad(400,'INVALID_BRAND_KIT');
    const rows=await client.query(`UPDATE brand_kits SET name=COALESCE($3,name),primary_color=COALESCE($4,primary_color),
      settings=COALESCE($5::jsonb,settings),revision=revision+1,updated_at=now()
      WHERE organization_id=$1 AND id=$2 AND revision=$6 RETURNING id,name,revision`,
      [oid,bid,name,color,config?JSON.stringify(config):null,body.expectedRevision]);
    if (!rows.rows[0]) return bad(409,'REVISION_CONFLICT_OR_NOT_FOUND');
    await audit(client,oid,u.id,'brand_kit.updated','brand_kit',bid);
    return ok(rows.rows[0]);
  }));
  app.delete('/v1/orgs/:oid/brand-kits/:bid',async(req,rep)=>guarded(req,rep,true,async(client,u,oid)=>{
    const {bid}=req.params as {bid:string};
    if (!uuid.test(bid)) return bad(400,'INVALID_ID');
    const rows=await client.query('DELETE FROM brand_kits WHERE organization_id=$1 AND id=$2 RETURNING id',[oid,bid]);
    if (!rows.rows[0]) return bad(404,'BRAND_KIT_NOT_FOUND');
    await audit(client,oid,u.id,'brand_kit.deleted','brand_kit',bid);
    return ok({deleted:true});
  }));

  app.get('/v1/orgs/:oid/experiences',async(req,rep)=>guarded(req,rep,false,async(client,_u,oid)=>{
    const items=await client.query(`SELECT e.id,e.title,e.slug,e.experience_type AS "type",
      e.lifecycle_status AS "status",e.revision,e.import_key AS "importKey",
      (SELECT count(*)::integer FROM missions m WHERE m.experience_id=e.id) AS "missionCount"
      FROM experiences e WHERE e.organization_id=$1 ORDER BY e.created_at DESC LIMIT 100`,[oid]);
    return ok({items:items.rows});
  }));
  app.post('/v1/orgs/:oid/experiences',async(req,rep)=>guarded(req,rep,true,async(client,u,oid)=>{
    const body=req.body as Record<string,unknown>;
    const title=text(body?.title,160),type=body?.type,slugValue=body?.slug;
    const config=settings(body?.settings??{});
    const brandKitId=body?.brandKitId??null;
    if (!title || !types.includes(String(type)) || typeof slugValue!=='string' || !slug.test(slugValue)
      || !config || (brandKitId!==null&&(typeof brandKitId!=='string'||!uuid.test(brandKitId)))) return bad(400,'INVALID_EXPERIENCE');
    const row=await client.query(`INSERT INTO experiences(organization_id,title,slug,experience_type,brand_kit_id,settings)
      VALUES($1,$2,$3,$4,$5,$6::jsonb) RETURNING id,title,slug,revision`,
      [oid,title,slugValue,type,brandKitId,JSON.stringify(config)]);
    await audit(client,oid,u.id,'experience.created','experience',row.rows[0].id);
    return ok(row.rows[0],201);
  }));
  app.get('/v1/orgs/:oid/experiences/:eid',async(req,rep)=>guarded(req,rep,false,async(client,_u,oid,role)=>{
    const {eid}=req.params as {eid:string};
    if (!uuid.test(eid)) return bad(400,'INVALID_ID');
    const exp=await client.query(`SELECT id,title,slug,experience_type AS "type",
      lifecycle_status AS "status",settings,revision,import_key AS "importKey",brand_kit_id AS "brandKitId"
      FROM experiences WHERE organization_id=$1 AND id=$2`,[oid,eid]);
    if (!exp.rows[0]) return bad(404,'EXPERIENCE_NOT_FOUND');
    const missions=await client.query(`SELECT id,position,kind,title,description,points,
      public_config AS "publicConfig",private_validation AS "privateValidation",revision
      FROM missions WHERE organization_id=$1 AND experience_id=$2 ORDER BY position`,[oid,eid]);
    // Private data is returned ONLY to authenticated organizers with org membership.
    return ok({...exp.rows[0],missions:mutableRoles.includes(role)?missions.rows:
      missions.rows.map(({privateValidation,...safe})=>safe)});
  }));
  app.patch('/v1/orgs/:oid/experiences/:eid',async(req,rep)=>guarded(req,rep,true,async(client,u,oid)=>{
    const {eid}=req.params as {eid:string},body=req.body as Record<string,unknown>;
    if (!uuid.test(eid) || !positiveRevision(body?.expectedRevision)) return bad(400,'INVALID_REVISION_OR_ID');
    const title=body.title===undefined?null:text(body.title,160),slugValue=body.slug??null;
    const config=body.settings===undefined?null:settings(body.settings);
    if ((body.title!==undefined&&!title) || (slugValue!==null&&(typeof slugValue!=='string'||!slug.test(slugValue)))
      || (body.settings!==undefined&&!config)) return bad(400,'INVALID_EXPERIENCE');
    const rows=await client.query(`UPDATE experiences SET title=COALESCE($3,title),slug=COALESCE($4,slug),
      settings=COALESCE($5::jsonb,settings),revision=revision+1,updated_at=now()
      WHERE organization_id=$1 AND id=$2 AND lifecycle_status='draft' AND revision=$6
      RETURNING id,title,slug,revision`,[oid,eid,title,slugValue,config?JSON.stringify(config):null,body.expectedRevision]);
    if (!rows.rows[0]) return bad(409,'REVISION_CONFLICT_OR_NOT_DRAFT');
    await audit(client,oid,u.id,'experience.updated','experience',eid);
    return ok(rows.rows[0]);
  }));
  app.delete('/v1/orgs/:oid/experiences/:eid',async(req,rep)=>guarded(req,rep,true,async(client,u,oid)=>{
    const {eid}=req.params as {eid:string};
    if (!uuid.test(eid)) return bad(400,'INVALID_ID');
    const rows=await client.query(`DELETE FROM experiences WHERE organization_id=$1 AND id=$2
      AND lifecycle_status='draft' RETURNING id`,[oid,eid]);
    if (!rows.rows[0]) return bad(409,'NOT_FOUND_OR_PUBLISHED');
    await audit(client,oid,u.id,'experience.deleted','experience',eid);
    return ok({deleted:true});
  }));

  app.get('/v1/orgs/:oid/experiences/:eid/missions',async(req,rep)=>guarded(req,rep,false,async(client,_u,oid,role)=>{
    const {eid}=req.params as {eid:string};
    if (!uuid.test(eid)) return bad(400,'INVALID_ID');
    const exists=await client.query('SELECT id FROM experiences WHERE id=$1 AND organization_id=$2',[eid,oid]);
    if (!exists.rows[0]) return bad(404,'EXPERIENCE_NOT_FOUND');
    const items=await client.query(`SELECT id,position,kind,title,description,points,
      public_config AS "publicConfig",private_validation AS "privateValidation",revision
      FROM missions WHERE experience_id=$1 AND organization_id=$2 ORDER BY position`,[eid,oid]);
    return ok({items:mutableRoles.includes(role)?items.rows:items.rows.map(({privateValidation,...safe})=>safe)});
  }));
  app.post('/v1/orgs/:oid/experiences/:eid/missions',async(req,rep)=>guarded(req,rep,true,async(client,u,oid)=>{
    const {eid}=req.params as {eid:string};
    if (!uuid.test(eid)) return bad(400,'INVALID_ID');
    const fields=missionFields(req.body);
    if (!fields) return bad(400,'INVALID_MISSION');
    const exp=await draftExperience(client,oid,eid);
    if (!exp || exp.lifecycle_status!=='draft') return bad(409,'NOT_FOUND_OR_NOT_DRAFT');
    const pos=await client.query<{position:number}>(`SELECT COALESCE(MAX(position),-1)+1 AS position
      FROM missions WHERE experience_id=$1`,[eid]);
    const m=await client.query(`INSERT INTO missions(organization_id,experience_id,position,kind,title,description,points,public_config,private_validation)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb) RETURNING id,position,revision`,
      [oid,eid,pos.rows[0].position,fields.kind,fields.title,'',fields.points,JSON.stringify(fields.publicConfig),JSON.stringify(fields.privateValidation)]);
    await client.query('UPDATE experiences SET revision=revision+1,updated_at=now() WHERE id=$1',[eid]);
    await audit(client,oid,u.id,'mission.created','mission',m.rows[0].id);
    return ok(m.rows[0],201);
  }));
  app.patch('/v1/orgs/:oid/experiences/:eid/missions/:mid',async(req,rep)=>guarded(req,rep,true,async(client,u,oid)=>{
    const {eid,mid}=req.params as {eid:string;mid:string},body=req.body as Record<string,unknown>;
    if (!uuid.test(eid)||!uuid.test(mid)||!positiveRevision(body?.expectedRevision)) return bad(400,'INVALID_REVISION_OR_ID');
    const exp=await draftExperience(client,oid,eid);
    if (!exp||exp.lifecycle_status!=='draft') return bad(409,'NOT_FOUND_OR_NOT_DRAFT');
    const fields=missionFields(body);
    if (!fields) return bad(400,'INVALID_MISSION');
    const m=await client.query(`UPDATE missions SET kind=$4,title=$5,points=$6,public_config=$7::jsonb,
      private_validation=$8::jsonb,revision=revision+1,updated_at=now()
      WHERE organization_id=$1 AND experience_id=$2 AND id=$3 AND revision=$9
      RETURNING id,revision`,[oid,eid,mid,fields.kind,fields.title,fields.points,
        JSON.stringify(fields.publicConfig),JSON.stringify(fields.privateValidation),body.expectedRevision]);
    if (!m.rows[0]) return bad(409,'REVISION_CONFLICT_OR_NOT_FOUND');
    await client.query('UPDATE experiences SET revision=revision+1,updated_at=now() WHERE id=$1',[eid]);
    await audit(client,oid,u.id,'mission.updated','mission',mid);
    return ok(m.rows[0]);
  }));
  app.delete('/v1/orgs/:oid/experiences/:eid/missions/:mid',async(req,rep)=>guarded(req,rep,true,async(client,u,oid)=>{
    const {eid,mid}=req.params as {eid:string;mid:string};
    if (!uuid.test(eid)||!uuid.test(mid)) return bad(400,'INVALID_ID');
    const exp=await draftExperience(client,oid,eid);
    if (!exp||exp.lifecycle_status!=='draft') return bad(409,'NOT_FOUND_OR_NOT_DRAFT');
    const deleted=await client.query('DELETE FROM missions WHERE organization_id=$1 AND experience_id=$2 AND id=$3 RETURNING id',[oid,eid,mid]);
    if (!deleted.rows[0]) return bad(404,'MISSION_NOT_FOUND');
    await client.query('UPDATE experiences SET revision=revision+1,updated_at=now() WHERE id=$1',[eid]);
    await audit(client,oid,u.id,'mission.deleted','mission',mid);
    return ok({deleted:true});
  }));
  app.put('/v1/orgs/:oid/experiences/:eid/missions/order',async(req,rep)=>guarded(req,rep,true,async(client,u,oid)=>{
    const {eid}=req.params as {eid:string},body=req.body as {missionIds?:unknown;expectedRevision?:unknown};
    if (!uuid.test(eid)||!positiveRevision(body?.expectedRevision)||!Array.isArray(body?.missionIds)
      || body.missionIds.length>100 || !body.missionIds.every(id=>typeof id==='string'&&uuid.test(id))
      || new Set(body.missionIds).size!==body.missionIds.length) return bad(400,'INVALID_MISSION_ORDER');
    const exp=await draftExperience(client,oid,eid);
    if (!exp||exp.lifecycle_status!=='draft') return bad(409,'NOT_FOUND_OR_NOT_DRAFT');
    if (exp.revision!==body.expectedRevision) return bad(409,'REVISION_CONFLICT');
    const current=await client.query<{id:string}>('SELECT id FROM missions WHERE organization_id=$1 AND experience_id=$2',[oid,eid]);
    if (current.rows.length!==body.missionIds.length
      || current.rows.some(row=>!(body.missionIds as string[]).includes(row.id))) return bad(409,'MISSION_LIST_CHANGED');
    for (let i=0;i<body.missionIds.length;i++) {
      await client.query('UPDATE missions SET position=$1,updated_at=now() WHERE id=$2 AND organization_id=$3',[i,body.missionIds[i],oid]);
    }
    const updated=await client.query('UPDATE experiences SET revision=revision+1 WHERE id=$1 RETURNING revision',[eid]);
    await audit(client,oid,u.id,'missions.reordered','experience',eid);
    return ok({missionIds:body.missionIds,revision:updated.rows[0].revision});
  }));


  // Atomic cloud editor snapshot. Every save is explicit, scoped to the
  // authenticated workspace and guarded by a revision. No partial mission
  // writes are committed if a later insert or audit step fails.
  app.put('/v1/orgs/:oid/experiences/:eid/draft',async(req,rep)=>guarded(req,rep,true,async(client,u,oid)=>{
    const {eid}=req.params as {eid:string};
    const body=req.body as {draft?:unknown;expectedRevision?:unknown}|undefined;
    const draft=body?.draft;
    if(!uuid.test(eid)||!positiveRevision(body?.expectedRevision)
      || !record(draft)||!text(draft.name,160)||!types.includes(String(draft.type))
      || !Array.isArray(draft.missions)||draft.missions.length>60) return bad(400,'INVALID_CLOUD_DRAFT');
    const validated:{kind:string;title:string;description:string;points:number;publicConfig:Record<string,unknown>;privateValidation:Record<string,unknown>}[]=[];
    for(const m of draft.missions) {
      if(!record(m))return bad(400,'INVALID_LOCAL_MISSION');
      const kind=draft.type==='quiz'?'quiz':String(m.kind);
      const fields=missionFields({kind,title:m.name,points:m.points,
        publicConfig:kind==='quiz'?{question:m.question,options:m.options}:{},
        privateValidation:kind==='quiz'?{correctIndex:m.correctIndex}:kind==='qr'?{code:m.code}:{}});
      if(!fields || typeof m.description!=='string'||m.description.length>1000) return bad(400,'INVALID_LOCAL_MISSION');
      validated.push({kind,title:fields.title,points:fields.points,publicConfig:fields.publicConfig,privateValidation:fields.privateValidation,description:m.description});
    }
    const safeDraft:Record<string,unknown>={};let mediaSkipped=false;
    for(const key of ['name','subtitle','type','palette','welcome','buttonText','blocks','reward','publication','createdAt']){
      if(draft[key]===undefined)continue;
      if(key==='reward'&&record(draft[key])){
        const reward={...draft[key]};
        for(const k of ['image','imageUrl'])if(typeof reward[k]==='string'&&/^data:/i.test(reward[k] as string)){
          reward[k]='';mediaSkipped=true;
        }
        safeDraft[key]=reward;
      }else safeDraft[key]=draft[key];
    }
    const config=settings({studio:safeDraft});
    if(!config)return bad(400,'INVALID_CLOUD_DRAFT_SETTINGS');
    let brandConfig:Record<string,unknown>|null=null;
    if(record(draft.brand)){
      const brand={...draft.brand};
      for(const k of ['logo','cover','coverMobile','coverDesktop','logoUrl','coverUrl','coverMobileUrl','coverDesktopUrl']){
        if(typeof brand[k]==='string'&&/^data:/i.test(brand[k] as string)){brand[k]='';mediaSkipped=true;}
      }
      brandConfig=settings(brand);
      if(!brandConfig)return bad(400,'INVALID_BRAND');
    }
    const current=await client.query<{id:string;revision:number;lifecycle_status:string;experience_type:string;brand_kit_id:string|null}>(
      'SELECT id,revision,lifecycle_status,experience_type,brand_kit_id FROM experiences WHERE organization_id=$1 AND id=$2 FOR UPDATE',[oid,eid]);
    const exp=current.rows[0];
    if(!exp||exp.lifecycle_status!=='draft'||exp.experience_type!==draft.type)return bad(409,'NOT_FOUND_OR_NOT_DRAFT');
    if(exp.revision!==body.expectedRevision)return bad(409,'REVISION_CONFLICT');
    let brandKitId=exp.brand_kit_id;
    if(brandConfig){
      const accent=brandConfig.accent;
      const color=typeof accent==='string'&&/^#[a-f\d]{6}$/i.test(accent)?accent:'#981CEB';
      const name=text(brandConfig.name,100)??text(draft.name,100);
      if(brandKitId){
        // A reusable kit may be shared across multiple experiences. Clone it
        // rather than changing another event when this editor draft is saved.
        const shared=await client.query('SELECT id FROM experiences WHERE organization_id=$1 AND brand_kit_id=$2 AND id<>$3 LIMIT 1',[oid,brandKitId,eid]);
        if(shared.rows[0])brandKitId=null;
      }
      if(brandKitId){
        const updated=await client.query('UPDATE brand_kits SET name=$3,primary_color=$4,settings=$5::jsonb,revision=revision+1,updated_at=now() WHERE organization_id=$1 AND id=$2 RETURNING id',
          [oid,brandKitId,name,color,JSON.stringify(brandConfig)]);
        if(!updated.rows[0])return bad(409,'BRAND_KIT_CHANGED');
      }else{
        const inserted=await client.query<{id:string}>('INSERT INTO brand_kits(organization_id,name,primary_color,settings) VALUES($1,$2,$3,$4::jsonb) RETURNING id',
          [oid,name,color,JSON.stringify(brandConfig)]);
        brandKitId=inserted.rows[0].id;
      }
    }
    await client.query('DELETE FROM missions WHERE organization_id=$1 AND experience_id=$2',[oid,eid]);
    for(let i=0;i<validated.length;i++){
      const m=validated[i];
      await client.query('INSERT INTO missions(organization_id,experience_id,position,kind,title,description,points,public_config,private_validation) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb)',
        [oid,eid,i,m.kind,m.title,m.description,m.points,JSON.stringify(m.publicConfig),JSON.stringify(m.privateValidation)]);
    }
    const changed=await client.query<{revision:number}>('UPDATE experiences SET title=$3,settings=$4::jsonb,brand_kit_id=$5,revision=revision+1,updated_at=now() WHERE organization_id=$1 AND id=$2 RETURNING revision',
      [oid,eid,draft.name,JSON.stringify(config),brandKitId]);
    await audit(client,oid,u.id,'experience.draft_saved','experience',eid);
    return ok({id:eid,revision:changed.rows[0].revision,missionCount:validated.length,mediaSkipped});
  }));

  // One-way, idempotent import of *legacy local browser drafts*. Existing cloud drafts
  // are never overwritten; no localStorage deletion or public event publication.
  app.post('/v1/orgs/:oid/experiences/import',async(req,rep)=>guarded(req,rep,true,async(client,u,oid)=>{
    const body=req.body as {draft?:unknown};
    const draft=body?.draft;
    if (!record(draft) || !text(draft.id,96) || !/^[a-z0-9_-]{3,96}$/i.test(String(draft.id))
      || !text(draft.name,160) || !types.includes(String(draft.type))
      || !Array.isArray(draft.missions) || draft.missions.length>60) return bad(400,'INVALID_LOCAL_DRAFT');
    const existing=await client.query<{id:string}>('SELECT id FROM experiences WHERE organization_id=$1 AND import_key=$2',[oid,draft.id]);
    if (existing.rows[0]) return ok({id:existing.rows[0].id,alreadyImported:true});
    const safeDraft:Record<string,unknown>={};
    let mediaSkipped=false;
    for (const key of ['name','subtitle','type','palette','welcome','buttonText','blocks','reward','publication','createdAt']) {
      const value=draft[key];
      if (value===undefined) continue;
      if (key==='reward' && record(value)) {
        const reward={...value};
        for (const media of ['image','imageUrl']) if (typeof reward[media]==='string' && /^data:/i.test(reward[media] as string)) {
          reward[media]=''; mediaSkipped=true;
        }
        safeDraft[key]=reward;
      } else safeDraft[key]=value;
    }
    const safeSettings=settings({studio:safeDraft});
    if (!safeSettings) return bad(400,'INVALID_LOCAL_DRAFT_SETTINGS');
    for (const mission of draft.missions) {
      if (!record(mission)) return bad(400,'INVALID_LOCAL_MISSION');
      const kind=draft.type==='quiz'?'quiz':String(mission.kind);
      const publicConfig=kind==='quiz'?{question:mission.question,options:mission.options}:{};
      const privateValidation=kind==='quiz'?{correctIndex:mission.correctIndex}
        :kind==='qr'?{code:mission.code}:{};
      if (!missionFields({kind,title:mission.name,points:mission.points,publicConfig,privateValidation})) {
        return bad(400,'INVALID_LOCAL_MISSION');
      }
    }
    let brandKitId:null|string=null;
    if (record(draft.brand)) {
      const brand={...draft.brand};
      for (const media of ['logo','cover','coverMobile','coverDesktop','logoUrl','coverUrl','coverMobileUrl','coverDesktopUrl']) {
        if (typeof brand[media]==='string' && /^data:/i.test(brand[media] as string)) {
          brand[media]='';mediaSkipped=true;
        }
      }
      const brandSettings=settings(brand);
      if (!brandSettings) return bad(400,'INVALID_BRAND');
      const kit=await client.query<{id:string}>(`INSERT INTO brand_kits(organization_id,name,primary_color,settings)
        VALUES($1,$2,$3,$4::jsonb) RETURNING id`,
        [oid,text(brand.name,100)??text(draft.name,100),typeof brand.accent==='string' && /^#[a-f\d]{6}$/i.test(brand.accent)?brand.accent:'#981CEB',JSON.stringify(brandSettings)]);
      brandKitId=kit.rows[0].id;
    }
    const label=String(draft.name);
    const preferredSlug=typeof draft.slug==='string' && slug.test(draft.slug)?draft.slug:'experience';
    const uniqueSlug=`${preferredSlug.slice(0,40)}-${Math.random().toString(36).slice(2,10)}`;
    const exp=await client.query<{id:string}>(`INSERT INTO experiences(
      organization_id,title,slug,experience_type,brand_kit_id,import_key,settings)
      VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING id`,
      [oid,label,uniqueSlug,draft.type,brandKitId,draft.id,JSON.stringify(safeSettings)]);
    for (let i=0;i<draft.missions.length;i++) {
      const mission=draft.missions[i] as Record<string,unknown>;
      const kind=draft.type==='quiz'?'quiz':String(mission.kind);
      await client.query(`INSERT INTO missions(organization_id,experience_id,position,kind,title,description,points,public_config,private_validation)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb)`,
        [oid,exp.rows[0].id,i,kind,mission.name,
          typeof mission.description==='string'?mission.description:'',
          mission.points,JSON.stringify(kind==='quiz'?{question:mission.question,options:mission.options}:{}),
          JSON.stringify(kind==='quiz'?{correctIndex:mission.correctIndex}:kind==='qr'?{code:mission.code}:{})]);
    }
    await audit(client,oid,u.id,'experience.imported','experience',exp.rows[0].id);
    return ok({id:exp.rows[0].id,importedMissions:draft.missions.length,mediaSkipped},201);
  }));
}
