import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import type {PoolClient} from 'pg';
import {buildApp} from '../src/app.js';
import type {AuthSettings} from '../src/creator-auth.js';

const token=randomBytes(32).toString('base64url');
const cookie=`__Host-hoople_session=${token}`;
const oid='c189669e-a650-41cb-a2ba-7d56bb40dbbe';
const eid='e189669e-a650-41cb-a2ba-7d56bb40dbbe';
const uid='c819009a-2f81-4c42-9253-bac062f65e72';
const settings:AuthSettings={issuer:'https://issuer.example.com',clientId:'test',clientSecret:'test',
  redirectUri:'https://api.example.com/v1/auth/callback',webOrigin:'https://studio.example.com',
  key:randomBytes(32),secureCookies:true};
function fakeDb(role:'owner'|'viewer'|null='owner') {
  const queries:string[]=[];
  const client={query:async(sql:string)=>{
    queries.push(sql);
    if(sql.includes('FROM creator_sessions'))return {rows:[{user_id:uid}]};
    if(sql.includes('FROM users WHERE id'))return {rows:[{id:uid,email:'creator@example.test'}]};
    if(sql.includes('SELECT m.role FROM memberships'))return {rows:role?[{role}]:[]};
    if(sql.includes('FOR UPDATE'))return {rows:[{id:eid,revision:1,lifecycle_status:'draft'}]};
    return {rows:[]};
  },release:()=>undefined} as unknown as PoolClient;
  return {queries,db:{query:async()=>({rows:[]}),connect:async()=>client}};
}

test('creator draft endpoints fail closed on missing session and origin',async()=>{
  const fake=fakeDb();const app=buildApp(fake.db,{settings});
  try {
    const missing=await app.inject({method:'GET',url:`/v1/orgs/${oid}/experiences`});
    assert.equal(missing.statusCode,401);
    const wrong=await app.inject({method:'POST',url:`/v1/orgs/${oid}/brand-kits`,
      headers:{cookie,origin:'https://untrusted.example.test'},payload:{name:'Nope'}});
    assert.equal(wrong.statusCode,403);
    const invalid=await app.inject({method:'GET',url:'/v1/orgs/nope/experiences',headers:{cookie}});
    assert.equal(invalid.statusCode,400);
    assert.ok(!fake.queries.some(sql=>sql.includes('INSERT INTO brand_kits')));
  } finally {await app.close();}
});

test('read-only member cannot mutate brand kits or missions',async()=>{
  const fake=fakeDb('viewer');const app=buildApp(fake.db,{settings});
  try {
    const kit=await app.inject({method:'POST',url:`/v1/orgs/${oid}/brand-kits`,
      headers:{cookie,origin:settings.webOrigin},payload:{name:'Forbidden'}});
    const mission=await app.inject({method:'DELETE',url:`/v1/orgs/${oid}/experiences/${eid}/missions/${eid}`,
      headers:{cookie,origin:settings.webOrigin}});
    assert.equal(kit.statusCode,403);
    assert.equal(mission.statusCode,403);
    assert.ok(!fake.queries.some(sql=>sql.includes('DELETE FROM missions')));
  } finally {await app.close();}
});

test('public mission config rejects quiz answer secrets before any insert',async()=>{
  const fake=fakeDb();const app=buildApp(fake.db,{settings});
  try {
    const response=await app.inject({method:'POST',url:`/v1/orgs/${oid}/experiences/${eid}/missions`,
      headers:{cookie,origin:settings.webOrigin},payload:{kind:'quiz',title:'Question',points:10,
        publicConfig:{question:'What?',options:['A','B','C','D'],correctIndex:1},
        privateValidation:{correctIndex:1}}});
    assert.equal(response.statusCode,400,response.body);
    assert.ok(!fake.queries.some(sql=>sql.includes('INSERT INTO missions')));
  } finally {await app.close();}
});

test('legacy cloud import validates browser draft before writes',async()=>{
  const fake=fakeDb();const app=buildApp(fake.db,{settings});
  try {
    const response=await app.inject({method:'POST',url:`/v1/orgs/${oid}/experiences/import`,
      headers:{cookie,origin:settings.webOrigin},payload:{draft:{id:'abc',name:'Draft',type:'hunt',
        missions:[{kind:'qr',name:'Missing code',points:5}]}}});
    assert.equal(response.statusCode,400,response.body);
    assert.ok(!fake.queries.some(sql=>sql.includes('INSERT INTO experiences')));
  } finally {await app.close();}
});
