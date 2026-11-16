# GOVERN roadmap and resume guide

## How to resume in a new Claude session (copy and paste this)
> Continue developing GOVERN. Read `docs/ROADMAP.md` and `docs/PROGRESS.md` in the repo ItzUnik1/Govern (attach the repo with add_repo, working copy in /home/claude/govern-repo). Work through the first unchecked items in ROADMAP.md in order, up to the end of Stage 6. After each meaningful chunk: run `npx tsc --noEmit`, `npx tsx scripts/eventcheck.ts`, `scripts/polprobe.ts init`, the e2e script, then commit and push to main, wait for the GitHub Actions build, and tick the items off here and in PROGRESS.md. Never remove working features. Never claim an APK was tested on a phone unless the user says so.

Repo workflow rules: push with `git -c push.negotiate=true push origin main`; poll CI via the public GitHub API; commit messages become the in-app changelog, so write them for players; end commits with the two attribution lines from the system reminder. Never change `android/app/govern-debug.keystore` (updates only install over old builds if the signing key is unchanged).

## Stage 4: content and polish
- [x] Custom difficulty: 6 sliders (economy, stability, election, crisis, international pressure, starting conditions)
- [x] Batch 1 countries: France, Italy, Pakistan, Bangladesh, South Africa, New Zealand (14 total)
- [x] Party `rivals` rule so historic enemies never share a coalition
- [ ] Presidential multi-party engine (direct vote with runoff, congress coalitions) to unlock Brazil, Indonesia, Mexico, Nigeria, South Korea, Turkey (target 20 countries)
- [ ] Batch 2 countries on top of that engine (see above); Sri Lanka as an optional extra
- [ ] Country list: region grouping and search once there are more than 14
- [ ] 30+ new events, including country-specific chains for each new country
- [ ] Country-specific projects for each new country
- [ ] Balance pass: run `simtest` for every country, fix outliers (inflation, debt, unemployment, election win rates 45-90%)
- [ ] Performance pass on long games (60+ years), save size check
- [ ] Update docs/SIMULATION.md and README for Stages 2-4

## Realism pass (user priority: economy and budget first)
- [x] Realism audit tool (`scripts/audit.ts`)
- [x] Automatic stabilisers, ageing costs, primary balance and interest share on the budget screen
- [x] Shared eurozone interest rate, damped deficit-inflation channel
- [x] Sovereign debt crisis event (rescue, restructure, austerity, central-bank financing)
- [ ] Debt maturity structure (short vs long bonds, refinancing risk)
- [ ] Central bank: independence slider and inflation expectations
- [ ] Exchange-rate regimes (float, peg, euro) and a proper balance-of-payments crisis
- [ ] Wage-price dynamics and a clearer business cycle (recession/boom phases)
- [ ] Structural vs cyclical deficit and an output gap measure
- [ ] Tax realism: tax lags, avoidance, informal economy by development level
- [ ] Re-run `scripts/audit.ts` after each change and compare with real-world bands

## Stage 5: living world and scenarios
- [ ] AI nations that act on their own (alliances, trade wars, crises that start without you)
- [ ] Starting scenarios and historic starts (e.g. debt crisis, post-war rebuilding, new republic)
- [ ] Achievements list and a career summary screen
- [ ] Campaign mode with linked goals

## Stage 6: society and deeper politics
- [ ] Demographics (age structure, urbanisation, migration) feeding the economy and voting blocs
- [ ] Climate and environment (emissions, disasters, green policy trade-offs)
- [ ] Media and public opinion (scandals, spin, trust)
- [ ] Individual MPs and party factions (rebellions, whip management)
- [ ] Referendums and constitutional change
- [ ] Regional governments (provinces and states with their own politics)

## Later stages (not started)
- Stage 7: security and crises (military, border conflicts, intelligence, cyber, crisis chains)
- Stage 8: quality of life. DONE (batch 1): advisers page, statistics screen, first-run tutorial (replay from How it works), synthesised sound effects, dark/light/high-contrast themes. TODO: Nepali and Hindi translation (needs an i18n layer: nav, menu, settings, dashboard first), more tutorial hints in context
- Stage 9: final release (release-signed APK, full test pass, install guide)

## Known issues and simplifications
- Germany and New Zealand MMP treated as list PR; Australian preferences simplified
- Coalition asking prices are fixed; `sanction()` uses `Math.random`
- In-app updater download/install hand-off was not verified on a device when written
- Infrastructure minister does not yet affect project pace
- The update banner on the title screen floats over the country list
