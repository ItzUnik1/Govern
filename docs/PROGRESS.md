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
- Stage 2 was added after this update (see below).


## Stage 2: Political simulation (done, debug APK; not device-tested)
- Engine: `politics.ts` (vote shares, regions, seat allocation for FPTP / PR (D'Hondt) / mixed / preferential / US electoral college + midterms, government formation, coalition satisfaction, confidence & no-confidence, ministers), `laws.ts` (15 bills, 8 manifesto promises), `polactions.ts` (player actions), `parties.ts` (fictional parties, regions, systems for the 8 countries).
- Game: choose one of two parties at start; seat-based elections; hung parliaments open coalition talks (partners ask for ministries); lose power -> you lead the opposition (government AI drifts policy, events auto-resolve, you campaign and attack); two straight defeats end your career; term limits and successors as in Stage 1.
- Parliament: bills need a majority (whip count, lobbying), budget changes can be blocked when you lack a majority, confidence votes, snap elections, coalition ultimatums, minister scandals, leadership rebellions.
- Cabinet: 8 ministries; competence affects stock growth, project speed, confidence, stability, jobs; reputation vs hidden performance; partner-held ministries.
- Politics tab: Parliament / Laws / Cabinet (or Opposition) / Parties / Elections / Legacy.
- Incumbent bonus is calibrated per country and party at game start so the opening position is a ~70% favourite. Probe (`scripts/polprobe.ts good`): a campaigning bot wins ~45-90% of elections depending on country/party.
- Known limitations: Germany MMP is modelled as list PR; Australia preferences are simplified; ministers' effects are modest; coalition negotiation has fixed asking prices; no individual MPs.


## Stage 3: Diplomacy, trade and research (done; debug APK, not device-tested)
- `diplomacy.ts`: 12-13 nations per country with relations (drift back to a natural level unless supported), trade agreements (negotiation takes 8-12 months; success depends on relations), defence partnerships (rivals of your ally cool), sanctions both ways, aid given/requested, organisations (WTO, IMF, regional blocs, security pacts; join/leave), IMF / World Bank / Chinese loans with conditions and repayment, influence score.
- Trade effects feed the Stage-1 economy model (exports, imports, FDI, confidence, stability) as deviations from the starting position, so starting balance is unchanged.
- `research.ts`: R&D budget (0-3% of GDP; 0.3% baseline is free), 15 technologies in 5 branches, one at a time plus a queue, speed rises with education quality; breakthroughs add permanent growth/sector/service effects.
- New events: border incident, trade war, sanctions threat, summit invitation, distant war.
- UI: new World tab (Relations / Organisations / Loans & aid); Build tab now has Projects and Research; nav has 7 tabs.
- Save version 3 (old saves migrate).
- Known limitations: nations are generic blocs (no AI diplomacy between them); relations are one number per nation; no military conflict; loans' interest is modelled as budget payments.

## Navigation + logo update (after Stage 3)
- Bottom bar is now 5 tabs: Home, Economy, Govern, World, Menu. The Menu hub has grouped cards (Politics: Parliament/Laws/Cabinet/Parties/Elections/Legacy; Development: Projects/Research; Records: History/Briefing; Game: Save-Load/Settings/Help) and a Pinned row (star toggle, stored in localStorage `govern.pins`). Menu pages show a "‹ Menu" back link; Android back goes page -> Menu -> Home.
- `go(tab, sub)` in ctx opens a specific segment (Politics segment, Build mode, More page).
- App icon / title logo generated from the supplied artwork (legacy, round, adaptive icons; `public/logo.png`).
- Real party names now used for all 8 countries (positions and shares remain approximations; leaders are generated people).
- Event-created projects (foreign factory, landmark project, PPP, tech hub) are real `ProjectState` entries (`custom` field) that occupy construction slots. Foreign-financed ones cost the state little or nothing.
- In opposition, starting/pausing/cancelling projects, research budget/techs and all diplomacy actions are refused (engine guard + disabled UI with a lock notice).

## In-app updater (build 12)
- `src/update.ts` checks `api.github.com/repos/ItzUnik1/Govern/releases/latest` (on launch after 2.5 s, at most every 6 h, or manually in Menu > Settings). Newer = release tag `build-N` with N > `__BUILD__` (injected by vite from `GOVERN_BUILD`; 0 in dev).
- Native Capacitor plugin `ApkUpdaterPlugin.java` (registered in MainActivity) downloads the APK to cache/updates and launches the Android installer through the FileProvider. Needs the REQUEST_INSTALL_PACKAGES permission; if the user has not allowed installs from GOVERN, the plugin opens that settings page.
- Updates install over the old app only because every build uses the same committed debug keystore. Never change it.
- Failures (offline, API errors) are silent on the automatic check. The release body (commit message) is shown as the changelog.
- NOT yet verified on a real device: download and installer hand-off.
