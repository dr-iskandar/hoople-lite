// Non-mutating staging gate. Requires real HTTPS API + OIDC + PostgreSQL.
// Does not perform a real creator login, publish an event or write user data.
import assert from 'node:assert/strict';

const origin=process.env.API_STAGING_URL;
if(!origin)throw new Error('Set API_STAGING_URL to the HTTPS staging API origin');
const base=new URL(origin);
assert.equal(base.protocol,'https:','Staging must be HTTPS');
assert.equal(base.pathname,'/','Use API origin, without a path');
const call=(path,options={})=>fetch(new URL(path,base),{redirect:'manual',signal:AbortSignal.timeout(12000),...options});
const live=await call('/health/live');
assert.equal(live.status,200,'/health/live must return 200');
assert.equal(live.headers.get('x-content-type-options'),'nosniff');
assert.equal(live.headers.get('x-frame-options'),'DENY');
assert.match(live.headers.get('cache-control')||'',/no-store/);
assert.match(live.headers.get('strict-transport-security')||'',/max-age=/,'HSTS required at staging HTTPS origin');
const ready=await call('/health/ready');
assert.equal(ready.status,200,'/health/ready requires PostgreSQL');
const unauth=await call('/v1/auth/session');
assert.equal(unauth.status,401,'Session must require a login');
assert.match(unauth.headers.get('cache-control')||'',/no-store/);
const list=await call('/v1/orgs');
assert.equal(list.status,401,'Tenant list must require a session');
const denied=await call('/v1/orgs/example/experiences',{method:'OPTIONS',headers:{Origin:'https://attacker.example.invalid'}});
assert.equal(denied.status,403,'Other origins must be denied');
assert.equal(denied.headers.get('access-control-allow-origin'),null);
const login=await call('/v1/auth/start');
assert.equal(login.status,303,'OIDC initiation must redirect');
const location=login.headers.get('location');
assert.equal(new URL(location).protocol,'https:','OIDC authorization must be HTTPS');
const cookie=login.headers.get('set-cookie')||'';
assert.match(cookie,/__Host-hoople_oidc_flow=/);
assert.match(cookie,/Secure/i);
assert.match(cookie,/HttpOnly/i);
assert.match(cookie,/SameSite=Lax/i);
console.log('Staging preflight passed: TLS headers, readiness, auth gating, origin and OIDC start.');
console.log('PENDING MANUAL: real browser OIDC login/logout, cookie/session expiry, two-tenant RLS and rollback/restore.');
