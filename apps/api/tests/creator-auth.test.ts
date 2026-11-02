import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {
  constantTimeEquals, parseAuthSettings, sealFlow, sessionDigest, unsealFlow,
} from '../src/creator-auth.js';

const validEnv = () => ({
  OIDC_ISSUER:'https://accounts.google.com',
  OIDC_CLIENT_ID:'example-id',
  OIDC_CLIENT_SECRET:'example-secret',
  OIDC_REDIRECT_URI:'http://localhost:4000/v1/auth/callback',
  WEB_ORIGIN:'http://localhost:5173',
  SESSION_ENCRYPTION_KEY:randomBytes(32).toString('base64'),
  COOKIE_SECURE:'false', NODE_ENV:'development',
});

test('OIDC configuration fails closed if incomplete or insecure',() => {
  assert.equal(parseAuthSettings({}),undefined);
  assert.throws(()=>parseAuthSettings({OIDC_CLIENT_ID:'only'}),/Incomplete/);
  assert.throws(()=>parseAuthSettings({...validEnv(),SESSION_ENCRYPTION_KEY:'short'}),/32 random bytes/);
  assert.throws(()=>parseAuthSettings({...validEnv(),OIDC_ISSUER:'http://attacker.local'}),/HTTPS/);
  assert.throws(()=>parseAuthSettings({...validEnv(),WEB_ORIGIN:'http://localhost:5173/evil'}),/HTTPS/);
});

test('only localhost development permits insecure cookies',() => {
  assert.equal(parseAuthSettings(validEnv())?.secureCookies,false);
  assert.equal(parseAuthSettings({...validEnv(),NODE_ENV:'production'})?.secureCookies,true);
  assert.equal(parseAuthSettings({...validEnv(),WEB_ORIGIN:'https://studio.example.com'})?.secureCookies,true);
  assert.equal(parseAuthSettings(validEnv())?.issuer,'https://accounts.google.com');
});

test('OIDC flow is authenticated, bounded in time and tamper resistant',() => {
  const key = randomBytes(32);
  const now = Date.now();
  const flow = {state:randomBytes(32).toString('base64url'),
    nonce:randomBytes(32).toString('base64url'),
    verifier:randomBytes(32).toString('base64url'),createdAt:now};
  const encrypted = sealFlow(flow,key);
  assert.deepEqual(unsealFlow(encrypted,key,now+1000),flow);
  assert.equal(unsealFlow(encrypted,randomBytes(32),now),null);
  assert.equal(unsealFlow(encrypted,key,now+301_000),null);
  assert.equal(unsealFlow((encrypted[0] === 'A' ? 'B' : 'A') + encrypted.slice(1),key,now),null);
});

test('state compare uses strict timing-safe equality, session hash is stable',() => {
  assert.equal(constantTimeEquals('same','same'),true);
  assert.equal(constantTimeEquals('same','other'),false);
  assert.equal(constantTimeEquals('same','shorter'),false);
  assert.match(sessionDigest('random-session-token'),/^[a-f0-9]{64}$/);
});
