import test from 'node:test';
import assert from 'node:assert/strict';
import {localDraftForImport,draftContainsLocalMedia} from '../src/cloudApi.js';

test('cloud import copies but never mutates a legacy questpop draft',()=>{
  const draft={id:'legacy-123',name:'Campus Quest',type:'passport',
    brand:{logo:'data:image/png;base64,ABC',name:'Campus'},
    reward:{imageUrl:'data:image/jpeg;base64,DEF',footnote:'Syarat dan ketentuan berlaku.'},
    missions:[{id:'m1',kind:'qr',name:'Pindai QR',code:'SECRET-QR',points:10}]};
  assert.equal(draftContainsLocalMedia(draft),true);
  const sanitized=localDraftForImport(draft);
  assert.equal(sanitized.brand.logo,'');
  assert.equal(sanitized.reward.imageUrl,'');
  assert.equal(sanitized.reward.footnote,'Syarat dan ketentuan berlaku.');
  assert.equal(sanitized.missions[0].code,'SECRET-QR');
  sanitized.missions[0].name='Changed';
  assert.equal(draft.missions[0].name,'Pindai QR');
  assert.equal(draft.brand.logo,'data:image/png;base64,ABC');
  assert.equal(draft.reward.imageUrl,'data:image/jpeg;base64,DEF');
});

test('cloud import returns null for invalid draft and retains ordinary image URLs',()=>{
  assert.equal(localDraftForImport({id:'broken'}),null);
  const draft={missions:[],brand:{logo:'https://cdn.example.com/logo.png'}};
  assert.equal(draftContainsLocalMedia(draft),false);
  assert.equal(localDraftForImport(draft).brand.logo,'https://cdn.example.com/logo.png');
});
