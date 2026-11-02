import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import * as oidc from 'openid-client';
import type { Pool, PoolClient } from 'pg';

export type CreatorIdentity = { issuer: string; subject: string; email?: string; displayName?: string };
export type Creator = { id: string; email: string | null; displayName: string | null };
export type SessionContext = { client: PoolClient; creator: Creator };
export type DbPool = Pick<Pool, 'connect'>;
export type OidcFlow = { state: string; nonce: string; verifier: string; createdAt: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;
const LOGIN_TTL_MS = 5 * 60_000;
const SESSION_TTL_HOURS = 12;

export function parseAuthSettings(env: NodeJS.ProcessEnv = process.env) {
  const names = ['OIDC_ISSUER','OIDC_CLIENT_ID','OIDC_CLIENT_SECRET','OIDC_REDIRECT_URI','WEB_ORIGIN','SESSION_ENCRYPTION_KEY'] as const;
  if (names.every(k => !env[k])) return undefined;
  if (names.some(k => !env[k])) throw new Error('Incomplete OIDC configuration');
  const issuerId = env.OIDC_ISSUER!.replace(/\/$/,'');
  const issuer = new URL(issuerId);
  const redirectUri = new URL(env.OIDC_REDIRECT_URI!);
  const webOrigin = new URL(env.WEB_ORIGIN!);
  if (issuer.protocol !== 'https:' || (redirectUri.protocol !== 'https:' && redirectUri.hostname !== 'localhost')
    || (webOrigin.protocol !== 'https:' && webOrigin.hostname !== 'localhost')
    || webOrigin.pathname !== '/' || webOrigin.search || webOrigin.hash
    || redirectUri.hash) {
    throw new Error('OIDC endpoints and web origin must use HTTPS (localhost is allowed for development)');
  }
  const key = Buffer.from(env.SESSION_ENCRYPTION_KEY!, 'base64');
  if (key.length !== 32 || key.toString('base64') !== env.SESSION_ENCRYPTION_KEY) {
    throw new Error('SESSION_ENCRYPTION_KEY must be 32 random bytes encoded as base64');
  }
  const secureCookies = !(env.NODE_ENV !== 'production' && env.COOKIE_SECURE === 'false'
    && webOrigin.hostname === 'localhost' && redirectUri.hostname === 'localhost');
  return { issuer: issuerId, clientId: env.OIDC_CLIENT_ID!, clientSecret: env.OIDC_CLIENT_SECRET!,
    redirectUri: redirectUri.href, webOrigin: webOrigin.origin, key, secureCookies };
}
export type AuthSettings = NonNullable<ReturnType<typeof parseAuthSettings>>;

export function sessionDigest(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function sealFlow(flow: OidcFlow, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const payload = Buffer.from(JSON.stringify(flow));
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}

export function unsealFlow(cookie: string | undefined, key: Buffer, now = Date.now()): OidcFlow | null {
  if (!cookie || cookie.length > 3000) return null;
  try {
    const raw = Buffer.from(cookie, 'base64url');
    if (raw.length < 29) return null;
    const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0,12));
    decipher.setAuthTag(raw.subarray(12,28));
    const flow = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]).toString()) as OidcFlow;
    if (typeof flow.state !== 'string' || flow.state.length < 32 ||
      typeof flow.nonce !== 'string' || flow.nonce.length < 32 ||
      typeof flow.verifier !== 'string' || flow.verifier.length < 32 ||
      !Number.isFinite(flow.createdAt) || flow.createdAt > now || now - flow.createdAt > LOGIN_TTL_MS) return null;
    return flow;
  } catch { return null; }
}

