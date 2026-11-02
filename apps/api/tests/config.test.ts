import test from 'node:test';
import assert from 'node:assert/strict';
import { readConfig } from '../src/config.js';

test('defaults to localhost and optional DB',()=>{
  assert.deepEqual(readConfig({}),{host:'127.0.0.1',port:4000,databaseUrl:undefined});
});

test('invalid ports fail before binding socket',()=>{
  for(const port of ['0','-1','65536','abc','4000.5']){
    assert.throws(()=>readConfig({PORT:port}),/PORT/);
  }
});
