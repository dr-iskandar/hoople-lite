# Hoople lite v0.9 — React source

Hoople lite is a bilingual (Bahasa Indonesia / English) interactive experience builder for event organizers, brands and communities. This package contains the React/Vite source, bundled assets, product timeline and backend planning documents.

**Development status:** the experience editor and participant preview remain a browser-only demo. The dashboard has an **optional connection** to the Stage 1 API (`apps/api`), including creator sessions, organization workspaces, authenticated brand-kit / experience / mission draft CRUD, and an explicit one-way import of local drafts. HoPay **staging checkout initiation** is now available for test plan purchases behind creator sign-in, but unverified callbacks cannot activate plans. It requires separately configured PostgreSQL, OIDC, backend-only HoPay secrets and public HTTPS staging URLs; no deployed production service, cloud editor autosave, live event persistence, verified billing or participant engine exists yet.

**Source of truth:** [github.com/dr-iskandar/hoople-lite](https://github.com/dr-iskandar/hoople-lite). This is the public developer repository; the owner-private ChatGPT Sites preview is a separate deployment and is **not automatically updated** by GitHub pushes.

## Developer start here

1. Read [developer handoff](docs/DEVELOPER_HANDOFF.md) for the implementation, file map, risks and next work.
2. Read the [vibe coding playbook](docs/VIBE_CODING_WORKFLOW.md) for read-first, edit, test, branch, push and PR routine.
3. AI coding agents follow [AGENTS.md](AGENTS.md); human developers should use the same rules.
4. Before coding, inspect latest `main`, open PRs, `git status` and relevant component/model source.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm ci
npm test
npm run dev
```

Open the local URL shown by Vite. Build the static site with:

```bash
npm run build
npm run preview
```

### Backend foundation (separate process)

```bash
npm ci --prefix apps/api
npm run api:test
npm run api:build
npm run api:dev
```

See [`apps/api/README.md`](apps/api/README.md) for PostgreSQL setup, migration steps, endpoints and security limits. Database integration testing requires a PostgreSQL instance and is not part of the in-memory tests.

To offer creator login/workspace/import in the React dashboard, copy the **root** `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to the API origin (e.g. `http://localhost:4000`), then restart Vite. Configure `WEB_ORIGIN` to the exact Vite origin (typically `http://localhost:5173`) on the API, and provide PostgreSQL and OIDC credentials **only on the API side**. Without `VITE_API_BASE_URL`, browser demo mode works unchanged. API and web should share a site under production HTTPS so SameSite cookies work as expected; test cross-origin login and cookie behavior in staging.

`dist/` is a generated local build artifact (not committed to GitHub). No API keys are required for the browser-only demo.

## What is included

- Landing page and interactive **Product Timeline** covering Hoople lite, Event Platform, On-site Experience, Smart Event and Community OS.
- Creator dashboard, starter templates, interactive onboarding and tutorial.
- Hybrid experience editor, mission drag and drop, modal editing, multiple-choice quiz, points and rewards.
- QR/check-in/photo mission simulations, camera-use disclosure and participant preview.
- Reusable brand kits, desktop/mobile covers, crop tools, reward images and short reward terms.
- Scheduled event access preview, illustrative pricing, bilingual legal-policy drafts and AI wizard / JSON import.
- The official Hoople wordmark supplied by the project owner, with a separate small `lite` treatment.
- Optional creator session status, active workspace selection/creation and deliberate import of old `questpop-*` browser drafts into authenticated cloud drafts. The local drafts are **retained**.

## Current limitations

**This is a prototype, not a production event platform.** The interactive editor still reads/writes `localStorage`; importing copies data to authenticated API drafts but does **not** activate automatic cloud editing, public event URLs or authoritative launches. Base64 images are omitted from cloud copies pending a controlled upload service; local originals remain untouched. The AI wizard can create template-based drafts and import external AI-generated JSON; it does not call an LLM API. HoPay staging checkout **only initiates test transactions**; signed webhook verification, plan entitlements, production payment, secure QR verification, attendee user accounts, cloud media uploads, actual custom domains, ticketing, class booking, face recognition and automated event entry/exit are **not implemented**.

The `#play` demo URL contains a client-readable experience payload. Do not use this architecture for real attendee records, secrets, production payment flows, secure prize redemption or genuine event access control. See [HoPay staging integration](docs/HOPAY_STAGING_INTEGRATION.md) for checkout setup and restrictions, [backend architecture](docs/BACKEND_ARCHITECTURE.md) for recommended server enforcement, and [platform roadmap](docs/EVENT_PLATFORM_ROADMAP.md) for the next modules.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/main.jsx` | App shell, navigation and creator dashboard |
| `src/WorkspacePanel.jsx`, `src/cloudApi.js` | Opt-in creator session/workspace panel and one-way draft import |
| `src/Landing.jsx` | Landing page and interactive preview |
| `src/RoadmapTimeline.jsx` | Clickable, bilingual product timeline |
| `src/roadmap-timeline.css` | Timeline responsive styles |
| `src/Builder.jsx`, `src/MissionInspector.jsx` | Hybrid builder and missions |
| `src/Player.jsx` | Participant-facing browser prototype |
| `src/EventWizard.jsx`, `src/wizardEngine.js` | Guided event draft and JSON import |
| `src/data.js`, `src/i18n.jsx` | Local data model, templates and translations |
| `src/hoople-lite.css`, `hoople-wordmark.png` | Hoople lite visual identity |
| `docs/` | Backend blueprint and end-to-end platform roadmap |
| `AGENTS.md` | Persistent AI coding-agent guardrails and review checklist |
| `docs/DEVELOPER_HANDOFF.md` | How the project works and what to build next |
| `docs/VIBE_CODING_WORKFLOW.md` | Read/test/push/PR conventions for AI-assisted development |
| `.github/` | CI verification and pull request checklist |
| `apps/api/` | Creator identity/workspace and private draft CRUD API, database migrations and tests |

### Data migration note

Existing prototype browser storage deliberately keeps its historical `questpop-*` keys for compatibility. The dashboard can **copy** experience drafts from `questpop-studio-v1` into an active cloud workspace when API auth is configured. Import is idempotent per `(organization_id, legacy_draft_id)`; a second import skips the existing cloud draft instead of overwriting it. Browser drafts are not deleted or replaced. Images stored as `data:` URLs cannot yet be uploaded; the import omits them and indicates that they will need re-uploading later.

## Handoff

Develop the backend as a separate, authenticated service before launching paid or real-world events. Plan tenant isolation, consent, media moderation, idempotent payments, ticket validation, session booking, audit logs and an opt-in/non-biometric alternative to face recognition.

© 2026 Hoople lite. Product prototype.
