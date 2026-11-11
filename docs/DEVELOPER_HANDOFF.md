# Developer handoff — Hoople lite

Last updated: 2 November 2026. Canonical source: `https://github.com/dr-iskandar/hoople-lite`.

## 1. Purpose and origin

Hoople lite lets Indonesian event organizers, agencies, brands and communities build browser-based interactive activities. The present application is a **React/Vite frontend prototype**, not an operating SaaS. The larger Hoople vision is an end-to-end event and community platform; no release dates are committed.

**P0 + Stage 1 private draft CRUD and HoPay staging checkout code:** `apps/api` contains Fastify/TypeScript health checks, creator OIDC code/PKCE + cookie sessions, organization/workspace CRUD, authenticated brand kit/experience/mission draft CRUD, legacy import, and PostgreSQL migrations for identities, organizations, audit, sessions, builder entities and staging checkout requests. RLS and role checks are enforced in code/policies. React dashboard offers **opt-in** session/workspace and one-way import if `VITE_API_BASE_URL` is set; the interactive editor is still localStorage-based. The pricing modal can initiate authenticated HoPay staging checkout; its unsigned callback intentionally cannot activate plans. See [`HOPAY_STAGING_INTEGRATION.md`](./HOPAY_STAGING_INTEGRATION.md). No real staging IdP or live production database has been configured.

This product evolved iteratively from a quest studio into a hybrid editor with branding, ID/EN, quest-style onboarding, mission types, rewards, simulated scheduling, AI-assisted draft templates and a five-stage roadmap. It was rebranded from QuestPop to Hoople lite with the owner's logo and purple/black/white identity. Historical `questpop-*` browser storage keys remain for backwards compatibility.

## 2. Read first

1. `README.md` — installation, user-visible features and demo limitations.
2. `AGENTS.md` and `docs/VIBE_CODING_WORKFLOW.md` — working rules for humans and AI agents.
3. `src/main.jsx` — app state, URL hash navigation, dashboard, project creation/edit/publish.
4. `src/data.js` — experience normalization, demo templates, local persistence and share serialization.
5. `src/Builder.jsx`, `src/MissionInspector.jsx`, `src/Player.jsx` — editor and participant journey.
6. `docs/BACKEND_ARCHITECTURE.md` — proposed server domains, APIs, privacy and controls.
7. `docs/EVENT_PLATFORM_ROADMAP.md` — planned Hoople platform expansion.

## 3. Stack and runtime today

| Area | Current implementation | Production direction |
| --- | --- | --- |
| UI | React 19, Vite 6, CSS, lucide-react | Retain bilingual and mobile-first UX |
| Storage | Editor: `localStorage` (`questpop-studio-v1`); optional one-way draft cloud import | Authenticated cloud editor autosave, conflict handling and tenant isolation |
| Navigation | URL hash (`#studio`, `#play=`) | Proper routing + opaque public event URLs |
| Missions | Client-side CRUD / drag order; authenticated private API draft CRUD is available | Cloud-bound builder and immutable published versions |
| Points and rewards | Browser demo | Server validation, ledger, stock locking |
| QR and camera | Browser API and first-use disclosure | Server-issued QR tokens + moderated media |
| Quiz | Multiple-choice answers in client | Server-held answer keys and rate limiting |
| Branding | Local colors, uploads and cover crop | Brand kits + asset pipeline / CDN |
| Scheduling | Browser countdown / UI gate | Server-enforced release access gate |
| AI | Local templates and external JSON import | Server LLM adapter, moderation, quota |
| Pricing | Illustrative sub-Rp100k tiers, staging-only one-off checkout initiation | Webhook verification, plans/entitlements, real billing/refunds after legal and ops review |

**Security warning:** Current `#play=` links embed client-readable event JSON. They cannot protect correct quiz answers, mission secrets, prizes, event embargoes or sensitive attendee data. Do not reuse this design for real-world access control, paid events or regulated data.

## 4. Source map

