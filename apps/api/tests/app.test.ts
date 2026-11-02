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

test('unfinished protected routes are not exposed', async () => {
  const app = buildApp();
  try {
    const response = await app.inject({ method: 'POST', url: '/v1/orgs', payload: { name: 'Fake org' } });
    assert.equal(response.statusCode, 404);
  } finally { await app.close(); }
});
