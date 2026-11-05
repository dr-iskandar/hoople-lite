import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

test('liveness reports a working process', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({ method: 'GET', url: '/health/live' });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { service: 'hoople-lite-api', status: 'ok' });
  } finally { await app.close(); }
});

test('readiness fails closed with no database', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({ method: 'GET', url: '/health/ready' });
    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.json(), { status: 'not_ready', dependency: 'database' });
  } finally { await app.close(); }
});

test('readiness succeeds after a database probe', async () => {
  const app = buildApp({ query: async (sql) => {
    assert.equal(sql, 'SELECT 1');
    return { rows: [{ value: 1 }] };
  } });
  try {
    const response = await app.inject({ method: 'GET', url: '/health/ready' });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: 'ready' });
  } finally { await app.close(); }
});

test('DB errors do not leak connection details', async () => {
  const app = buildApp({ query: async () => { throw new Error('private connection string'); } });
  try {
    const response = await app.inject({ method: 'GET', url: '/health/ready' });
    assert.equal(response.statusCode, 503);
    assert.doesNotMatch(response.body, /private connection string/);
  } finally { await app.close(); }
});

test('organization writes fail closed when authentication is not configured', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({ method: 'POST', url: '/v1/orgs', payload: { name: 'Fake org' } });
    assert.equal(response.statusCode, 403);
    const start = await app.inject({ method:'GET', url:'/v1/auth/start' });
    assert.equal(start.statusCode,503);
    const session = await app.inject({ method:'GET', url:'/v1/auth/session' });
    assert.equal(session.statusCode,503);
  } finally { await app.close(); }
});

test('API responses carry privacy and framing protections', async () => {
  const app = buildApp();
  try {
    for (const url of ['/health/live', '/v1/auth/session']) {
      const response = await app.inject({method:'GET',url});
      assert.equal(response.headers['cache-control'],'no-store');
      assert.equal(response.headers['x-content-type-options'],'nosniff');
      assert.equal(response.headers['x-frame-options'],'DENY');
      assert.equal(response.headers['referrer-policy'],'no-referrer');
      assert.match(String(response.headers['content-security-policy']),/frame-ancestors 'none'/);
    }
  } finally {await app.close();}
});
