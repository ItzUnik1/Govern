# GOVERN – development progress (read this first in a new Claude session)

**Rule:** all stages build on this one project. Never remove working features. Test before moving on.

## Status: STAGE 1 – code complete and tested locally; APK build NOT yet run

### Done (Stage 1)
- React + TypeScript + Vite mobile-first UI; Capacitor 8 Android project in `android/` (portrait, back button handled)
- 8 countries: Nepal, India, UK, USA, Germany, Japan, Canada, Australia – differing constitutions, terms, mechanics
- Engine: revenue/tax, 6 spending areas with slow quality effects, growth, inflation, unemployment, central bank, debt/interest, currency, confidence, approval, stability, legacy score
- Standing policies (5), one-off actions (4), ~35 context-sensitive events with lasting modifiers
- Simplified approval-based elections, term limits (USA successor), ousting, game over screen
- Custom difficulty (presets + 4 sliders), 5 save slots + autosave (overwrite, load, delete with confirmation), history/reports, 6-section help
- GitHub Actions workflow `.github/workflows/build-apk.yml` (debug APK → GitHub Release)

### Tested here
- `npx tsc --noEmit`, `npm run build` pass
- Headless sim: 8 countries × 5 strategies × 6 seeds × 20 years, no NaN; balance probes (`scripts/*.ts`)
- Browser E2E (`scripts/e2e.cjs`, Playwright, 390×800): title → select → play 60 months with events/election → save/reload/load/delete; zero console errors

### NOT verified (be honest)
- The APK has **not** been built or installed (sandbox cannot reach Google/Gradle servers). First real build is on GitHub Actions; fix any Gradle errors from its log.
- Never run on a real Android device/WebView. Debug APK only (debug-signed). Release signing is Stage 5.
- Offline behaviour is by design (no network calls, no web fonts) but not device-tested.

### Known issues / limits
- Elections are approval-driven (no parties/seats/coalitions yet)
- No parliament, ministers, diplomacy, development projects (Stages 2-3)
- Only 8 countries (target 15-20 in Stage 4)
- Default Capacitor launcher icon/splash
- Saves are localStorage (cleared if the app is uninstalled)

## Next: STAGE 2 – political simulation
Parties & seat distribution per country system; parliament with law proposals/votes; coalition formation; confidence/no-confidence; opposition mode (return to power);
ministers (competence, appointments, resignations, recommendations); campaign system with regional results. Integrate with existing approval/stability/events.
Then Stage 3 (diplomacy, trade, projects/research), Stage 4 (content/balance), Stage 5 (signed release APK).

## Where things are
`src/engine/` types, countries, sim (monthly step, elections, legacy), events, programs, save · `src/ui/` screens · `scripts/` tests · `docs/SIMULATION.md` formulas
