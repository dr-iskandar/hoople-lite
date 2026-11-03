# Security hardening and operations — Hoople lite

Updated 3 November 2026. This document is a release checklist, **not an assertion that production is secure**.

## Current audited source

- React/Vite studio (interactive editor persists to historical `questpop-studio-v1` in `localStorage`). Cloud dashboard import is optional, one-way, and does not overwrite local drafts.
- Fastify 5 + PostgreSQL RLS API, OIDC login, HttpOnly sessions, exact-origin mutation guards, membership-scoped CRUD and private mission validation.
- The demo `#play=` share URL contains client-readable data. It must not be used with real attendee PII, QR secrets, answer keys, payments or genuine publishing embargoes.
- No PHP application is present in this repository. Check other services on the same host separately.

## Blockers before handling real creator or participant data

- [ ] Deploy behind **HTTPS** with trusted certificates, forced HTTP-to-HTTPS redirects, TLS 1.2+; ensure cookies remain HttpOnly, Secure, host-only and SameSite=Lax. Verify HSTS at the actual reverse proxy. The API sets defensive response headers and HSTS in production mode; headers alone do not create TLS.
- [ ] Provision OIDC issuer/client with PKCE, state and nonce; exact HTTPS redirect URL and web origin, no wildcard CORS. Run interactive login/logout/session-expiry tests with real browser cookies and across all intended domains.
- [ ] Store `DATABASE_URL`, `OIDC_CLIENT_SECRET`, `SESSION_ENCRYPTION_KEY` in a secret manager (never client env or Git). Rotate keys under a tested recovery plan. Treat logs and backups as sensitive.
- [ ] Put PostgreSQL on a private network; require DB TLS, managed encryption at rest, encrypted backups and **restore tests**. Use separate DDL migrator and least-privilege non-BYPASSRLS runtime role, with `FORCE ROW LEVEL SECURITY` on tenant tables. Run cross-tenant tests using the runtime role.
- [ ] Configure ingress/WAF rate limits, connection/body/header timeouts, IP abuse controls for auth/start/callback and session APIs, request size budgets and alerting. API process instances alone do not provide a reliable distributed rate limiter.
- [ ] Set role-based access rights, log access to private organizer records, review who can read mission secrets; prohibit raw request bodies, cookies, tokens, PII, camera/location data and QR secrets in logs/telemetry.
- [ ] Define purpose, consent text, owner, retention periods, subject access/export/deletion procedures and breach-response playbook; obtain Indonesian privacy/legal review (including **UU PDP**) before collecting real participant data.
- [ ] Replace browser-share payloads with opaque server-backed public URLs, immutable published versions and server-verified points/QR/quiz/rewards. Enforce scheduled release using server/database time on **every** public endpoint. Never trust visitor-side scoring.
- [ ] Introduce private scoped image upload, MIME and size validation, EXIF stripping, malware/content review, quarantine, access expiry and deletion before handling any photo or face data. Face recognition requires a separate DPIA/privacy/legal approval and a non-biometric alternative.
- [ ] Define incident runbook: revoke sessions/tokens, rotate credentials, contain affected tenant, preserve minimal audit evidence, restore backups, notify affected users/regulators where required.

## Runtime and dependency discipline

- Node.js 20 is EOL. Target latest patched **Node 24 LTS** (baseline 24.22.1) or supported Node 26 LTS (baseline 26.12.1). Set platform/container runtime **and** GitHub Actions, not only `package.json`.
- Fastify 5.12.8 (2 Nov 2026) addresses advisory GHSA-3qgw-9275-xf8w; lockfile must resolve that patch or later. Vite 6.4.5 addresses GHSA-8g5g-mxqh-grgj; do not expose Vite dev server publicly.
- Run `npm ci`, `npm audit --audit-level=high`, `npm ci --prefix apps/api`, `npm audit --prefix apps/api --audit-level=high`, test and build in CI. Investigate all advisories regardless of CI threshold; Dependabot tracks both npm manifests plus actions.
- Weekly audit and on-PR checks detect known advisories; they do **not** replace code review, pen-testing or a pinned base-image OS vulnerability scan. Prefer official security announcements, not social-media claims.
- For separate PHP installations, verify executable version and SAPI (FPM, Apache module, CGI), then patch using official PHP releases; as of 21 Oct 2026, PHP 8.5.12, 8.4.27, 8.3.36, 8.2.35 address critical CVE-2026-109618/109619. **No PHP changes are required inside Hoople lite.**

## Verification protocol

1. Review GitHub branch, diffs, secrets scan and new advisories before modifying anything.
2. Run frontend, backend and PostgreSQL tenant tests with restricted DB role. Test 401, 403, 409, cross-tenant visibility, wrong Origin, session expiry, OIDC state replay, role downgrade and malicious oversized JSON.
3. Inspect HTTP response headers with `curl -I`; verify TLS at the **deployed origin**, not just Fastify injection. Browser-test OIDC cookies and preview/share restrictions.
4. Require green CI and human security review before merging to `main`; deploy with monitoring, backup recovery and a rollback plan.

## Explicit limitations

This hardening pass updates dependencies and protective API headers; it does **not** encrypt browser `localStorage`, provision production OIDC/DB, add distributed rate limiting, implement GDPR/PDP workflows, or make `#play=` links private. Do not put sensitive user data in `localStorage` or public URL payloads.
