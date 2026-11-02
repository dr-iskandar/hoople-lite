# Hoople lite API — Stage 1 identity and schema (pre-production)

Fastify 5 + TypeScript + PostgreSQL 16+. The React studio is **still localStorage-based**; the routes here are not connected to it. No production OIDC provider, database, staging domain, media pipeline or event runtime has been provisioned.

## Start and check

```bash
npm ci
npm test
npm run build
npm run dev
```

Default binding: `127.0.0.1:4000`. `GET /health/live` returns 200; `GET /health/ready` returns 503 without a working DB.

The Node process **does not automatically read .env**. For Node >=20.6, create local `.env` from `.env.example` and start explicitly with `node --env-file=.env --import tsx src/server.ts`; or supply environment variables from the deployment secret manager. Never commit a real `.env`.

## PostgreSQL bootstrap

1. Provision PostgreSQL 16+, schema/migration owner with DDL rights and separate login role named `hoople_api` (no SUPERUSER, BYPASSRLS or table ownership). Use managed, rotated credentials; never commit them.
2. Provide the **migration owner's** `DATABASE_URL` and run `npm run db:migrate` to apply immutable `0001` and `0002`. Do not edit an already-applied migration.
3. Run `ops/grant_runtime.sql` as the migration owner. Configure the **runtime** `DATABASE_URL` using `hoople_api` and test readiness.
4. Verify the restricted role's tenant behavior using `API_TEST_DATABASE_URL` and `npm test`. GitHub Actions provisions a disposable PostgreSQL container and executes the same tests. The CI provisioning helper refuses remote/non-CI databases.
5. Configure OIDC on your chosen provider (issuer, client ID/secret, exact redirect URI), `WEB_ORIGIN` and a random 32-byte base64 `SESSION_ENCRYPTION_KEY`. Run under HTTPS with Secure cookies. `COOKIE_SECURE=false` is only available for localhost development.

The model uses PostgreSQL FORCE RLS for creator-visible tables. OIDC subject and temporary session hash contexts are only set server-side after a validated authorization-code grant; clients cannot select tenant context by submitting a header. Runtime grants are intentionally limited to schema operations currently used by the API.

## Auth endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/v1/auth/start` | Redirects to OIDC login, stores encrypted short-lived PKCE/state/nonce in HttpOnly cookie |
| GET | `/v1/auth/callback` | Verifies state, nonce and authorization code; creates app session and redirects to configured `WEB_ORIGIN` |
| POST | `/v1/auth/session` | Alternative code/state exchange for frontend callback; exact Origin required |
| GET | `/v1/auth/session` | Returns current authenticated creator, or 401 |
| DELETE | `/v1/auth/session` | Revokes opaque 12-hour session and clears cookie |

All creator writes require an exact `Origin: WEB_ORIGIN` request header. Browser CORS credentials are allowed for that one origin only. Session cookies are HttpOnly, SameSite=Lax, Secure (production), path=/ and host-only. Server stores only a SHA-256 digest of the opaque session token. Neither password grant nor unsigned user JWT is accepted.

## Organization endpoints

| Method | Path | Access |
| --- | --- | --- |
| GET | `/v1/orgs` | Own workspaces and active selection |
| POST | `/v1/orgs` | Authenticated creator creates organization and becomes owner |
| GET | `/v1/orgs/:oid` | Member |
| PATCH | `/v1/orgs/:oid` | Owner/admin |
| DELETE | `/v1/orgs/:oid` | Owner; **soft-archive only**, retains audit history |
| PUT | `/v1/workspaces/active` | Member selects their active workspace |

Workspace mutation privileges are checked against membership in the same DB transaction. An unknown/foreign workspace cannot be selected by arbitrary org UUID. The 0002 migration adds session/preferences, `brand_kits`, `experiences`, `missions`, and more restrictive per-user RLS policies. `missions.private_validation` must never be serialized to a public client.

## Still pending

- Connect React studio via API (including migration/import of old `questpop-*` drafts).
- Real IdP interactive login test, session rotation/cleanup, abuse/rate limiting, HTTPS deployment, origin/cookie integration.
- Experience/mission/brand-kit CRUD endpoints, optimistic revisions, immutable versions, launch access gate, public projection redaction.
- Media moderation, verified QR/quiz/rewards, participant engine, billing, privacy retention/consent, monitoring/backups and legal review.

No feature here is ready for live attendees, real payouts or paid events without separate security/operations approval.
