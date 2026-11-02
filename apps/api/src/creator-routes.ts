import { randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  type AuthSettings, type DbPool, type OidcProvider, type OidcFlow,
  constantTimeEquals, createSession, revokeSession, sealFlow, unsealFlow, withCreator,
} from './creator-auth.js';

export function creatorCookieNames(secure: boolean) {
  return secure
    ? { flow: '__Host-hoople_oidc_flow', session: '__Host-hoople_session' }
    : { flow: 'hoople_oidc_flow_dev', session: 'hoople_session_dev' };
}

export function registerCreatorRoutes(app: FastifyInstance, pool?: DbPool,
  settings?: AuthSettings, provider?: OidcProvider) {
  const names = creatorCookieNames(settings?.secureCookies ?? true);
  const available = () => Boolean(pool && settings && provider);
  const cookieOptions = () => ({
    path: '/', httpOnly: true, secure: settings?.secureCookies ?? true,
    sameSite: 'lax' as const,
  });
  const originAllowed = (request: FastifyRequest) =>
    settings && request.headers.origin === settings.webOrigin;

  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (settings && origin === settings.webOrigin) {
      reply.header('Access-Control-Allow-Origin', settings.webOrigin);
      reply.header('Access-Control-Allow-Credentials', 'true');
      reply.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Content-Type');
      reply.header('Vary', 'Origin');
    }
    if (request.method === 'OPTIONS' && request.url.startsWith('/v1/')) {
      if (origin !== settings?.webOrigin) return reply.code(403).send({error:'FORBIDDEN_ORIGIN'});
      return reply.code(204).send();
    }
  });

  function clearFlow(reply: FastifyReply) {
    reply.clearCookie(names.flow,{path:'/'});
  }
  function setSessionCookie(reply: FastifyReply, token: string, maxAge: number) {
    reply.setCookie(names.session,token,{...cookieOptions(),maxAge});
  }

  async function exchange(request: FastifyRequest, reply: FastifyReply, redirect: boolean) {
    if (!available()) return reply.code(503).send({error:'AUTH_NOT_CONFIGURED'});
    const values = redirect ? request.query : request.body;
    if (!values || typeof values !== 'object') return reply.code(400).send({error:'INVALID_OIDC_CALLBACK'});
    const {code,state} = values as Record<string,unknown>;
    if (typeof code !== 'string' || code.length < 4 || code.length > 4096
      || typeof state !== 'string' || state.length > 256) {
      return reply.code(400).send({error:'INVALID_OIDC_CALLBACK'});
    }
    const flow = unsealFlow(request.cookies[names.flow],settings!.key);
    clearFlow(reply);
    if (!flow || !constantTimeEquals(flow.state,state)) return reply.code(400).send({error:'INVALID_OIDC_STATE'});
    try {
      const verifiedIdentity = await provider!.exchange(code,state,flow);
      // No user-controlled ID token fields may be trusted before provider verification.
      const {token,maxAge} = await createSession(pool!,verifiedIdentity);
      setSessionCookie(reply,token,maxAge);
      reply.header('Cache-Control','no-store');
      if (redirect) return reply.code(303).redirect(settings!.webOrigin);
      return reply.code(201).send({authenticated:true});
    } catch {
      return reply.code(401).send({error:'OIDC_EXCHANGE_FAILED'});
    }
  }

  app.get('/v1/auth/start',async (_request,reply) => {
    if (!available()) return reply.code(503).send({error:'AUTH_NOT_CONFIGURED'});
    const flow: OidcFlow = {
      state: randomBytes(32).toString('base64url'),
      nonce: randomBytes(32).toString('base64url'),
      verifier: randomBytes(32).toString('base64url'),
      createdAt: Date.now(),
    };
    try {
      const url = await provider!.authorizationUrl(flow);
      const target = new URL(url);
      if (target.protocol !== 'https:') throw new Error('Unsafe OIDC redirect');
      reply.setCookie(names.flow,sealFlow(flow,settings!.key),{...cookieOptions(),maxAge:300});
      reply.header('Cache-Control','no-store');
      return reply.code(303).redirect(target.href);
    } catch {
      return reply.code(503).send({error:'OIDC_PROVIDER_UNAVAILABLE'});
    }
  });

  app.get('/v1/auth/callback',async (request,reply) => exchange(request,reply,true));
  app.post('/v1/auth/session',async (request,reply) => {
    if (!originAllowed(request)) return reply.code(403).send({error:'FORBIDDEN_ORIGIN'});
    return exchange(request,reply,false);
  });

  app.get('/v1/auth/session',async (request,reply) => {
    if (!pool) return reply.code(503).send({error:'DATABASE_UNAVAILABLE'});
    try {
      const creator = await withCreator(pool,request.cookies[names.session],async ({creator}) => creator);
      reply.header('Cache-Control','no-store');
      if (!creator) return reply.code(401).send({authenticated:false});
      return {authenticated:true,creator};
    } catch {
      return reply.code(503).send({error:'DATABASE_UNAVAILABLE'});
    }
  });
  app.delete('/v1/auth/session',async (request,reply) => {
    if (!originAllowed(request)) return reply.code(403).send({error:'FORBIDDEN_ORIGIN'});
    if (!pool) return reply.code(503).send({error:'DATABASE_UNAVAILABLE'});
    try {
      await revokeSession(pool,request.cookies[names.session]);
      reply.clearCookie(names.session,{path:'/'});
      reply.header('Cache-Control','no-store');
      return reply.code(204).send();
    } catch {
      return reply.code(503).send({error:'DATABASE_UNAVAILABLE'});
    }
  });
}
