# Hoople lite quest-map onboarding — design QA (WIP)

- Source visual truth: user-supplied image `Hoople Lite quest map onboarding(1).png` (979 × 1639 px, provided in the task; not committed publicly).
- Implementation: `src/Onboarding.jsx`, `src/onboarding-map.css`, `public/onboarding-art/*.png`.
- Intended viewport/state: 979 × 1639 px, step 01 (Format), Treasure Hunt selected; responsive checks also required at 390 px and desktop.
- Implementation screenshot: **not captured**.
- Browser evidence: **not available**. This task's filesystem is read-only; remote GitHub changes could be committed, but a local checked-out build and browser-rendered screenshot were not possible.
- Static checks: JSX transformed using project-installed esbuild `loader: jsx` successfully; CSS transformed with `loader: css` without warnings. This is not a substitute for `npm run build` or browser QA.

## Required fidelity surfaces

- Typography: design uses a bold, tight editorial display hierarchy; implementation uses existing Space Grotesk and DM Sans. Exact rendered sizes/line wraps still need screenshot comparison.
- Spacing/layout: sidebar, progress bar, three cards, and footer implemented. Actual viewport comparison remains pending.
- Colors/tokens: lavender background, ink copy, purple selected card, coral orange progress motif. Browser sampling pending.
- Image quality: four new transparent watercolor PNGs generated for ticket, map, quiz, and landscape. Browser cropping and display quality pending.
- Copy: Indonesian reference is implemented, with English alternatives. Live ID/EN visual review pending.

## Outstanding verification before merge

1. Open the onboarding from Studio in a browser; capture step 01 at 979 × 1639 px with Treasure Hunt selected and compare beside the uploaded reference.
2. Test selecting all three types, Next/Back and completing all four steps; ensure a draft is created and opened in Builder.
3. Verify narrow mobile (390 px) and desktop, ID/EN, keyboard focus, no horizontal overflow, console errors and asset requests.
4. Run repository `npm ci`, `npm test`, `npm run build`, `git diff --check` and note GitHub Actions results.
5. Fix P0/P1/P2 mismatches and attach a new browser capture before changing this result.

**Full-view comparison evidence:** unavailable.
**Focused-region comparison evidence:** unavailable.
**Finding:** [P1] Missing browser-rendered implementation screenshot and same-state design comparison.
**Follow-up polish:** validate card illustration scale/position and decorative landscape crop on shorter desktop screens.
**final result: blocked**
