# GOVERN – how the simulation works (Stage 1)

All code lives in `src/engine/` (pure TypeScript, no UI). One turn = one month. Numbers below are the
actual formulas; tune them in `src/engine/sim.ts`.

## Data assumptions (`countries.ts`)
Approximate circa-2024/25 figures, rounded: GDP (USD bn), population, debt/GDP, deficit/GDP, revenue/GDP,
tax rates (headline/average), spending shares, inflation/unemployment, policy rates. Fictional timeline starts
Jan 2026; first election dates are invented. "Administration" spending is the *residual* that makes the starting
deficit match. Quality indexes (education, health, infrastructure, security, efficiency; 0-100) are judgement
calls scaled to development level. Constitutions are summarised, not modelled in full yet (Stage 2).
Country-specific mechanics: Nepal (remittances, hydropower ×1.5 infrastructure returns, aid, disaster risk, fragile
coalitions), India (fuel imports, catch-up growth), UK (anti-incumbent mood, high debt), USA (reserve currency,
polarisation, 2-term limit with successor, shutdown event), Germany (debt-brake/EU 3% deficit cap, ageing, industry),
Japan (235% debt held domestically, shrinking population, disasters), Canada/Australia (commodity exports, housing,
Australia's 3-year terms).

## Monthly order
1. Policy-change checks (tax announcement effects, VAT price effect, policy-churn penalty).
2. Fiscal position → debt.
3. External world (commodity price, global cycle) random walks.
4. Growth, inflation, unemployment, central bank rate, borrowing cost, currency, confidence.
5. Public-service quality stocks drift toward targets set by spending.
6. Approval, stability.
7. Calendar, modifiers expire; report is written.
8. Party-ouster check, then election OR a random/conditional event.

## Revenue
`tax_i = rev0 × share_i × (rate/rate0) × evasion(rate/rate0) × cycle`; `evasion(x)=1` for x≤1 else `max(0.35, 1-0.35(x-1))`
(Laffer-style: revenue peaks at ~1.9× the starting rate). Cycle = `1 − 0.025 × (unemployment − start)`.
Other revenue scales with commodity prices for exporters. Event modifiers add/subtract % of GDP.

## Spending → quality (slow, with diminishing returns)
`target = base + 45 × (0.55 + efficiency/100) × ln(spend/spend0)`; gains scaled by `(100−base)/50` (diminishing near the top),
losses by `base/50`. Quality moves 1.2-2%/month toward its target (infrastructure/education slowest ≈ 5-year half-life).
Efficiency (from administration spend + anti-corruption) multiplies every other gain.

## Growth (annualised, smoothed 65/35)
`potential + productivity + fiscal impulse − overhang − tax drag + 0.02(confidence−50) + stability effect − rate drag +
openness × global cycle + commodity effect + currency effect + modifiers + noise`
- productivity = Σ coefficient × (quality − starting quality) × catch-up multiplier
- fiscal impulse = `0.28 × (deficit − 24-month average deficit)`, capped ±1.5 and reduced when debt >100% (only *new* deficits boost growth)
- overhang = `0.012 × (debt% − max(100, start debt%))`
- tax drag per pp above start: income 0.035, corporate 0.05, VAT 0.03 (cuts help 60% as much)

## Inflation
`π += 0.06(target−π) + pressure/12 + noise`, pressure = `0.25(growth−potential) + 0.18×max(0,deficit−3) + fuel-import share ×
0.012×(commodity−100) + 0.02×openness×(100−currency) − 0.15×(rate − rate at start) + modifiers`.
Central bank (not controlled by you) follows `rate = neutral + 1.2(π−target) + 0.3(growth−potential)`, moving 12%/month toward it.

## Unemployment
`u += 0.05(u0 + shifts − u) − 0.4 × (growth − potential)/12` (Okun-style).

## Debt & interest
Deficit adds to debt. Average cost of debt drifts (1.2%/month, ~7-year refinancing) toward `start cost + (market rate − start market rate)`.
Market rate = policy rate + premium (grows with debt above 60%, steeper above 120%, softened by `debtTolerance`: reserve currency or domestic savers; plus instability premium).

## Currency, confidence
Currency drifts toward a "fair" level lowered by inflation, debt, instability and raised by higher rates and stronger growth.
Confidence target = `50 + 0.45(stability−start) − corp-tax change − debt risk − inflation uncertainty + infrastructure + modifiers`.

## Approval (all relative to your starting position)
`target = approval0 + 1.6×(growth−potential) − 1.4×(unemployment−start) − Δ(inflation penalty) + service quality (health 0.10, education 0.07,
infrastructure 0.05, security 0.04 per point) + 1.5×(welfare spend change) − tax rises (income 0.45, VAT 0.7, corp 0.12 per pp; cuts 70% as much) + 0.15×(living standards−100) − tenure fatigue (max 8) + modifiers`.
Approval moves 10%/month toward target. Tax rises also cause an immediate announcement hit.
## Stability
Target = `stability0 + 0.28×(approval−approval0) − inflation/unemployment/recession stress + security + efficiency + modifiers` (moves 10%/month).

## Elections (Stage 1 simplified; replaced by a party/seat model in Stage 2)
`vote share = 10 + 0.78×approval + 0.05×(stability−50) + N(0,3.5)`. Bar = share you'd get at your starting approval − 1.5, +1.2 per election already won,
+8 per +1.0 of election-difficulty above standard. Lose → career ends (Stage 2: opposition). Term-limited countries (USA): your successor stands.
You can also be ousted by your own party if approval<18% and stability<30 for three months.

## Events
~35 events, each with a context-sensitive weight (e.g. energy spike only when commodity prices are high; inflation crisis when inflation is 3.5pp over target;
housing bust follows ignored bubbles). Monthly chance `1−exp(−0.05×Σweights×crisis setting)`. Choices apply instant effects, policy changes,
one-off costs (% of GDP) and timed *modifiers* (shown under History → Active effects). Adverse modifiers scale with economic-volatility setting.

## Balance targets (verified by `npm run test:sim`, `scripts/botprobe.ts`)
Idle play loses early elections; a competent budget-balancing bot wins ~80-87% of elections and survives 20 years ~40-50% of the time on Standard.
