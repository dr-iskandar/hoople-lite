import test from 'node:test';
import assert from 'node:assert/strict';
import {publicDemoProjection,makeShareUrl,sharedExperience} from '../src/data.js';
import {cloudDraftToEditor,cloudDraftEndpoint} from '../src/cloudDraft.js';

const org='c189669e-a650-41cb-a2ba-7d56bb40dbbe';
const exp='e189669e-a650-41cb-a2ba-7d56bb40dbbe';

test('public demo payload never serializes QR or quiz validation secrets',()=>{
  const experience={name:'Public demo',type:'quiz',slug:'example',missions:[{
    id:'one',kind:'quiz',name:'Question',question:'Which?',options:['A','B','C','D'],
    correctIndex:3,code:'SECRET-QR',privateValidation:{code:'SENSITIVE'},points:10,
  }],brand:{logo:'data:image/png;base64,aGVsbG8=',accent:'#981CEB'},
    reward:{name:'Sticker',footnote:'Demo only',imageUrl:'data:image/png;base64,aGVsbG8='},
    publication:{mode:'now'}};
  const projection=publicDemoProjection(experience);
  const serialized=JSON.stringify(projection);
  assert.equal(projection.demoPublic,true);
  assert.doesNotMatch(serialized,/SECRET-QR|SENSITIVE|correctIndex|privateValidation|data:image/);
  assert.deepEqual(projection.missions[0].options,['A','B','C','D']);
  globalThis.location={origin:'https://hoople.example',pathname:'/app',hash:''};
  const url=makeShareUrl(experience);
  assert.ok(url.startsWith('https://hoople.example/app#play='));
  globalThis.location.hash=url.slice(url.indexOf('#'));
  const shared=sharedExperience();
  assert.equal(shared.demoPublic,true);
  assert.equal(shared.missions[0].correctIndex,null);
  assert.equal(shared.missions[0].code,'');
  delete globalThis.location;
});

test('old demo URLs are sanitized when parsed and malicious values are rejected',()=>{
  const legacy={name:'Legacy',type:'passport',missions:[{kind:'qr',name:'QR',code:'LEGACY-PRIVATE',points:5}]};
  globalThis.location={hash:'#play='+encodeURIComponent(btoa(JSON.stringify(legacy)))};
  const shared=sharedExperience();
  assert.equal(shared.missions[0].code,'');
  globalThis.location.hash='#play='+encodeURIComponent(btoa(JSON.stringify({name:'Empty',missions:[]})));
  assert.equal(sharedExperience(),null);
  delete globalThis.location;
});

test('authenticated cloud drafts map to in-memory editor without leaking validation into public config',()=>{
  const detail={id:exp,revision:4,title:'Private quiz',slug:'private-quiz',type:'quiz',
    settings:{studio:{name:'Private quiz',reward:{name:'Pins',footnote:'One per guest'}}},
    missions:[{id:'m1',kind:'quiz',title:'Question 1',description:'Private',points:20,
      publicConfig:{question:'Pick one',options:['A','B','C','D']},
      privateValidation:{correctIndex:2}}]};
  const result=cloudDraftToEditor(detail,org,{name:'Team',settings:{accent:'#981CEB'}});
  assert.equal(result.id,'cloud-'+org+'-'+exp);
  assert.equal(result.cloud.revision,4);
  assert.equal(result.cloud.dirty,false);
  assert.equal(result.missions[0].correctIndex,2);
  assert.equal(result.brand.name,'Team');
  assert.equal(cloudDraftEndpoint(org,exp),'/v1/orgs/'+org+'/experiences/'+exp);
  assert.throws(()=>cloudDraftToEditor({...detail,missions:[{...detail.missions[0],privateValidation:undefined}]},org),/PRIVATE_VALIDATION_UNAVAILABLE/);
});
