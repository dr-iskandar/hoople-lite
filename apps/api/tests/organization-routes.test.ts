import test from 'node:test';
import assert from 'node:assert/strict';
import type { PoolClient } from 'pg';
import { buildApp } from '../src/app.js';
import { randomBytes } from 'node:crypto';
import type { AuthSettings } from '../src/creator-auth.js';

const token = randomBytes(32).toString('base64url');
const oid = 'c189669e-a650-41cb-a2ba-7d56bb40dbbe';
const userId = 'c819009a-2f81-4c42-9253-bac062f65e72';
const settings: AuthSettings = {
  issuer:'https://issuer.example.com',clientId:'client',clientSecret:'secret',
  redirectUri:'https://api.example.com/v1/auth/callback',webOrigin:'https://studio.example.com',
  key:randomBytes(32),secureCookies:true,
};
function fakeDb(role:'owner'|'viewer'|null = 'owner') {
  const commands:string[]=[];
  const client = {
    query:async (sql:string) => {
      commands.push(sql);
      if (sql.includes('FROM creator_sessions')) return {rows:[{user_id:userId}]};
      if (sql.includes('FROM users WHERE id')) return {rows:[{id:userId,email:'creator@example.com',displayName:'Creator'}]};
      if (sql.includes('SELECT m.role FROM memberships')) return {rows:role?[{role}]:[]};
      if (sql.includes('SELECT o.id,o.slug,o.name,m.role')) return {rows:[]};
      if (sql.includes('SELECT active_organization_id')) return {rows:[]};
      if (sql.includes('UPDATE organizations')) return {rows:[{id:oid,slug:'demo-org',name:'Demo Org'}]};
      return {rows:[]};
    },
    release:()=>undefined,
  } as unknown as PoolClient;
  return {commands,db:{query:async()=>({rows:[{value:1}]}),connect:async()=>client}};
}
const cookie = `__Host-hoople_session=${token}`;

test('workspace endpoints require a session',async()=>{
  const fake=fakeDb();
  const app=buildApp(fake.db,{settings});
  try {
    const response=await app.inject({method:'GET',url:'/v1/orgs'});
    assert.equal(response.statusCode,401);
    assert.equal(fake.commands.length,0);
  } finally { await app.close(); }
});

test('workspace mutations require exact browser origin',async()=>{
  const fake=fakeDb();
  const app=buildApp(fake.db,{settings});
  try {
    for(const origin of [undefined,'https://evil.example.com']) {
      const response=await app.inject({method:'PUT',url:'/v1/workspaces/active',
        headers:{cookie,...(origin?{origin}:{})},payload:{organizationId:oid}});
      assert.equal(response.statusCode,403);
    }
    assert.equal(fake.commands.length,0);
  } finally { await app.close(); }
});

test('workspace switching is denied for non-member, owner can switch',async()=>{
  for(const role of [null,'owner'] as const) {
    const fake=fakeDb(role);
    const app=buildApp(fake.db,{settings});
    try {
      const response=await app.inject({method:'PUT',url:'/v1/workspaces/active',
        headers:{cookie,origin:settings.webOrigin},payload:{organizationId:oid}});
      assert.equal(response.statusCode,role?200:403);
      assert.equal(fake.commands.some(sql=>sql.includes('INSERT INTO creator_preferences')),Boolean(role));
    } finally {await app.close();}
  }
});

test('viewer cannot edit a workspace even with a session cookie',async()=>{
  const fake=fakeDb('viewer');
  const app=buildApp(fake.db,{settings});
  try {
    const response=await app.inject({method:'PATCH',url:`/v1/orgs/${oid}`,
      headers:{cookie,origin:settings.webOrigin},payload:{name:'New Name'}});
    assert.equal(response.statusCode,403);
    assert.equal(fake.commands.some(sql=>sql.includes('UPDATE organizations')),false);
  } finally {await app.close();}
});

test('session GET exposes creator but no raw token or OIDC identity',async()=>{
  const fake=fakeDb();
  const app=buildApp(fake.db,{settings});
  try {
    const response=await app.inject({method:'GET',url:'/v1/auth/session',headers:{cookie}});
    assert.equal(response.statusCode,200);
    assert.equal(response.json().creator.id,userId);
    assert.equal(response.headers['cache-control'],'no-store');
    assert.doesNotMatch(response.body,/random-session-token|sessionDigest|issuer/);
  } finally {await app.close();}
});
