# Hoople lite API — P0 Foundation (not yet integrated)

**Scope:** TypeScript + Fastify 5 + PostgreSQL 16+ foundation. This API is **not production-ready** and the React frontend is still localStorage-powered. Do not enable real accounts/events, QR rewards, billing or participant data yet.

## Run locally

From `apps/api`:

```bash
npm ci
npm test
npm run build
npm run dev
```

The default bind address is `127.0.0.1:4000` (localhost only). Check:

```bash
curl http://127.0.0.1:4000/health/live
curl -i http://127.0.0.1:4000/health/ready
```

Liveness returns HTTP 200 when the process runs. Readiness returns HTTP 503 until a reachable PostgreSQL database is configured. **No user/event APIs are exposed.**

## PostgreSQL setup

1. Create PostgreSQL 16+ database and a dedicated, unprivileged runtime role (`hoople_app`). Use a separate role for running migrations. Do not use a superuser or `BYPASSRLS` role for runtime.
2. Set `DATABASE_URL` locally via an environment variable. `.env.example` is a template, and the server does not read `.env` automatically.
3. With a migration-role connection string, run `npm run db:migrate`.
4. Explicitly `GRANT` only required schema/table privileges to the app role. **Never grant unrestricted access to `schema_migrations` or bypass row security.**
5. Runtime queries will eventually use `withTenant(pool, orgId, fn)` after identity and organization-role authorization. `withTenant` sets `app.current_org_id` only inside a transaction.

The initial migration creates users, organizations, memberships, and append-only audit logs with PostgreSQL RLS + FORCE RLS. No seed accounts or demo master tokens are shipped. Identity-provider integration and organization creation require an authorized bootstrap flow that is not implemented yet.

## API endpoints implemented

| Route | Response | Meaning |
| --- | --- | --- |
| `GET /health/live` | 200 | Process is alive |
| `GET /health/ready` | 200 or 503 | Database probe passes or fails |

Everything else, including `/v1/auth`, `/v1/orgs`, `/v1/experiences`, public player routes, payments and webhooks, remains unimplemented. Do not expose tenant selection by arbitrary client header.

## Verification gaps before real usage

- PostgreSQL integration test with separate privileged migration and restricted runtime DB roles.
- Identity/OIDC validation, session management, membership authorization and RBAC.
- Cross-tenant denial tests under real RLS; restore/backup and migration rollback plans.
- Rate limiting, API CORS allowlist, observability and deployment security headers.
- Public projection redaction, verified missions, server-controlled points and publishing gate.

Architecture decisions and module priorities: [`../../docs/BACKEND_ARCHITECTURE.md`](../../docs/BACKEND_ARCHITECTURE.md).
