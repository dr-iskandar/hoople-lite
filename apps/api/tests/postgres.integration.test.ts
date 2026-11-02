import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes, randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {buildApp} from '../src/app.js';
import {createSession, setOrganizationContext, withCreator, type AuthSettings} from '../src/creator-auth.js';

test('real PostgreSQL: creator sessions, CRUD and cross-tenant RLS', {
  skip: !process.env.API_TEST_DATABASE_URL,
}, async () => {
  const pool = new Pool({connectionString:process.env.API_TEST_DATABASE_URL,max:5});
  const settings:AuthSettings = {
    issuer:'https://issuer.example.com',clientId:'test',clientSecret:'test',
    redirectUri:'https://api.example.com/v1/auth/callback',
    webOrigin:'https://studio.example.com',key:randomBytes(32),secureCookies:true,
  };
  const app = buildApp(pool,{settings});
  const headers = (token:string) => ({cookie:`__Host-hoople_session=${token}`,origin:settings.webOrigin});
  try {
    const role = await pool.query<{rolbypassrls:boolean}>(
      'SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user');
    assert.equal(role.rows[0]?.rolbypassrls,false,'test must NOT use a bypass-RLS role');

    const a = await createSession(pool,{issuer:settings.issuer,subject:randomUUID(),email:'a@example.test'});
    const b = await createSession(pool,{issuer:settings.issuer,subject:randomUUID(),email:'b@example.test'});
    const slugA = `org-${randomUUID().slice(0,12)}`;
    const slugB = `org-${randomUUID().slice(0,12)}`;
    const createA = await app.inject({method:'POST',url:'/v1/orgs',headers:headers(a.token),
      payload:{name:'Community A',slug:slugA}});
    const createB = await app.inject({method:'POST',url:'/v1/orgs',headers:headers(b.token),
      payload:{name:'Community B',slug:slugB}});
    assert.equal(createA.statusCode,201,createA.body);
    assert.equal(createB.statusCode,201,createB.body);
    const orgA = createA.json().id as string;
    const orgB = createB.json().id as string;

    const listA = await app.inject({method:'GET',url:'/v1/orgs',headers:headers(a.token)});
    const listB = await app.inject({method:'GET',url:'/v1/orgs',headers:headers(b.token)});
    assert.equal(listA.statusCode,200,listA.body);
    assert.equal(listB.statusCode,200,listB.body);
    assert.ok(listA.json().organizations.some((o:{id:string}) => o.id === orgA));
    assert.ok(!listB.json().organizations.some((o:{id:string}) => o.id === orgA));

    const selectForeign = await app.inject({method:'PUT',url:'/v1/workspaces/active',
      headers:headers(b.token),payload:{organizationId:orgA}});
    const editForeign = await app.inject({method:'PATCH',url:`/v1/orgs/${orgA}`,
      headers:headers(b.token),payload:{name:'Hijacked'}});
    const readForeign = await app.inject({method:'GET',url:`/v1/orgs/${orgA}`,headers:headers(b.token)});
    assert.equal(selectForeign.statusCode,403,selectForeign.body);
    assert.equal(editForeign.statusCode,403,editForeign.body);
    assert.equal(readForeign.statusCode,404,readForeign.body);

    // Even if context is set to another org, restrictive RLS hides its rows.
    await withCreator(pool,b.token,async ({client}) => {
      await setOrganizationContext(client,orgA);
      const unauthorized = await client.query('SELECT id FROM organizations WHERE id=$1',[orgA]);
      assert.equal(unauthorized.rows.length,0);
      const kits = await client.query('SELECT id FROM brand_kits WHERE organization_id=$1',[orgA]);
      assert.equal(kits.rows.length,0);
    });

    const chosen = await app.inject({method:'PUT',url:'/v1/workspaces/active',
      headers:headers(a.token),payload:{organizationId:orgA}});
    assert.equal(chosen.statusCode,200,chosen.body);
    const editOwn = await app.inject({method:'PATCH',url:`/v1/orgs/${orgA}`,
      headers:headers(a.token),payload:{name:'A New Name'}});
    assert.equal(editOwn.statusCode,200,editOwn.body);
    const archive = await app.inject({method:'DELETE',url:`/v1/orgs/${orgA}`,headers:headers(a.token)});
    assert.equal(archive.statusCode,200,archive.body);
    const listAfter = await app.inject({method:'GET',url:'/v1/orgs',headers:headers(a.token)});
    assert.ok(!listAfter.json().organizations.some((o:{id:string}) => o.id === orgA));
    assert.notEqual(orgA,orgB);
    const logout = await app.inject({method:'DELETE',url:'/v1/auth/session',headers:headers(a.token)});
    assert.equal(logout.statusCode,204);
    const afterLogout = await app.inject({method:'GET',url:'/v1/auth/session',headers:headers(a.token)});
    assert.equal(afterLogout.statusCode,401);
  } finally {
    await app.close();
    await pool.end();
  }
});
