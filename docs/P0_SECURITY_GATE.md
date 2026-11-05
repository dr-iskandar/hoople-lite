# P0 Security Gate — cloud editor and public demo (3 November 2026)

This is a **code-level pre-production milestone**, not approval to store real participant data or publish paid events.

## What changed

1. Cloud drafts can be deliberately opened in the React editor by owners/admins/editors from the active workspace.
2. The editor marks cloud changes as **unsaved** and exposes **Save to cloud**. The new authenticated `PUT /v1/orgs/:oid/experiences/:eid/draft` validates the whole snapshot and writes editor settings and all mission records in one PostgreSQL transaction, with a strict `expectedRevision`. A stale version returns 409 without overwriting anyone's work. The original `questpop-*` local drafts remain intact. Cloud drafts are **in-memory only** and are excluded from the legacy localStorage serialization.
3. Browser demo links now use an explicit public presentation projection. The `#play=` payload has no quiz answer indices, private validation, QR codes, embedded images, auth tokens or cloud identifiers. Old URLs are sanitized when parsed; **an already distributed old URL cannot be made secret retrospectively**.
4. A shared demo accepts nonempty QR input / quiz selection only as a **simulation**, clearly labelled. Do not use it as trusted scoring, authentication, prizes or check-in.
5. CI includes real-PostgreSQL tenant isolation and regression tests; `apps/api/ops/staging-smoke.mjs` adds an optional non-mutating smoke check against a provisioned HTTPS staging origin.

## Deployment and staging gate — must be done by operator

- [ ] Merge the prerequisite security dependency/CI PR first. Use current supported patched Node LTS and lockfile, never production `npm install` without a reviewed lock.
- [ ] Provision **two distinct DNS origins** (studio and API) on HTTPS, a restricted PostgreSQL runtime role, independent migration account, secret manager, private DB network and encrypted backups. Run migration and grant scripts. Never copy credentials into frontend `VITE_*` variables.
- [ ] Configure OIDC provider allow-list, exact redirect `https://API_HOST/v1/auth/callback`, `WEB_ORIGIN=https://STUDIO_HOST`, secret key, `NODE_ENV=production` and secure cookies. Verify browser cookie persistence across your chosen same-site domains.
- [ ] Configure ingress-level rate limits for OIDC, sessions and mutations, WAF rules, safe logs, TLS redirect/HSTS and the allowed origin. Do not put the Vite dev server on the public internet.
- [ ] Execute `API_STAGING_URL=https://api.staging.example npm --prefix apps/api run security:staging`. This validates HTTPS headers, DB readiness, unauthenticated failures, wrong-origin rejection and OIDC redirect/cookie start. It cannot prove completed login or tenant isolation.
- [ ] Real-browser test: OIDC login and logout; session expiry and replay; denial of wrong `Origin`; create two distinct creators/orgs; verify A cannot read/write B's drafts. Test read-only membership and expired cookies.
- [ ] Real-editor test: import a legacy draft twice, edit in cloud, refresh/open it, simulate conflict with two browser tabs (one should receive 409), change workspaces, verify no cross-workspace update. Confirm local `questpop-*` values were not overwritten.
- [ ] Verify one creator image stays local and the server reports it omitted. Add secure media upload/quarantine/metadata stripping before releasing photo collection.
- [ ] Run restore rehearsal, dependency/OS scanning, secret scan, browser privacy audit and a human review of privacy notice, data retention/export/deletion and incident response.

## Unresolved blockers — DO NOT label production ready

- Auth and API exist in code but **no real OIDC/DB staging origin or credentials** were provided for this work; the script cannot be executed against a live environment in this PR.
- No authoritative public event URL, versioned publish, embargo enforcement, participant session, server-validated QR/quiz, scoring, reward claiming, payments or biometric/media pipeline exists.
- The offline/local prototype still uses `questpop-studio-v1` and historical local keys; do not enter actual PII or production validation secrets in this mode. The cloud editor can hold private mission validation **in memory for authenticated editors**, but an organizer's device may still expose it to local malware or an XSS; harden CSP at the frontend origin and avoid third-party scripts.
- The single snapshot save replaces draft mission rows atomically. Mission database UUIDs are regenerated; do not build external references to draft mission UUIDs until immutable publish versions exist. No production participant data must reference a mutable draft.
- Uploaded images are stripped from server snapshots until a private upload service is implemented.
- Staging tests and domain/backend setup require the operator's explicit choices and configuration, and cannot be represented as completed by green CI.

## Development habit

Read `AGENTS.md`, `README.md`, `docs/DEVELOPER_HANDOFF.md`, `docs/VIBE_CODING_WORKFLOW.md`, this document and the PR diff first. Keep one feature per branch and test ID/EN, mobile, negative cases, security boundaries and PostgreSQL RLS before review. Push to `dr-iskandar/hoople-lite` through a PR targeting `main`; do not merge or deploy without review.