| Files | Responsibility |
| --- | --- |
| `src/main.jsx`, `src/data.js` | App shell, routes, storage, experience models |
| `src/WorkspacePanel.jsx`, `src/cloudApi.js`, `src/workspace-cloud.css` | Opt-in creator session, active workspace, create workspace, and deliberate one-way browser draft copy |
| `src/Builder.jsx`, `src/MissionInspector.jsx`, `src/mission-modal.css` | Hybrid builder, mission drag/drop, create/edit modal |
| `src/RewardInspector.jsx`, `src/reward-schedule.css` | Reward image, points/conditions and short terms |
| `src/BrandingInspector.jsx`, `src/brand.css` | Branding, assets, desktop/mobile crop |
| `src/PublishInspector.jsx`, `src/PublishSchedule.jsx`, `src/release.js` | Publish schedule, timezone helper, demo gate |
| `src/Player.jsx` | Participant passport/hunt/quiz, QR/photo/camera permissions |
| `src/EventWizard.jsx`, `src/wizardEngine.js` | Guided Q&A draft generation and AI JSON import |
| `src/i18n.jsx`, `src/questCopy.js` | ID/EN content; check both locales |
| `src/Landing.jsx`, `src/RoadmapTimeline.jsx`, `src/Pricing.jsx` | Marketing, product timeline, hypothetical pricing |
| `src/LegalDialog.jsx` | Draft legal, privacy, camera, refund copy; needs legal review |
| `src/hoople-lite.css`, `hoople-wordmark.png`, `hoople-favicon.svg` | Hoople identity assets |
| `tests/` | Pure-logic regression tests with Node built-in test runner |
| `apps/api/` | Fastify TypeScript auth/workspace/draft CRUD service, SQL migrations, backend integration tests |

Styling lives in component CSS plus inherited global styles. Check cascade, focus/keyboard behavior, mobile layout and both languages before delivery. Not every text string is centralized in `i18n.jsx`.

## 5. Next development backlog (suggested priorities)

### P0 — Foundation

- A separate `apps/api` folder has been introduced without moving the React app; decide whether to retain this layout or formally migrate to a monorepo with `apps/web`.
- Current implementation: health/readiness, OIDC sessions, organization CRUD and active workspace, creator draft CRUD and one-way import, identity + builder migrations with RLS, CI Postgres test and runtime grant script.
- Next: merge only after CI/PostgreSQL review, create staging with separately provisioned DB runtime/migrator roles and a real OIDC provider, then do interactive end-to-end login and cookie/CORS security tests. Audit migration/RLS semantics before any real customers.
- Add component and end-to-end tests, formatting/lint/type checks and monitoring.
- Obtain legal/product decisions on pricing, privacy, refund ownership and support identity.

### P1 — Make Hoople lite authoritative

- Wire the **interactive builder** to server-side draft CRUD (currently API + dashboard import only), with optimistic conflict UX and a safe read-before-write migration strategy. Keep `questpop-*` keys intact.
- Add asset upload endpoints and moderation for local photos/brand covers omitted from import; never embed media blobs into arbitrary JSON.
- Implement server-side verification for check-in, QR, photo evidence and quiz; prevent answer/QR secret leaks.
- Add point ledger, idempotent mission completions, atomic reward inventory/claim and audit trail.
- Move media to private upload/quarantine, moderation, EXIF stripping, retention and user deletion.
- Enforce scheduled publishing by UTC + IANA timezone on **every** server endpoint; never rely on browser clock or countdown.
- Introduce safe server-driven LLM text generation with schema validation, quota and usage-cost tracking.

### P2 — Event platform (next Hoople product)

- Parent Event, organizer workspaces, landing page builder, events, ticket tiers, inventory, registration and class/session booking.
- HoPay/Midtrans verified-status inquiry or signed webhook contract, receipts, reconciliation, entitlement activation and refunds. Staging checkout initiation alone is not billing.
- Crew-scoped QR ticket/session check-in/out, operational dashboard and exports.
- Managed subdomains and custom domain DNS/TLS verification.

### P3+ — On-site, smart and community

- Photobooth with consented media processing, safe sharing and deletion policy.
- Optional face recognition only after privacy/legal review; a non-biometric option must always be available.
- Community CRM, loyalty, memberships, communications and repeat-engagement insights.

Start with a secure thin vertical slice: **one organizer → one event → one passport → one participant → validated points → one reward**. Pilot reliability before broadening features.

## 6. Definition of done

- Acceptance criteria and demo-vs-production distinction documented.
- `npm ci`, `npm test`, `npm run build`, `git diff --check` pass; mobile/desktop smoke tests for UI.
- Both ID and EN reviewed; keyboard/touch and denied camera access considered.
- No credentials, attendee data, `dist` or `node_modules` committed.
- Risks covered for tenant auth, public data, payments, media and biometric consent as applicable.
- Docs and the feature-status statements remain accurate. PR includes UI evidence and review decision.

## 7. Unresolved product decisions

1. Monthly pricing vs per-event and AI/participant quotas; payment and tax obligations.
2. Creator/attendee authentication, children's consent and media retention/deletion.
3. Merchant of record, refund dispute and customer support responsibilities.
4. QR anti-reuse policy, reward redemption, trusted crew devices and domain hosting.
5. Hoople lite as independent deployment vs Experience module inside Hoople Event.

These are unresolved choices, not approvals to process payments, biometrics or sensitive data.
