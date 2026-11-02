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

    // Creator-engine CRUD, role/origin checks and tenant isolation on real RLS.
    const kit = await app.inject({method:'POST',url:`/v1/orgs/${orgA}/brand-kits`,
      headers:headers(a.token),payload:{name:'Campus Identity',primaryColor:'#981CEB',settings:{logo:'https://assets.example.test/logo.png'}}});
    assert.equal(kit.statusCode,201,kit.body);
    const kitId=kit.json().id as string;
    const kitRead=await app.inject({method:'GET',url:`/v1/orgs/${orgA}/brand-kits/${kitId}`,
      headers:headers(a.token)});
    assert.equal(kitRead.json().name,'Campus Identity');
    const kitEdit=await app.inject({method:'PATCH',url:`/v1/orgs/${orgA}/brand-kits/${kitId}`,
      headers:headers(a.token),payload:{expectedRevision:1,name:'Campus New'}});
    assert.equal(kitEdit.statusCode,200,kitEdit.body);
    const kitStale=await app.inject({method:'PATCH',url:`/v1/orgs/${orgA}/brand-kits/${kitId}`,
      headers:headers(a.token),payload:{expectedRevision:1,name:'Bad stale update'}});
    assert.equal(kitStale.statusCode,409,kitStale.body);

    const experience=await app.inject({method:'POST',url:`/v1/orgs/${orgA}/experiences`,
      headers:headers(a.token),payload:{title:'Campus Day',type:'quiz',slug:`campus-${randomUUID().slice(0,8)}`,
        brandKitId:kitId,settings:{publication:{mode:'now'}}}});
    assert.equal(experience.statusCode,201,experience.body);
    const expId=experience.json().id as string;
    const quizFields={kind:'quiz',title:'Intro Quiz',points:50,
      publicConfig:{question:'Tahun berapa?',options:['2020','2021','2022','2023']},
      privateValidation:{correctIndex:2}};
    const mission=await app.inject({method:'POST',url:`/v1/orgs/${orgA}/experiences/${expId}/missions`,
      headers:headers(a.token),payload:quizFields});
    assert.equal(mission.statusCode,201,mission.body);
    const mid=mission.json().id as string;
    const leak=await app.inject({method:'POST',url:`/v1/orgs/${orgA}/experiences/${expId}/missions`,
      headers:headers(a.token),payload:{...quizFields,publicConfig:{...quizFields.publicConfig,correctIndex:2}}});
    assert.equal(leak.statusCode,400,leak.body);
    const foreignExp=await app.inject({method:'GET',url:`/v1/orgs/${orgA}/experiences/${expId}`,
      headers:headers(b.token)});
    assert.equal(foreignExp.statusCode,404,foreignExp.body);
    const foreignMission=await app.inject({method:'PATCH',url:`/v1/orgs/${orgA}/experiences/${expId}/missions/${mid}`,
      headers:headers(b.token),payload:{expectedRevision:1,...quizFields}});
    assert.equal(foreignMission.statusCode,404,foreignMission.body);
    const wrongOrigin=await app.inject({method:'DELETE',url:`/v1/orgs/${orgA}/experiences/${expId}/missions/${mid}`,
      headers:{cookie:`__Host-hoople_session=${a.token}`,origin:'https://evil.example.com'}});
    assert.equal(wrongOrigin.statusCode,403,wrongOrigin.body);
    const details=await app.inject({method:'GET',url:`/v1/orgs/${orgA}/experiences/${expId}`,
      headers:headers(a.token)});
    assert.equal(details.json().missions[0].privateValidation.correctIndex,2);
    assert.ok(!Object.hasOwn(details.json().missions[0].publicConfig,'correctIndex'));
    const editMission=await app.inject({method:'PATCH',url:`/v1/orgs/${orgA}/experiences/${expId}/missions/${mid}`,
      headers:headers(a.token),payload:{...quizFields,title:'Updated Quiz',expectedRevision:1}});
    assert.equal(editMission.statusCode,200,editMission.body);
    const order=await app.inject({method:'PUT',url:`/v1/orgs/${orgA}/experiences/${expId}/missions/order`,
      headers:headers(a.token),payload:{missionIds:[mid],expectedRevision:3}});
    assert.equal(order.statusCode,200,order.body);
    const expEdit=await app.inject({method:'PATCH',url:`/v1/orgs/${orgA}/experiences/${expId}`,
      headers:headers(a.token),payload:{expectedRevision:4,title:'Campus Day v2'}});
    assert.equal(expEdit.statusCode,200,expEdit.body);
    const missionDeleted=await app.inject({method:'DELETE',url:`/v1/orgs/${orgA}/experiences/${expId}/missions/${mid}`,
      headers:headers(a.token)});
    assert.equal(missionDeleted.statusCode,200,missionDeleted.body);

    const localDraft={id:`legacy-${randomUUID().slice(0,8)}`,name:'Legacy Quest',type:'passport',
      brand:{name:'Old Community',accent:'#981CEB'},reward:{name:'Sticker',footnote:'Persediaan terbatas.'},
      missions:[{id:'m1',kind:'qr',name:'Scan',points:10,code:'SCAN-KEY'}]};
    const importUrl=`/v1/orgs/${orgA}/experiences/import`;
    const imported=await app.inject({method:'POST',url:importUrl,headers:headers(a.token),payload:{draft:localDraft}});
    assert.equal(imported.statusCode,201,imported.body);
    assert.equal(imported.json().importedMissions,1);
    const duplicate=await app.inject({method:'POST',url:importUrl,headers:headers(a.token),payload:{draft:localDraft}});
    assert.equal(duplicate.statusCode,200,duplicate.body);
    assert.equal(duplicate.json().alreadyImported,true);
    assert.equal(duplicate.json().id,imported.json().id);
    const importedDetails=await app.inject({method:'GET',url:`/v1/orgs/${orgA}/experiences/${imported.json().id}`,
      headers:headers(a.token)});
    assert.equal(importedDetails.json().settings.studio.reward.footnote,'Persediaan terbatas.');
    assert.equal(importedDetails.json().missions[0].privateValidation.code,'SCAN-KEY');
    assert.ok(!Object.hasOwn(importedDetails.json().missions[0].publicConfig,'code'));

    const expDeleted=await app.inject({method:'DELETE',url:`/v1/orgs/${orgA}/experiences/${expId}`,
      headers:headers(a.token)});
    assert.equal(expDeleted.statusCode,200,expDeleted.body);
    const kitDeleted=await app.inject({method:'DELETE',url:`/v1/orgs/${orgA}/brand-kits/${kitId}`,
      headers:headers(a.token)});
    assert.equal(kitDeleted.statusCode,200,kitDeleted.body);

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
