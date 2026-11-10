import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import type {PoolClient} from 'pg';
import {buildApp} from '../src/app.js';
import {parseHopaySettings} from '../src/hopay.js';
import type {AuthSettings} from '../src/creator-auth.js';

const oid='c189669e-a650-41cb-a2ba-7d56bb40dbbe';
const userId='c819009a-2f81-4c42-9253-bac062f65e72';
const token=randomBytes(32).toString('base64url');
const auth:AuthSettings={issuer:'https://issuer.example.com',clientId:'test',clientSecret:'test',
  redirectUri:'https://api.example.com/v1/auth/callback',webOrigin:'https://studio.example.com',
  key:randomBytes(32),secureCookies:true};
const hopay=parseHopaySettings({HOPAY_CLIENT_ID:'a189669e-a650-41cb-a2ba-7d56bb40dbbe',
  HOPAY_API_KEY:'HoPay-HP-abcdefghijklmnopqrst123',
  HOPAY_CALLBACK_URL:'https://api.example.com/v1/billing/callback',
  HOPAY_FINISH_URL:'https://studio.example.com/?payment=return'})!;
const url=`/v1/orgs/${oid}/billing/checkout`;
const idempotencyKey='a2326bb1-f01b-4f4a-8e71-9a1bbb3f13dc';
const cookie=`__Host-hoople_session=${token}`;

function fakeDb(role='owner') {
  const queries:string[]=[];
  const row={id:'b0000000-0000-4000-8000-000000000001',plan_id:'starter',amount_idr:29900,
    state:'creating',checkout_url:null as string|null};
  let created=false;
  const client={query:async (sql:string,params?:unknown[])=>{
    queries.push(sql);
    if(sql.includes('FROM creator_sessions'))return {rows:[{user_id:userId}]};
    if(sql.includes('FROM users WHERE id'))return {rows:[{id:userId,email:'creator@example.test',displayName:'Creator'}]};
    if(sql.includes('SELECT m.role FROM memberships'))return {rows:role?[{role}]:[]};
    if(sql.includes('SELECT id,plan_id,amount_idr,state,checkout_url') && sql.includes('idempotency_key'))return {rows:created?[row]:[]};
    if(sql.includes('INSERT INTO billing_checkout_requests')){
      if(created)return {rows:[]};created=true;return {rows:[{id:row.id}]};
    }
    if(sql.includes("SET state='redirect_ready'")){
      row.state='redirect_ready';row.checkout_url=String(params?.[1]);return {rows:[{id:row.id}]};
    }
    if(sql.includes("SET state='initiation_failed'")){row.state='initiation_failed';return {rows:[{id:row.id}]};}
    return {rows:[]};
  },release:()=>undefined} as unknown as PoolClient;
  return {queries,db:{query:async()=>({rows:[]}),connect:async()=>client},row};
}

test('checkout refuses unauthenticated, wrong origin, invalid payload, or insufficient role',async()=>{
  const fake=fakeDb('viewer');let calls=0;
  const app=buildApp(fake.db,{settings:auth},{settings:hopay,gateway:async()=>{calls++;return 'https://app.sandbox.midtrans.com/pay';}});
  const payload={planId:'starter',idempotencyKey};
  try{
    assert.equal((await app.inject({method:'POST',url,headers:{origin:auth.webOrigin},payload})).statusCode,401);
    assert.equal((await app.inject({method:'POST',url,headers:{cookie,origin:'https://evil.test'},payload})).statusCode,403);
    assert.equal((await app.inject({method:'POST',url,headers:{cookie,origin:auth.webOrigin},payload:{...payload,amount:1}})).statusCode,400);
    assert.equal((await app.inject({method:'POST',url,headers:{cookie,origin:auth.webOrigin},payload:{...payload,planId:'free'}})).statusCode,400);
    assert.equal((await app.inject({method:'POST',url,headers:{cookie,origin:auth.webOrigin},payload})).statusCode,403);
    assert.equal(calls,0);
  } finally{await app.close();}
});

test('checkout validates plan price on server and deduplicates the idempotency key',async()=>{
  const fake=fakeDb();let calls=0;
  const app=buildApp(fake.db,{settings:auth},{settings:hopay,gateway:async(request)=>{
    calls++;assert.equal(request.planId,'starter');return 'https://app.sandbox.midtrans.com/pay';}});
  try{
    const options={method:'POST' as const,url,headers:{cookie,origin:auth.webOrigin},payload:{planId:'starter',idempotencyKey}};
    const first=await app.inject(options);
    assert.equal(first.statusCode,201,first.body);
    assert.equal(first.json().state,'awaiting_verification');
    assert.equal(first.json().amount,29900);
    const duplicate=await app.inject(options);
    assert.equal(duplicate.statusCode,200,duplicate.body);
    assert.equal(duplicate.json().checkoutId,first.json().checkoutId);
    assert.equal(calls,1);
    const spoof=await app.inject({method:'POST',url:'/v1/billing/callback',
      payload:{transaction_status:'settlement',order_id:first.json().checkoutId}});
    assert.equal(spoof.statusCode,202);
    assert.equal(spoof.json().accepted,false);
    assert.equal(fake.row.state,'redirect_ready');
  } finally{await app.close();}
});

test('unexpected payment domain fails closed and does not provide a redirect',async()=>{
  const fake=fakeDb();
  const app=buildApp(fake.db,{settings:auth},{settings:hopay,gateway:async()=> 'https://attacker.invalid/checkout'});
  try{
    const response=await app.inject({method:'POST',url,headers:{cookie,origin:auth.webOrigin},
      payload:{planId:'starter',idempotencyKey}});
    assert.equal(response.statusCode,502,response.body);
    assert.ok(!response.body.includes('attacker.invalid'));
    assert.equal(fake.row.state,'initiation_failed');
  } finally{await app.close();}
});
