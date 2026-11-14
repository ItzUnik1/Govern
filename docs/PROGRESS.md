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


## Update: Economy dashboard, National Projects, typography (before Stage 2)
- **Economy** screen now has Indicators / Trade / Sectors / People / Trends / Public finances.
  - Trade: exports, imports, trade balance, current account, FDI, remittances & aid, FX reserves (months of imports).
  - Sectors: agriculture, manufacturing, services, tourism, technology, energy, construction (share of GDP and growth).
  - People: GDP per person, real income index, HDI estimate, Gini, price level, debt per person, service quality.
  - New trend charts: GDP/person, exports, imports, trade balance, FDI, reserves, inequality, HDI.
- **Build** tab: 20 generic + 2 country-specific large projects (cost % of GDP, 3-8 year build, delays/overruns driven by state efficiency, pause/resume/cancel, capacity slots, completion effects, upkeep). Overview shows project progress.
- New engine files: `econdata.ts`, `economy.ts`, `projects.ts`; `GameState.eco` and `GameState.projects` (old saves are migrated).
- Typography: bundled Inter + Fraunces fonts, rem scale, Settings > text size (Small/Default/Large), typographic apostrophes and real minus signs.
- Verified: typecheck, headless sims (`scripts/simtest.ts`, `scripts/ecoprobe.ts`), Playwright E2E at phone size. Debug APK via CI; not tested on a real device.
- **Stage 2 (parties, parliament, coalitions, ministers) is NOT started yet** - design is in this file's notes and `src/engine/parties.ts` (data only).
