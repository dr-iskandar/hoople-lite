import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool, PoolClient } from 'pg';
import { withTenant } from '../src/db/tenant.js';

const orgId = 'c189669e-a650-41cb-a2ba-7d56bb40dbbe';

function fakePool(failWork = false) {
  const commands: Array<{sql:string;params?: unknown[]}> = [];
  let released = false;
  const client = {
    query: async (sql: string, params?: unknown[]) => {
      commands.push({sql,params});
      if (sql === 'SELECT 42' && failWork) throw new Error('Query failed');
      return { rows: [{value:42}] };
    },
    release: () => { released = true; },
  } as unknown as PoolClient;
  return { pool: { connect: async () => client } as Pick<Pool, 'connect'>, commands, wasReleased: () => released };
}

test('tenant context stays in one transaction and releases connection', async () => {
  const fake = fakePool();
  const result = await withTenant(fake.pool,orgId,async client => {
    const {rows} = await client.query('SELECT 42');
    return rows[0].value;
  });
  assert.equal(result,42);
  assert.deepEqual(fake.commands.map(c=>c.sql),[
    'BEGIN',"SELECT set_config('app.current_org_id', $1, true)",'SELECT 42','COMMIT',
  ]);
  assert.deepEqual(fake.commands[1].params,[orgId]);
  assert.equal(fake.wasReleased(),true);
});

test('failed tenant operation rolls back and releases', async () => {
  const fake = fakePool(true);
  await assert.rejects(withTenant(fake.pool,orgId,async client => {
    await client.query('SELECT 42');
  }),/Query failed/);
  assert.equal(fake.commands.at(-1)?.sql,'ROLLBACK');
  assert.equal(fake.wasReleased(),true);
});

test('invalid org IDs rejected before acquiring connection', async () => {
  const fake = fakePool();
  await assert.rejects(withTenant(fake.pool,'not-an-organization',async()=>null),/Invalid organization ID/);
  assert.equal(fake.commands.length,0);
});
