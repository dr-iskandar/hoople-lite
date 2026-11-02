import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('foundation migration enables forced RLS and avoids public tenant bypass',async()=>{
  const sql=await readFile(new URL('../migrations/0001_foundation.sql',import.meta.url),'utf8');
  for(const table of ['users','organizations','memberships','audit_logs']){
    assert.match(sql,new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`));
    assert.match(sql,new RegExp(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;`));
  }
  assert.match(sql,/current_setting\('app\.current_org_id', true\)/);
  assert.doesNotMatch(sql,/BYPASSRLS\s*;/i);
});
