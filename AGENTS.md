# Hoople lite — Instructions for AI coding agents

This instruction file is for Codex, Claude Code, Cursor, Gemini and other AI-assisted developers. Follow the same rules as human contributors.

## Read first, every task

1. `README.md` — product scope, setup, what works and what is demo-only.
2. `docs/DEVELOPER_HANDOFF.md` — architecture, file map, known risks and next backlog.
3. `docs/VIBE_CODING_WORKFLOW.md` — branch, review, tests, security and handoff.
4. `docs/BACKEND_ARCHITECTURE.md` and `docs/EVENT_PLATFORM_ROADMAP.md` if touching a future server feature.
5. The exact React components and connected data/model files. Inspect `git status`, active branch and the diff before edits.

## Repository and deployment

- Canonical source repository: `https://github.com/dr-iskandar/hoople-lite`.
- Default branch: `main`. Create `feat/*`, `fix/*` or `docs/*` branches and open a PR. Never force-push or automatically merge without human approval.
- The repository is public: do not commit credentials, real attendee information, payment tokens, private event media or `.env` files.
- A separate owner-private preview exists on ChatGPT Sites. A GitHub push does **not** update that site automatically; coordinate publication separately.

## Product constraints

- Name: **Hoople lite**, not the old QuestPop brand. Preserve the official wordmark and small `lite` treatment. UI palette: purple, black and white.
- Bahasa Indonesia and English both need complete natural UI copy. Check both after every user-facing change.
- Design playful, modern, mobile-first and accessible, without decorative star/lightning “AI slop” motifs.
- Preserve passport, treasure hunt and multiple-choice quiz. Missions: check-in, photo and QR scan; points, rewards, image/short terms, reordering and edit modals.
- The five-stage timeline is a **roadmap**. Never present unfinished ticketing, checkout, classes, photobooth, biometrics or Community OS as live features.
- Camera/photo flows need purpose disclosures; future face recognition requires legal/privacy review, consent and a non-biometric alternative.
- Never put quiz answer keys, trusted QR secrets, real PII, access-control decisions or payments in public client payloads.

## Workflow on every change

1. State scope and acceptance criteria. Identify affected components, data and side effects.
2. Work only within the requested scope. Preserve unrelated edits and existing demo compatibility.
3. Prefer the smallest patch. Do not silently rewrite architecture or install dependencies.
4. Run `npm ci`, `npm test`, `npm run build`, and `git diff --check`. For API changes also run `npm ci --prefix apps/api`, `npm run api:test`, `npm run api:build`. Visually verify desktop and mobile for UI changes.
5. Smoke-test relevant onboarding, editor, mission modal/reorder, rewards, branded preview, ID/EN, scheduled launch and legal/camera notices.
6. Report files changed, verification results, limitations, security implications and TODOs.
7. Commit to a feature branch, push to `origin`, open a PR to `main`; merge only after checks and human review.

## Non-negotiable security / truthfulness

- The default editor is a `localStorage` prototype; AI wizard uses local templates/JSON import. The dashboard offers **opt-in** API session/workspace, one-way import and explicit in-memory cloud draft editing/saving (with expected revision) when `VITE_API_BASE_URL` is configured. `apps/api` includes Stage 1 OIDC/session/workspace and authenticated draft CRUD, but has **no provisioned production infrastructure or browser-to-server autosave**. **No operational event backend, payment gateway, attendee account system, server-authoritative QR or secure scheduled embargo exists.**
- Importing to a cloud draft must never delete, overwrite, or silently replace `questpop-*` local data. Private validation material must never enter public responses. Do not infer deployment readiness from scaffold code.
- A working prototype button is not evidence of production readiness. Clearly identify simulations.
- Do not delete historical `questpop-*` browser storage keys without a tested migration plan.
- Add tests for logic changes. Reproduce bugs before fixing. Never claim tests passed unless executed.
- Update docs if data shapes, behavior, limitations or technical decisions change.

## P0 cloud-data gate (3 November 2026)

- Read `docs/P0_SECURITY_GATE.md` before changing cloud editor persistence, share links or staging controls.
- The cloud editor must never be serialized into `questpop-*` localStorage. Save only after deliberate user action; use `expectedRevision` and surface 409 without overwriting local edits.
- `#play=` is public presentation-only. Never add secret mission validation, PII, images, QR tokens or private cloud identifiers to its payload; quiz/QR shared playback is a visibly marked simulation.
- Browser + staging IdP tests remain required before processing real users. Green CI alone is not a production approval.
