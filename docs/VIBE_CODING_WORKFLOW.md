# Vibe coding playbook — Hoople lite

For developers working with Codex, Cursor, Claude Code, Gemini or other AI coding assistants. AI can propose and implement; the developer owns requirements, test evidence, security, code review and releases.

## A. First 5–10 minutes of every session

1. Open `https://github.com/dr-iskandar/hoople-lite` and inspect `main`, latest PRs, open issues and CI status.
2. Run `git fetch origin` and `git status` locally; check current branch and uncommitted edits. **Do not overwrite someone else's changes.**
3. Read `README.md`, `AGENTS.md`, `docs/DEVELOPER_HANDOFF.md`; consult roadmap/backend docs for features touching server or future architecture.
4. Read the exact components, model/translation files and tests relevant to the request. Reproduce the existing behavior before changing it.
5. Define expected result, negative cases, and whether the feature is currently demo-only or production-backed. Identify user data, camera, payment and authorization risks early.

## B. Give AI a small, testable assignment

One feature or bug per prompt. Template:

> Read `AGENTS.md`, `README.md`, `docs/DEVELOPER_HANDOFF.md` and relevant code first. Task: **[specific problem]**. Acceptance criteria: **[observable outcomes]**. Do not edit unrelated files, change architecture or claim backend functionality. Preserve ID/EN and mobile UX. Write regression tests. Run `npm test`, `npm run build` and `git diff --check`. Show the diff, verification, risks, screenshots and next steps. Do not push or merge until I confirm.

If multiple modules are involved, ask AI for a short design/implementation outline and approve it before implementation. Avoid “fix everything” and unexplained broad refactors.

## C. Implementation loop

1. Start from updated `main` and create branch `feat/<topic>`, `fix/<topic>` or `docs/<topic>`.
2. Make small changes at a clear component/data boundary; add/update tests at the same time.
3. Consider empty data, broken JSON, duplicate clicks, denied camera permissions, weak network, different timezone and narrow mobile screens.
4. When editing the model, preserve `questpop-*` browser keys until a migration and regression plan exists.
5. For backend integrations, move all trust decisions server-side: answer keys, QR validation, points, ticket status, checkout pricing and scheduled publishing.
6. Keep product copy honest: prototype interactions are not evidence of production readiness.

## D. Verification before commit

Run:

```bash
npm ci
npm test
npm run build
git diff --check
git status --short
```

Manual smoke test relevant flows and note evidence:

- Desktop + small mobile, keyboard focus, touch, Bahasa Indonesia + English.
- Onboarding → create experience → add/edit mission modal → reorder → save → reload → preview.
- Passport check-in, QR scan, photo camera allowed/denied, quiz score, rewards.
- Logo/cover desktop and mobile crop, reward image and short S&K.
- Schedule WIB/WITA/WIT, pre-launch vs launched demo limitations.
- AI wizard local draft and imported JSON validation.
- Landing timeline + pricing and legal disclaimers.

For auth, payment, media or biometric changes, add security, idempotency, privacy/consent and abuse cases; a successful build alone is insufficient.

## E. Commit → push → PR → release

1. Read `git diff` and review **every changed file**. Check for secrets, PII, console debug, stale copy, large media and generated output.
2. `git add` only intended files; commit with a meaningful message like `feat(builder): add reward short terms`.
3. `git push -u origin feat/<topic>` to `dr-iskandar/hoople-lite` — **GitHub is the source of truth**, not ChatGPT Sites.
4. Open PR targeting `dr-iskandar/hoople-lite:main` with `.github/PULL_REQUEST_TEMPLATE.md`, screenshots for UI and test evidence.
5. Wait for GitHub Actions and human review. Fix on the feature branch; merge only after approval.
6. Coordinate separate preview/production deployment. Verify deployed behavior and maintain a recoverable release/rollback path.

Do not force-push, overwrite `main`, ignore failing checks, auto-merge or publish a not-yet-built feature as live.

## F. Close the session with a handoff

Report:

- **Changed:** exact behavior/files, branch/PR link.
- **Evidence:** commands and manual tests actually run, results/screenshots.
- **Not included:** demo-only logic, missing backend integrations, known bugs.
- **Risks:** security, data migration, compatibility, release/rollback.
- **Next:** one to three scoped actions, responsible owner and decisions needed.

For incomplete tasks, leave a draft PR or explicit WIP note; do not silently commit unverified work to `main`.
