# Hoople lite v0.9 — React source

Hoople lite is a bilingual (Bahasa Indonesia / English) interactive experience builder for event organizers, brands and communities. This package contains the React/Vite source, bundled assets, product timeline and backend planning documents.

**Development status:** the frontend remains a browser-only demo. A separate **Stage 1 API in progress** exists in [`apps/api`](apps/api/README.md), with OIDC/session routes, creator workspaces and PostgreSQL schemas for brand kits, experiences and missions. This is **not connected to React or a deployed production database/IdP**. No live event persistence, billing or participant data exists yet.

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

`dist/` is a generated local build artifact (not committed to GitHub). No API keys are required for this browser-only prototype.

## What is included

- Landing page and interactive **Product Timeline** covering Hoople lite, Event Platform, On-site Experience, Smart Event and Community OS.
- Creator dashboard, starter templates, interactive onboarding and tutorial.
- Hybrid experience editor, mission drag and drop, modal editing, multiple-choice quiz, points and rewards.
- QR/check-in/photo mission simulations, camera-use disclosure and participant preview.
- Reusable brand kits, desktop/mobile covers, crop tools, reward images and short reward terms.
- Scheduled event access preview, illustrative pricing, bilingual legal-policy drafts and AI wizard / JSON import.
- The official Hoople wordmark supplied by the project owner, with a separate small `lite` treatment.

## Current limitations

**This is a prototype, not a production event platform.** Creator records currently live in `localStorage`. The AI wizard can create template-based drafts and import external AI-generated JSON; it does not call an LLM API. Payment checkout, secure QR verification, user accounts, cloud media uploads, actual custom domains, ticketing, class booking, face recognition and automated event entry/exit are **not implemented**. P0 API health checks do not make these features operational.

The `#play` demo URL contains a client-readable experience payload. Do not use this architecture for real attendee records, secrets, payment flows, secure prize redemption or genuine event access control. See [backend architecture](docs/BACKEND_ARCHITECTURE.md) for recommended server enforcement, and [platform roadmap](docs/EVENT_PLATFORM_ROADMAP.md) for the next modules.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/main.jsx` | App shell, navigation and creator dashboard |
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
| `apps/api/` | Separate identity/workspace API, database schemas and tests (not yet connected to React) |

### Data migration note

Existing prototype browser storage deliberately keeps its historical `questpop-*` keys for compatibility with earlier versions. This does not affect the Hoople lite branding and prevents previous demo drafts from being lost during the rename.

## Handoff

Develop the backend as a separate, authenticated service before launching paid or real-world events. Plan tenant isolation, consent, media moderation, idempotent payments, ticket validation, session booking, audit logs and an opt-in/non-biometric alternative to face recognition.

© 2026 Hoople lite. Product prototype.