export function constantTimeEquals(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface OidcProvider {
  authorizationUrl(flow: OidcFlow): Promise<string>;
  exchange(code: string, state: string, flow: OidcFlow): Promise<CreatorIdentity>;
}

export function createOidcProvider(settings: AuthSettings): OidcProvider {
  let configuration: Promise<oidc.Configuration> | undefined;
  const getConfig = () => configuration ??= oidc.discovery(
    new URL(settings.issuer), settings.clientId, settings.clientSecret);
  return {
    async authorizationUrl(flow) {
      const challenge = await oidc.calculatePKCECodeChallenge(flow.verifier);
      return oidc.buildAuthorizationUrl(await getConfig(), {
        redirect_uri: settings.redirectUri, scope: 'openid email profile',
        code_challenge: challenge, code_challenge_method: 'S256',
        state: flow.state, nonce: flow.nonce,
      }).href;
    },
    async exchange(code, state, flow) {
      const callback = new URL(settings.redirectUri);
      callback.searchParams.set('code',code);
      callback.searchParams.set('state',state);
      const tokens = await oidc.authorizationCodeGrant(await getConfig(), callback, {
        pkceCodeVerifier: flow.verifier, expectedState: flow.state,
        expectedNonce: flow.nonce, idTokenExpected: true,
      });
      const claims = tokens.claims();
      if (!claims?.iss || !claims.sub || claims.iss !== settings.issuer) throw new Error('Invalid OIDC ID token');
      return { issuer: claims.iss, subject: claims.sub,
        email: typeof claims.email === 'string' ? claims.email : undefined,
        displayName: typeof claims.name === 'string' ? claims.name : undefined };
    },
  };
}

async function transaction<T>(pool: DbPool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let begun = false;
  try {
    await client.query('BEGIN');
    begun = true;
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    if (begun) { try { await client.query('ROLLBACK'); } catch { /* preserve error */ } }
    throw error;
  } finally { client.release(); }
}

async function context(client: PoolClient, key: string, value: string) {
  await client.query('SELECT set_config($1, $2, true)', [key,value]);
}

export async function createSession(pool: DbPool, identity: CreatorIdentity) {
  if (!identity.issuer || !identity.subject || identity.issuer.length > 255 || identity.subject.length > 255) {
    throw new Error('Invalid verified identity');
  }
  const token = randomBytes(32).toString('base64url');
  const tokenHash = sessionDigest(token);
  const creator = await transaction(pool, async client => {
    await context(client,'app.oidc_issuer',identity.issuer);
    await context(client,'app.oidc_subject',identity.subject);
    const row = await client.query<Creator>(`INSERT INTO users (identity_provider, provider_subject, email, display_name)
      VALUES ($1,$2,$3,$4) ON CONFLICT (identity_provider, provider_subject)
      DO UPDATE SET email=EXCLUDED.email, display_name=EXCLUDED.display_name, updated_at=now()
      RETURNING id, email, display_name AS "displayName"`,
      [identity.issuer,identity.subject,identity.email ?? null,identity.displayName ?? null]);
    const result = row.rows[0];
    if (!result?.id || !UUID.test(result.id)) throw new Error('User upsert failed');
    await context(client,'app.current_user_id',result.id);
    await context(client,'app.session_hash',tokenHash);
    await client.query(`INSERT INTO creator_sessions (token_hash,user_id,expires_at)
      VALUES ($1,$2,now()+interval '12 hours')`,[tokenHash,result.id]);
    return result;
  });
  return { creator, token, maxAge: SESSION_TTL_HOURS * 3600 };
}

export async function withCreator<T>(pool: DbPool, cookie: string | undefined,
  work: (ctx: SessionContext) => Promise<T>): Promise<T | null> {
  if (!cookie || !/^[A-Za-z0-9_-]{43}$/.test(cookie)) return null;
  const hash = sessionDigest(cookie);
  if (!HASH.test(hash)) return null;
  return transaction(pool, async client => {
    await context(client,'app.session_hash',hash);
    const session = await client.query<{user_id:string}>(`SELECT user_id FROM creator_sessions
      WHERE token_hash = $1 AND expires_at > now()`,[hash]);
    const userId = session.rows[0]?.user_id;
    if (!userId || !UUID.test(userId)) return null;
    await context(client,'app.current_user_id',userId);
    const user = await client.query<Creator>('SELECT id,email,display_name AS "displayName" FROM users WHERE id=$1',[userId]);
    if (!user.rows[0]) return null;
    return work({client,creator:user.rows[0]});
  });
}

export async function revokeSession(pool: DbPool, cookie: string | undefined) {
  return withCreator(pool,cookie,async ({client}) => {
    await client.query('DELETE FROM creator_sessions WHERE token_hash=$1',[sessionDigest(cookie!)]);
    return true;
  });
}

export async function setOrganizationContext(client: PoolClient, organizationId: string) {
  if (!UUID.test(organizationId)) throw new Error('Invalid organization ID');
  await context(client,'app.current_org_id',organizationId);
}
