// GOVERN simulation engine. Pure TypeScript, no UI/DOM dependencies (runs headless in Node for tests).
// See docs/SIMULATION.md for the formulas explained in plain language.
import { startEventProject } from './projects';
import { initEco, stepEco, ecoMetrics } from './economy';
import { projectCostPct, stepProjects } from './projects';
import { initAI, stepRivalAI } from './rivalai';
import { initNews, stepNews } from './news';
import { influence, initDiplo, orgCostPct, stepDiplomacy } from './diplomacy';
import { initResearch, researchCostPct, stepResearch } from './research';
import { confirmFormation, declineFormation, fallOfGovernment, govSeatShare, initPolitics, isPresidential, ministerBonus, ministerMult, monthlyPolitics, ncRisk, oppositionDrift, pdef, runElection, settleGovernment, sysOf } from './politics';
import { COUNTRIES, administration0 } from './countries';
import { ACTIONS, PROGRAMS } from './programs';
import { availableChoices, drawEvent, getEvent, type Fx } from './events';
import type {
  CountryDef, Difficulty, ElectionRecord, Fiscal, GameState, HistoryPoint, Modifier,
  MonthReport, ReportDelta, SpendKey, StockKey, TaxKey,
} from './types';

export const SAVE_VERSION = 3;
export const START_YEAR = 2026;
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const DIFFICULTY_PRESETS: Record<'relaxed' | 'standard' | 'hard', Difficulty> = {
  relaxed: { preset: 'relaxed', economy: 0.7, stability: 0.7, election: 0.7, crisis: 0.7, pressure: 0.7, start: 0.8 },
  standard: { preset: 'standard', economy: 1, stability: 1, election: 1, crisis: 1, pressure: 1, start: 1 },
  hard: { preset: 'hard', economy: 1.3, stability: 1.3, election: 1.3, crisis: 1.4, pressure: 1.3, start: 1.2 },
};

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const round = (x: number, d = 1) => { const f = 10 ** d; return Math.round(x * f) / f; };

// ---------- RNG (state kept in the save so games are reproducible) ----------
export function rngNext(s: { seed: number }): number {
  s.seed = (s.seed + 0x6d2b79f5) | 0;
  let t = Math.imul(s.seed ^ (s.seed >>> 15), 1 | s.seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function normal(rnd: () => number): number {
  const u = Math.max(1e-9, rnd());
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const getCountry = (s: GameState): CountryDef => COUNTRIES[s.countryId];
export const debtPct = (s: GameState) => (s.debt / s.gdp) * 100;
export const gdpPerCapita = (s: GameState) => (s.gdp * 1000) / s.population; // USD per person
export const dateLabel = (s: GameState) => `${MONTHS[s.m]} ${s.y}`;

function policyVector(s: GameState): number[] {
  return [s.tax.incomeTax, s.tax.corpTax, s.tax.vat, s.spend.education, s.spend.health, s.spend.infrastructure, s.spend.defence, s.spend.welfare, s.spend.administration];
}

// ---------- New game ----------
export function newGame(countryId: string, difficulty: Difficulty, seed = Math.floor(Math.random() * 2 ** 31), leader = 'You', partyId?: string): GameState {
  const c = COUNTRIES[countryId];
  if (!c) throw new Error('Unknown country ' + countryId);
  const adm = administration0(c);
  const spend: Record<SpendKey, number> = { ...c.spend0, administration: adm };
  const s: GameState = {
    v: SAVE_VERSION, countryId, leader, y: START_YEAR, m: 0, turn: 0, seed, difficulty: { ...difficulty },
    population: c.population, gdp: c.gdp, realIdx: 100, growth: c.potentialGrowth, inflation: c.inflation0,
    unemployment: c.unemployment0, debt: (c.debtPct0 / 100) * c.gdp, policyRate: c.policyRate0, avgCost: c.avgCost0,
    currency: 100, confidence: 50, livingStd: 100, defAvg: c.deficitPct0, commodity: 100, globalCycle: 0,
    revenueM: 0, spendingM: 0, interestM: 0,
    stocks: { ...c.stock0 }, tax: { ...c.tax0 }, spend,
    programs: {}, prevPolicy: [], lastVat: c.tax0.vat, pendingCosts: 0,
    approval: clamp(c.approval0 + (1 - difficulty.election) * 8, 10, 90), stability: clamp(c.stability0 - (difficulty.stability - 1) * 15, 10, 95),
    monthsInOffice: 0, monthsToElection: c.monthsToElection0, term: 1, electionsWon: 0, brakeBreachMonths: 0,
    modifiers: [], cooldowns: {}, eventCounts: {}, flags: {}, pendingEvent: null, lastEventOutcome: null, lastElection: null, gameOver: null,
    history: [], lastReport: null, reports: [], eventHistory: [], electionHistory: [],
    eco: initEco(c), projects: [], pol: null as unknown as GameState['pol'], dip: initDiplo(countryId), ai: null as unknown as GameState['ai'], news: null as unknown as GameState['news'], res: initResearch(),
  };
  // Starting national conditions: >1 means a worse inheritance (more debt, inflation, joblessness; weaker approval and confidence).
  { const k = difficulty.start - 1;
    s.debt *= 1 + 0.5 * k; s.inflation = Math.max(0.2, s.inflation + 2 * k); s.unemployment = Math.max(0.8, s.unemployment + 1.5 * k);
    s.approval = clamp(s.approval - 8 * k, 10, 90); s.confidence = clamp(s.confidence - 10 * k, 10, 90); }
  s.pol = initPolitics(s, partyId, () => rngNext(s));
  s.ai = initAI(s);
  s.news = initNews(s);
  s.dip.influence = influence(s);
  s.prevPolicy = policyVector(s);
  const f = fiscal(s);
  s.revenueM = f.revenueM; s.spendingM = f.spendingM; s.interestM = f.interestM;
  s.history.push(historyPoint(s));
  return s;
}

function ecoPoint(s: GameState) {
  const m = ecoMetrics(s, getCountry(s));
  return { gdppc: round(m.gdpPc, 0), xPct: round(m.exportsBn / s.gdp * 100, 1), mPct: round(m.importsBn / s.gdp * 100, 1), tbPct: round(m.tradeBalPct, 2), fdi: round(m.fdiPct, 2), resM: round(m.reservesMonths, 1), gini: round(m.gini, 1), hdi: round(m.hdi, 3) };
}

function historyPoint(s: GameState): HistoryPoint {
  const f = fiscal(s);
  return {
    y: s.y, m: s.m, gdp: round(s.gdp, 2), growth: round(s.growth, 2), inflation: round(s.inflation, 2), unemployment: round(s.unemployment, 2),
    debtPct: round(debtPct(s), 1), balancePct: round(-f.deficitPct, 2), approval: round(s.approval, 1), stability: round(s.stability, 1),
    confidence: round(s.confidence, 1), currency: round(s.currency, 1), rate: round(s.policyRate, 2), livingStd: round(s.livingStd, 1),
    ...ecoPoint(s),
  };
}

// ---------- Modifiers & programme effects ----------
interface Sum { growth: number; inflation: number; unemployment: number; approval: number; stability: number; confidence: number; revenuePct: number }
function sumModifiers(s: GameState): Sum {
  const t: Sum = { growth: 0, inflation: 0, unemployment: 0, approval: 0, stability: 0, confidence: 0, revenuePct: 0 };
  for (const m of s.modifiers) {
    t.growth += m.growth ?? 0; t.inflation += m.inflation ?? 0; t.unemployment += m.unemployment ?? 0; t.approval += m.approval ?? 0;
    t.stability += m.stability ?? 0; t.confidence += m.confidence ?? 0; t.revenuePct += m.revenuePct ?? 0;
  }
  return t;
}

function programEffects(s: GameState, c: CountryDef) {
  const p = s.programs;
  return {
    growth: (p.investHoliday ? 0.15 : 0) + (p.jobsGuarantee ? 0.1 : 0) + (p.exportPush ? 0.5 * c.openness : 0) - (p.subsidies ? 0.1 : 0),
    inflation: (p.subsidies ? -0.7 : 0) + (p.jobsGuarantee ? 0.2 : 0),
    unemployment: p.jobsGuarantee ? -0.8 : 0,
    approval: (p.subsidies ? 2 : 0) + (p.jobsGuarantee ? 0.8 : 0) - (p.anticorruption ? 0.3 : 0),
    stability: p.anticorruption ? 1.5 : 0,
    confidence: p.investHoliday ? 6 : 0,
    currency: p.exportPush ? 2 : 0,
    efficiency: p.anticorruption ? 8 : 0,
  };
}

export function programCostPct(s: GameState): number {
  let t = 0;
  for (const p of PROGRAMS) {
    if (!s.programs[p.id]) continue;
    t += p.id === 'subsidies' ? p.costPct * (0.6 + 0.4 * (s.commodity / 100)) : p.costPct;
  }
  return t;
}

// ---------- Fiscal engine ----------
const evasion = (x: number) => (x <= 1 ? 1 : Math.max(0.35, 1 - 0.35 * (x - 1)));

export function fiscal(s: GameState): Fiscal {
  const c = getCountry(s);
  const mod = sumModifiers(s);
  const cyc = clamp(1 - 0.025 * (s.unemployment - c.unemployment0), 0.85, 1.1);
  const rIncome = s.tax.incomeTax / c.tax0.incomeTax;
  const rCorp = s.tax.corpTax / c.tax0.corpTax;
  const rVat = s.tax.vat / c.tax0.vat;
  const confF = clamp(1 + 0.004 * (s.confidence - 50), 0.9, 1.1);
  const income = c.rev0 * c.revShare.incomeTax * rIncome * evasion(rIncome) * cyc;
  const corp = c.rev0 * c.revShare.corpTax * rCorp * evasion(rCorp) * cyc * confF;
  const vat = c.rev0 * c.revShare.vat * rVat * evasion(rVat) * cyc;
  const other = c.rev0 * c.revShare.other * (1 + c.commodityExports * (s.commodity / 100 - 1));
  const extra = mod.revenuePct;
  const revenuePct = income + corp + vat + other + extra;
  const programSpend = Object.values(s.spend).reduce((a, b) => a + b, 0);
  const progCost = programCostPct(s) + projectCostPct(s) + researchCostPct(s);
  // Automatic costs the government does not choose: unemployment support rises in a downturn and falls in a boom,
  // and an ageing population slowly raises pension and health bills unless pensions are reformed.
  const stabiliserPct = clamp(0.12 * (s.unemployment - c.unemployment0) * (c.spend0.welfare / 12), -0.5, 1.5);
  const ageingPct = c.agingDrag * 0.11 * (s.turn / 12) * (s.flags.pensionReform ? 0.5 : 1);
  const spendPct = programSpend + progCost + stabiliserPct + ageingPct;
  const interestAnnual = (s.debt * s.avgCost) / 100;
  const interestPct = (interestAnnual / s.gdp) * 100;
  const deficitPct = spendPct + interestPct - revenuePct;
  const revenueM = (revenuePct / 100) * (s.gdp / 12);
  const interestM = interestAnnual / 12;
  const spendingM = (spendPct / 100) * (s.gdp / 12) + interestM;
  return {
    revenuePct, spendPct, programCostPct: progCost, interestPct, stabiliserPct, ageingPct, primaryDeficitPct: deficitPct - interestPct, deficitPct,
    taxLines: [
      { key: 'incomeTax', label: 'Income tax', pct: income },
      { key: 'corpTax', label: 'Corporate tax', pct: corp },
      { key: 'vat', label: 'VAT / sales tax', pct: vat },
      { key: 'other', label: 'Other revenue', pct: other + extra },
    ],
    revenueM, spendingM, interestM, balanceM: revenueM - spendingM,
    capBreach: c.deficitCap !== null && deficitPct > c.deficitCap + 0.4 && s.growth > -1,
  };
}

/** Eurozone members share one central bank: it reacts mostly to the area average, only ~25% to this country. */
const EURO = ['germany', 'france', 'italy'];
const rateRule = (s: GameState, c: CountryDef, infl: number, g: number) => {
  if (EURO.includes(c.id)) { infl = c.inflationTarget + 0.25 * (infl - c.inflationTarget); g = c.potentialGrowth + 0.25 * (g - c.potentialGrowth); }
  return Math.max(c.rateFloor, c.neutralRate + 1.2 * (infl - c.inflationTarget) + 0.3 * (g - c.potentialGrowth));
};

export function borrowingRate(s: GameState): number {
  const c = getCountry(s);
  const f0 = (d: number) => Math.max(0, d - 60);
  const d = debtPct(s);
  let prem = c.premium0 + (1 - 0.6 * c.debtTolerance) * 0.07 * (f0(d) - f0(c.debtPct0)) + 0.03 * Math.max(0, 45 - s.stability);
  if (d > 120) prem += (1 - 0.6 * c.debtTolerance) * 0.05 * (d - 120);
  return s.policyRate + Math.max(0.1, prem);
}

/** Where each public-service quality index is heading under current spending (slow-moving). */
export function stockTargets(s: GameState): Record<StockKey, number> {
  const c = getCountry(s);
  const st = s.stocks, st0 = c.stock0;
  const pe = programEffects(s, c);
  const gainMult = 0.55 + st.efficiency / 100;
  const stockTarget = (key: StockKey, spendNow: number, spend0: number): number => {
    const base = st0[key];
    let delta = 45 * gainMult * Math.log(Math.max(spendNow, 0.05) / spend0);
    if (delta > 0) delta *= clamp((100 - base) / 50, 0.25, 1.4);
    else delta *= clamp(base / 50, 0.5, 1.6);
    return clamp(base + delta, 0, 100);
  };
  const adm0 = administration0(c);
  const ab = s.eco?.assetBonus ?? { education: 0, health: 0, infrastructure: 0, security: 0, efficiency: 0 };
  return {
    education: clamp(stockTarget('education', s.spend.education, c.spend0.education) + ab.education, 0, 100),
    health: clamp(stockTarget('health', s.spend.health, c.spend0.health) + ab.health, 0, 100),
    infrastructure: clamp(stockTarget('infrastructure', s.spend.infrastructure, c.spend0.infrastructure) + ab.infrastructure, 0, 100),
    security: stockTarget('security', s.spend.defence, c.spend0.defence),
    efficiency: clamp(st0.efficiency + 30 * Math.log(Math.max(s.spend.administration, 0.3) / adm0) + pe.efficiency + ab.efficiency, 0, 100),
  };
}

// ---------- Fx (what event choices can do) ----------
function makeFx(s: GameState, c: CountryDef, rnd: () => number): Fx {
  const sev = s.difficulty.economy;
  return {
    s, c, rnd,
    approval: (d) => { s.approval = clamp(s.approval + (d < 0 ? d * (0.8 + 0.2 * sev) : d), 3, 95); },
    stability: (d) => { s.stability = clamp(s.stability + (d < 0 ? d * s.difficulty.stability : d), 3, 98); },
    confidence: (d) => { s.confidence = clamp(s.confidence + d, 0, 100); },
    unemployment: (d) => { s.unemployment = clamp(s.unemployment + d, 0.8, 35); },
    inflation: (d) => { s.inflation = clamp(s.inflation + d, -3, 80); },
    currency: (d) => { s.currency = clamp(s.currency + d, 40, 160); },
    cost: (pct) => { s.pendingCosts += (s.gdp * pct) / 100; },
    mod: (label, months, e) => {
      const m: Modifier = { id: label, label, monthsLeft: months };
      const adv = (v: number | undefined, bad: boolean) => (v === undefined ? undefined : bad ? v * sev : v);
      m.growth = adv(e.growth, (e.growth ?? 0) < 0); m.inflation = adv(e.inflation, (e.inflation ?? 0) > 0);
      m.unemployment = adv(e.unemployment, (e.unemployment ?? 0) > 0); m.approval = e.approval; m.stability = e.stability;
      m.confidence = e.confidence; m.revenuePct = e.revenuePct;
      s.modifiers.push(m);
    },
    spend: (k, d) => { s.spend[k] = round(Math.max(0.1, s.spend[k] + d), 2); },
    tax: (k, d) => { s.tax[k] = round(clamp(s.tax[k] + d, 0, 80), 2); },
    stock: (k, d) => { s.stocks[k] = clamp(s.stocks[k] + d, 0, 100); },
    flag: (k, v) => { s.flags[k] = v; },
    project: (spec) => startEventProject(s, spec),
  };
}

// ---------- Player actions ----------
export function setTax(s: GameState, k: TaxKey, v: number) { s.tax[k] = round(v, 1); }
export function setSpend(s: GameState, k: SpendKey, v: number) { s.spend[k] = round(Math.max(0.1, v), 2); }
export function toggleProgram(s: GameState, id: string) { s.programs[id] = !s.programs[id]; }

export function actionAvailability(s: GameState, id: string): { ok: boolean; reason?: string } {
  const a = ACTIONS.find((x) => x.id === id);
  if (!a) return { ok: false, reason: 'Unknown action' };
  if (s.gameOver) return { ok: false, reason: 'Game over' };
  if ((s.cooldowns['a_' + id] ?? 0) > 0) return { ok: false, reason: `Available in ${s.cooldowns['a_' + id]} month(s)` };
  if (a.onlyBeforeElection !== undefined && s.monthsToElection > a.onlyBeforeElection) return { ok: false, reason: `Only in the last ${a.onlyBeforeElection} months before an election` };
  return { ok: true };
}

export function runAction(s: GameState, id: string): string {
  const av = actionAvailability(s, id);
  if (!av.ok) return av.reason ?? 'Not available';
  const a = ACTIONS.find((x) => x.id === id)!;
  const c = getCountry(s);
  const fx = makeFx(s, c, () => rngNext(s));
  fx.cost(a.costPct);
  s.cooldowns['a_' + id] = a.cooldown;
  // PR actions have diminishing returns when repeated: the 'use' counter decays ~8% per month.
  const use = s.flags['use_' + id] ?? 0;
  const scale = 1 / (1 + 0.9 * use);
  s.flags['use_' + id] = use + 1;
  if (id === 'address') fx.approval(3 * scale);
  if (id === 'campaign') fx.approval(4 * scale);
  if (id === 'stimulus') { fx.mod('Stimulus payments', 6, { growth: 0.9, inflation: 0.5 }); fx.approval(2); }
  if (id === 'roadshow') fx.mod('Investor roadshow', 12, { confidence: 6 });
  return 'Done: ' + a.effect;
}

// ---------- Events ----------
export function resolveEvent(s: GameState, choiceIndex: number): string {
  if (!s.pendingEvent) return '';
  const def = getEvent(s.pendingEvent);
  if (!def) { s.pendingEvent = null; return ''; }
  const c = getCountry(s);
  const choices = availableChoices(def, s, c);
  const ch = choices[choiceIndex];
  if (!ch) return '';
  const fx = makeFx(s, c, () => rngNext(s));
  const outcome = ch.run(fx);
  s.eventHistory.push({ y: s.y, m: s.m, id: def.id, title: def.title, choice: ch.label, outcome });
  s.lastEventOutcome = outcome;
  s.pendingEvent = null;
  return outcome;
}

// ---------- Monthly step ----------
export function advanceMonth(input: GameState): GameState {
  if (input.gameOver || input.pendingEvent || input.pol.pending) return input;
  const s: GameState = structuredClone(input);
  const c = getCountry(s);
  const rnd = () => rngNext(s);
  const notes: string[] = [];
  const diff = s.difficulty;
  const prev = { growth: s.growth, inflation: s.inflation, unemployment: s.unemployment, approval: s.approval, stability: s.stability, debtPct: debtPct(s), balancePct: -fiscal(s).deficitPct, confidence: s.confidence, currency: s.currency };
  s.lastEventOutcome = null;
  s.lastElection = null;

  if (!s.pol.inGovernment) oppositionDrift(s);
  // --- 0. Policy changes since last month: announcement effects, VAT price effect, churn penalty ---
  let pv = policyVector(s);
  if (s.prevPolicy.length === pv.length) {
    const dInc = s.tax.incomeTax - s.prevPolicy[0];
    const dVat = s.tax.vat - s.prevPolicy[2];
    if (dInc > 0.05 || dVat > 0.05) { s.approval = clamp(s.approval - (0.8 * Math.max(0, dInc) + 1.0 * Math.max(0, dVat)), 3, 95); notes.push('Tax rises announced: voters are unhappy.'); }
    if (dInc < -0.05 || dVat < -0.05) { s.approval = clamp(s.approval + 0.5 * (Math.max(0, -dInc) + Math.max(0, -dVat)), 3, 95); }
    let churn = Math.abs(s.tax.incomeTax - s.prevPolicy[0]) / 2 + Math.abs(s.tax.corpTax - s.prevPolicy[1]) / 2 + Math.abs(dVat) / 1.5;
    for (let i = 3; i < 9; i++) churn += Math.abs(pv[i] - s.prevPolicy[i]) / 0.5;
    if (churn > 4 && s.pol.inGovernment && (govSeatShare(s) <= 0.5 || s.pol.minority) && rnd() < 0.6) {
      const p = s.prevPolicy; s.tax.incomeTax = p[0]; s.tax.corpTax = p[1]; s.tax.vat = p[2];
      s.spend.education = p[3]; s.spend.health = p[4]; s.spend.infrastructure = p[5]; s.spend.defence = p[6]; s.spend.welfare = p[7]; s.spend.administration = p[8];
      pv = policyVector(s); churn = 0;
      s.stability = clamp(s.stability - 2, 3, 98); s.approval = clamp(s.approval - 1, 3, 95);
      notes.push(isPresidential(s) ? 'Congress blocked your budget changes; the old budget stays.' : 'Parliament voted down your budget changes; the old budget stays.');
    }
    if (churn > 3) { const hit = (churn - 3) * 0.6; s.confidence = clamp(s.confidence - hit, 0, 100); notes.push('Sweeping policy changes rattled investors (confidence -' + hit.toFixed(1) + ').'); }
  }
  if (Math.abs(s.tax.vat - s.lastVat) > 0.05) {
    s.modifiers.push({ id: 'vatChange', label: 'VAT change price effect', monthsLeft: 6, inflation: 0.35 * (s.tax.vat - s.lastVat) });
    s.lastVat = s.tax.vat;
  }
  s.prevPolicy = pv;

  // --- 1. Fiscal position for this month ---
  const mod = sumModifiers(s);
  const pe = programEffects(s, c);
  const f = fiscal(s);
  const st = s.stocks, st0 = c.stock0;

  // constitutional deficit cap (Germany)
  if (c.deficitCap !== null) {
    if (f.capBreach) {
      s.brakeBreachMonths++;
      s.modifiers.push({ id: 'brake', label: 'Constitutional deficit limit breached', monthsLeft: 1, stability: -6, confidence: -8, approval: -1 });
      if (s.brakeBreachMonths === 1) notes.push(`Deficit ${f.deficitPct.toFixed(1)}% exceeds the constitutional limit (${c.deficitCap}%): courts and markets react.`);
    } else s.brakeBreachMonths = 0;
  }
  const mod2 = c.deficitCap !== null && f.capBreach ? sumModifiers(s) : mod;

  // --- 2. External world ---
  s.commodity = clamp(s.commodity + 0.04 * (100 - s.commodity) + 3.2 * diff.economy * normal(rnd), 40, 220);
  s.globalCycle = clamp(s.globalCycle * 0.96 + 0.25 * diff.economy * normal(rnd), -4, 4);

  // --- 3. Growth ---
  const d = (k: TaxKey) => s.tax[k] - c.tax0[k];
  const drag = (x: number, coef: number) => (x > 0 ? coef * x : coef * 0.6 * x);
  const taxDrag = drag(d('incomeTax'), 0.035) + drag(d('corpTax'), 0.05) + drag(d('vat'), 0.03);
  const prod = c.catchUp * (0.035 * (st.education - st0.education) + 0.015 * (st.health - st0.health)) + c.infraMult * c.catchUp * 0.028 * (st.infrastructure - st0.infrastructure) + 0.012 * (st.efficiency - st0.efficiency);
  const dp = debtPct(s);
  const fiscalMult = 0.2 * (1 - clamp((dp - 100) / 200, 0, 0.6));
  const impulse = clamp(fiscalMult * 1.4 * (f.deficitPct - s.defAvg), -1.5, 1.5);
  const debtFloor = Math.max(100, c.debtPct0);
  const overhang = 0.012 * Math.max(0, dp - debtFloor) * (1 - 0.5 * c.debtTolerance);
  s.defAvg += (f.deficitPct - s.defAvg) / 24;
  const rule0 = rateRule(s, c, c.inflation0, c.potentialGrowth);
  const rateDrag = 0.22 * (s.policyRate - rule0);
  const stabEff = clamp(0.025 * (s.stability - c.stability0), -1.2, 0.4);
  const commEff = c.commodityExports * 0.025 * (s.commodity - 100) - c.fuelImports * 0.012 * (s.commodity - 100);
  const fxEff = 0.015 * (100 - s.currency) * c.openness;
  const gTarget = c.potentialGrowth + prod + impulse - overhang - taxDrag + 0.02 * (s.confidence - 50) + stabEff - rateDrag + c.openness * s.globalCycle + commEff + fxEff + mod2.growth + pe.growth + 0.35 * diff.economy * normal(rnd);
  s.growth = clamp(0.65 * s.growth + 0.35 * gTarget, -12, 12);

  // --- 4. Inflation ---
  const pressure = 0.25 * (s.growth - c.potentialGrowth) + 0.18 * (1 - 0.4 * c.debtTolerance) * (EURO.includes(c.id) ? 0.4 : 1) * Math.max(0, f.deficitPct - Math.max(3, c.deficitPct0)) + c.fuelImports * 0.012 * (s.commodity - 100) + 0.02 * c.openness * (100 - s.currency) - 0.15 * (s.policyRate - rule0) + mod2.inflation + pe.inflation;
  s.inflation = clamp(s.inflation + 0.06 * (c.inflationTarget - s.inflation) + pressure / 12 + 0.06 * diff.economy * normal(rnd), -3, 80);

  // --- 5. Unemployment ---
  const mb = ministerBonus(s);
  const uTarget = c.unemployment0 + mod2.unemployment + pe.unemployment + mb.unemp;
  s.unemployment = clamp(s.unemployment + 0.05 * (uTarget - s.unemployment) - (0.4 * (s.growth - c.potentialGrowth)) / 12 + 0.04 * diff.economy * normal(rnd), 0.8, 35);

  // --- 6. Monetary policy (independent central bank) and borrowing costs ---
  s.policyRate += 0.12 * (rateRule(s, c, s.inflation, s.growth) - s.policyRate);
  s.policyRate = Math.max(c.rateFloor, s.policyRate);
  const br = borrowingRate(s);
  const br0 = c.policyRate0 + c.premium0;
  s.avgCost = Math.max(0.1, s.avgCost + 0.012 * ((c.avgCost0 + (br - br0)) - s.avgCost));

  // --- 6b. Construction projects and the wider economy (sectors, trade, FDI, reserves) ---
  const projLoad = stepProjects(s, c, rnd, notes);
  stepResearch(s, c, notes);
  const dx = stepDiplomacy(s, rnd, notes);
  stepRivalAI(s, rnd, notes);
  const ex = stepEco(s, c, projLoad, dx);
  s.growth = clamp(s.growth + 0.35 * ex.growthAdj, -12, 12);
  s.confidence = clamp(s.confidence + ex.confAdj * 0.1, 0, 100);

  // --- 7. Currency ---
  const fair = 100 - 1.5 * (s.inflation - c.inflationTarget) - 0.12 * Math.max(0, dp - Math.max(80, c.debtPct0)) * (1 - c.reserveCurrency) + 0.15 * (s.stability - c.stability0) + 0.4 * (s.policyRate - rule0) + 0.1 * (s.growth - c.potentialGrowth) + pe.currency + 0.01 * (s.commodity - 100) * (c.commodityExports - c.fuelImports) + ex.fairAdj;
  s.currency = clamp(s.currency + 0.08 * (fair - s.currency) + 0.5 * diff.economy * normal(rnd), 40, 160);

  // --- 8. Investor confidence ---
  const cTarget = 50 + 0.45 * (s.stability - c.stability0) - (d('corpTax') > 0 ? 0.8 : 0.5) * d('corpTax') + 0.12 * (st.infrastructure - st0.infrastructure) - 0.12 * Math.max(0, dp - Math.max(90, c.debtPct0)) * (1 - c.debtTolerance) - 1.0 * Math.max(0, s.inflation - c.inflationTarget - 3) + mod2.confidence + pe.confidence + mb.conf;
  s.confidence = clamp(s.confidence + 0.1 * (clamp(cTarget, 5, 95) - s.confidence), 0, 100);

  // --- 9. Public services: slow-moving stocks (education, health, infrastructure, security, efficiency) ---
  const targets = stockTargets(s);
  const speed: Record<StockKey, number> = { education: 0.012, health: 0.02, infrastructure: 0.012, security: 0.02, efficiency: 0.02 };
  const postFor: Record<StockKey, string[]> = { education: ['education'], health: ['health'], infrastructure: ['infrastructure'], security: ['defence'], efficiency: ['interior', 'finance'] };
  (Object.keys(targets) as StockKey[]).forEach((k) => {
    const gap = targets[k] - s.stocks[k];
    const mm = gap > 0 ? postFor[k].reduce((a, p) => a + ministerMult(s, p), 0) / postFor[k].length : 1;
    s.stocks[k] = clamp(s.stocks[k] + speed[k] * gap * mm, 0, 100);
  });

  // --- 10. Money: debt, GDP, population, living standards ---
  const spendingM = f.spendingM + s.pendingCosts;
  const balanceM = f.revenueM - spendingM;
  s.debt = Math.max(0, s.debt - balanceM);
  s.revenueM = f.revenueM; s.spendingM = spendingM; s.interestM = f.interestM;
  s.pendingCosts = 0;
  s.gdp *= Math.exp((Math.log(1 + s.growth / 100) + Math.log(1 + s.inflation / 100)) / 12);
  s.realIdx *= Math.exp(Math.log(1 + s.growth / 100) / 12);
  s.population *= Math.exp(Math.log(1 + c.popGrowth / 100) / 12);
  s.livingStd *= 1 + ((s.growth - c.potentialGrowth) - 0.5 * Math.max(0, s.inflation - c.inflationTarget) - 0.3 * (s.unemployment - c.unemployment0)) / 1200;

  // --- 11. Politics: approval & stability ---
  const penI = (x: number) => 1.3 * Math.max(0, x - c.inflationTarget - 0.5);
  const fatigue = Math.min(8, 0.05 * s.monthsInOffice);
  const taxApproval = (k: TaxKey, coef: number) => (d(k) > 0 ? -coef * d(k) : -coef * 0.7 * d(k));
  const aTarget = c.approval0
    + 1.6 * (s.growth - c.potentialGrowth)
    - 1.4 * (s.unemployment - c.unemployment0)
    - (penI(s.inflation) - penI(c.inflation0))
    + 0.10 * (st.health - st0.health) + 0.07 * (st.education - st0.education) + 0.05 * (st.infrastructure - st0.infrastructure) + 0.04 * (st.security - st0.security)
    + 1.5 * (s.spend.welfare - c.spend0.welfare)
    + taxApproval('incomeTax', 0.45) + taxApproval('vat', 0.7) + taxApproval('corpTax', 0.12)
    + 0.15 * (s.livingStd - 100)
    - fatigue + mod2.approval + pe.approval;
  s.approval = clamp(s.approval + 0.1 * (aTarget - s.approval) + 0.4 * normal(rnd), 3, 95);

  const sTarget = c.stability0 - 12 * (diff.stability - 1)
    + 0.28 * (s.approval - c.approval0)
    - 1.0 * Math.max(0, s.inflation - c.inflationTarget - 2)
    - 0.8 * Math.max(0, s.unemployment - c.unemployment0 - 1.5)
    - 0.6 * Math.max(0, -s.growth)
    + 0.08 * (st.security - st0.security) + 0.08 * (st.efficiency - st0.efficiency)
    + mod2.stability + pe.stability + mb.stab + dx.stab;
  s.stability = clamp(s.stability + 0.1 * (clamp(sTarget, 5, 98) - s.stability) + 0.3 * diff.stability * normal(rnd), 3, 98);

  // --- 12. Calendar, expiry ---
  s.turn++; s.monthsInOffice++; s.monthsToElection--;
  s.m++; if (s.m > 11) { s.m = 0; s.y++; }
  monthlyPolitics(s, rnd, notes);
  for (const k of Object.keys(s.flags)) if (k.startsWith('use_')) s.flags[k] *= 0.92;
  for (const k of Object.keys(s.cooldowns)) { s.cooldowns[k]--; if (s.cooldowns[k] <= 0) delete s.cooldowns[k]; }
  const kept: Modifier[] = [];
  for (const m of s.modifiers) { m.monthsLeft--; if (m.monthsLeft > 0) kept.push(m); }
  s.modifiers = kept;

  // --- 13. Record month ---
  const interestPct = f.interestPct;
  if (interestPct > 5) notes.push(`Interest payments now take ${interestPct.toFixed(1)}% of GDP.`);
  if (s.inflation > c.inflationTarget + 3) notes.push(`Inflation is ${s.inflation.toFixed(1)}%, far above the ${c.inflationTarget}% target.`);
  if (s.growth < 0) notes.push('The economy is contracting.');
  const deltas: ReportDelta[] = [
    { label: 'Real growth (annualised)', from: prev.growth, to: s.growth, unit: '%', goodWhenUp: true, digits: 1 },
    { label: 'Inflation', from: prev.inflation, to: s.inflation, unit: '%', goodWhenUp: false, digits: 1 },
    { label: 'Unemployment', from: prev.unemployment, to: s.unemployment, unit: '%', goodWhenUp: false, digits: 1 },
    { label: 'Budget balance (annualised)', from: prev.balancePct, to: -f.deficitPct, unit: '% GDP', goodWhenUp: true, digits: 1 },
    { label: 'Debt', from: prev.debtPct, to: debtPct(s), unit: '% GDP', goodWhenUp: false, digits: 1 },
    { label: 'Approval', from: prev.approval, to: s.approval, unit: '%', goodWhenUp: true, digits: 1 },
    { label: 'Stability', from: prev.stability, to: s.stability, unit: '', goodWhenUp: true, digits: 1 },
    { label: 'Investor confidence', from: prev.confidence, to: s.confidence, unit: '', goodWhenUp: true, digits: 1 },
    { label: 'Currency index', from: prev.currency, to: s.currency, unit: '', goodWhenUp: null, digits: 1 },
  ];
  stepNews(s, rnd, prev, notes);
  const report: MonthReport = { y: s.y, m: s.m, deltas, notes };
  s.lastReport = report;
  s.reports.push(report);
  if (s.reports.length > 120) s.reports.shift();
  s.history.push(historyPoint(s));

  // --- 14. Ousting by own party (very low approval and stability for a sustained period) ---
  s.flags.lowStreak = s.pol.inGovernment && s.approval < 18 && s.stability < 30 ? (s.flags.lowStreak ?? 0) + 1 : 0;
  if (s.flags.lowStreak >= 3) {
    s.gameOver = { kind: 'lost', title: 'Forced out of office', text: 'With approval and stability in freefall, your own party has removed you as leader.' };
    return s;
  }

  // --- 15. Election, else random/conditional event ---
  const P = s.pol;
  if (isPresidential(s) && P.midtermIn > 0) { P.midtermIn--; if (P.midtermIn === 0 && s.monthsToElection > 3) { holdElection(s, c, rnd, true); return s; } }
  if (s.monthsToElection <= 0) { holdElection(s, c, rnd, false); return s; }
  if (!isPresidential(s) && s.monthsInOffice >= 6 && s.monthsToElection > 2 && !s.cooldowns.noConfidence && rnd() < ncRisk(s)) {
    if (P.inGovernment) { s.pendingEvent = 'noConfidence'; s.cooldowns.noConfidence = 10; s.eventCounts.noConfidence = (s.eventCounts.noConfidence ?? 0) + 1; return s; }
    fallOfGovernment(s); s.cooldowns.noConfidence = 10;
    s.lastReport?.notes.push('The government has lost a confidence vote - a snap election is called.');
    return s;
  }
  const evId = drawEvent(s, c, rnd);
  if (evId) {
    const def = getEvent(evId)!;
    s.cooldowns[evId] = def.cooldown;
    s.eventCounts[evId] = (s.eventCounts[evId] ?? 0) + 1;
    if (!P.inGovernment) {
      const ch = availableChoices(def, s, c);
      const pick = ch[Math.floor(rnd() * ch.length)];
      if (pick) {
        const out = pick.run(makeFx(s, c, rnd));
        s.eventHistory.push({ y: s.y, m: s.m, id: def.id, title: def.title, choice: 'Government: ' + pick.label, outcome: out });
        s.lastReport?.notes.push(`${def.title} - the government chose: ${pick.label}.`);
      }
      return s;
    }
    s.pendingEvent = evId;
    if (def.onShow) def.onShow(makeFx(s, c, rnd));
  }
  return s;
}

// ---------- Elections (Stage 1: approval-driven; Stage 2 replaces with full party/seat model) ----------
export function electionOutlook(s: GameState): { projected: number; threshold: number; margin: number; label: string } {
  const c = getCountry(s);
  const projected = clamp(10 + 0.78 * s.approval + 0.05 * (s.stability - 50), 5, 80);
  const threshold = 0.78 * c.approval0 + 10 + 0.05 * (c.stability0 - 50) - 1.5 + 1.2 * s.electionsWon + (s.difficulty.election - 1) * 8;
  const margin = projected - threshold;
  const label = margin > 6 ? 'Safe' : margin > 2.5 ? 'Likely win' : margin > -2.5 ? 'Toss-up' : margin > -6 ? 'Likely loss' : 'Heading for defeat';
  return { projected, threshold, margin, label };
}

function holdElection(s: GameState, c: CountryDef, rnd: () => number, midterm: boolean) {
  const P = s.pol, sy = sysOf(s);
  const wasPM = P.inGovernment;
  const term = s.term;
  const res = runElection(s, rnd, midterm);
  const mine = res.shares[P.playerParty] ?? 0;
  const rec: ElectionRecord = { y: s.y, m: s.m, term, approval: round(s.approval, 1), voteShare: round(mine, 1), turnout: res.turnout, won: false, note: '', kind: midterm ? 'midterm' : 'general', shares: res.shares, seats: res.seats, ev: res.ev, pm: P.pmParty, coalition: [...P.coalition] };
  s.electionHistory.push(rec); s.lastElection = rec;
  const total = Object.values(res.seats).reduce((a, b) => a + b, 0);
  const myPct = Math.round((res.seats[P.playerParty] / total) * 100);
  if (midterm) {
    const ctrl = res.seats[P.pmParty] > total / 2;
    rec.won = !wasPM || ctrl;
    rec.note = wasPM ? (ctrl ? `Midterms: your party keeps control of the House (${res.seats[P.playerParty]} of ${total} seats).` : `Midterms: the opposition takes the House. Expect gridlock - bills will be hard to pass.`) : `Midterms: the president's party ${ctrl ? 'holds' : 'loses'} the House.`;
    P.midtermIn = 0;
    return;
  }
  const outcome = settleGovernment(s, res, rnd);
  rec.pm = P.pmParty; rec.coalition = [...P.coalition];
  if (outcome === 'pending') { rec.note = `Hung parliament: your party holds ${res.seats[P.playerParty]} of ${total} seats (${myPct}%). Negotiate a coalition.`; s.flags.resolvingElection = 1; return; }
  finishElection(s, c, rec, outcome === 'player', wasPM);
  void sy;
}

/** Applies the consequences of an election once it is known who governs (also called after coalition talks). */
export function finishElection(s: GameState, c: CountryDef, rec: ElectionRecord, playerPM: boolean, wasPM: boolean) {
  const P = s.pol;
  const term = rec.term;
  const mustRetire = c.maxTerms !== null && wasPM && term >= c.maxTerms;
  const total = Object.values(rec.seats ?? {}).reduce((a, b) => a + b, 0) || 1;
  const mySeats = rec.seats?.[P.playerParty] ?? 0;
  const seatTxt = `${mySeats} of ${total} seats`;
  s.flags.resolvingElection = 0; s.flags.snap = 0; s.flags.lowStreak = 0;
  rec.pm = P.pmParty; rec.coalition = [...P.coalition];
  rec.won = playerPM;
  const months = c.termYears * 12;
  if (playerPM) {
    P.inGovernment = true; P.defeats = 0;
    const coal = P.coalition.length > 1 ? ` in coalition with ${P.coalition.filter((x) => x !== P.playerParty).map((x) => pdef(s, x).short).join(', ')}` : '';
    if (mustRetire) {
      rec.note = `You are term-limited, but your successor carries the party to victory (${seatTxt}). The new administration continues your agenda.`;
      s.term = 1; s.electionsWon++; s.monthsInOffice = Math.floor(s.monthsInOffice * 0.3); P.tenure++;
      s.flags.successions = (s.flags.successions ?? 0) + 1;
    } else if (wasPM) {
      rec.note = `You are re-elected with ${rec.voteShare}% of the vote (${seatTxt})${coal}.`;
      s.term++; s.electionsWon++; P.tenure++; s.monthsInOffice = Math.floor(s.monthsInOffice * 0.5);
      s.approval = clamp(s.approval + 4, 3, 95); s.stability = clamp(s.stability + 3, 3, 98);
    } else {
      rec.note = `Back in power! Your party wins ${seatTxt} and forms a government${coal}.`;
      s.term = 1; s.electionsWon++; P.tenure = 0; s.monthsInOffice = 0; P.lastGovernmentChange = `${MONTHS[s.m]} ${s.y}`;
      s.approval = clamp(c.approval0 + 4, 3, 95); s.stability = clamp(Math.max(s.stability, c.stability0 - 5), 3, 98);
    }
  } else {
    const gov = pdef(s, P.pmParty);
    if (wasPM) {
      P.inGovernment = false; P.defeats = 1; P.tenure = 0; s.monthsInOffice = 0;
      rec.note = `Your party wins ${seatTxt} and loses power. ${gov.name} forms the new government. You now lead the opposition.`;
      s.approval = clamp(c.approval0 + 3, 3, 95); s.stability = clamp(Math.max(s.stability, c.stability0 - 8), 3, 98);
      P.lastGovernmentChange = `${MONTHS[s.m]} ${s.y}`;
    } else {
      P.defeats++; P.tenure = P.pmParty === rec.pm && rec.coalition?.[0] === P.pmParty ? P.tenure : 0;
      rec.note = `Another defeat: your party wins ${seatTxt}. ${gov.name} governs.`;
      s.monthsInOffice = 0; s.approval = clamp(c.approval0 + 3, 3, 95);
    }
    if (mustRetire) s.gameOver = { kind: 'retired', title: 'Term limit reached', text: `You completed the maximum ${c.maxTerms} terms and your party lost the following election.` };
    else if (P.defeats >= 2) s.gameOver = { kind: 'lost', title: 'Removed as party leader', text: `After two straight election defeats your party has chosen a new leader. Your career as ${c.title} is over.` };
  }
  s.monthsToElection = months;
  P.midtermIn = isPresidential(s) ? 24 : 0;
}

// ---------- Legacy ----------
export function computeLegacy(s: GameState): { total: number; parts: { label: string; value: number }[]; rank: string } {
  const c = getCountry(s);
  const popIdx = s.population / c.population;
  const pcIdx = s.realIdx / 100 / popIdx;
  const trend = Math.exp(Math.log(1 + (c.potentialGrowth - c.popGrowth) / 100) * (s.turn / 12));
  const wealth = 32 * clamp(Math.log(pcIdx / trend) / Math.log(1.6), -0.8, 1.2) + 8 * clamp(Math.log(pcIdx) / Math.log(3), 0, 1);
  const avg = (o: Record<StockKey, number>) => (o.education + o.health + o.infrastructure) / 3;
  const services = clamp((avg(s.stocks) - avg(c.stock0)) * 0.6, -15, 20);
  const fiscalScore = -0.15 * Math.max(0, debtPct(s) - c.debtPct0) + 0.05 * Math.max(0, c.debtPct0 - debtPct(s));
  const democracy = s.electionsWon * 6;
  const popularity = (s.approval - 40) * 0.2;
  const parts = [
    { label: 'Prosperity (real income per person)', value: round(wealth, 1) },
    { label: 'Public services', value: round(services, 1) },
    { label: 'Fiscal legacy', value: round(clamp(fiscalScore, -25, 10), 1) },
    { label: 'Electoral mandate', value: round(democracy, 1) },
    { label: 'Popularity', value: round(popularity, 1) },
  ];
  const total = round(parts.reduce((a, p) => a + p.value, 0), 1);
  const rank = total >= 60 ? 'National Founder' : total >= 40 ? 'Great Statesman' : total >= 22 ? 'Respected Leader' : total >= 8 ? 'Capable Administrator' : total >= 0 ? 'Forgettable Premier' : 'Cautionary Tale';
  return { total, parts, rank };
}

// ---------- Advisories shown on the Overview ----------
export interface Advisory { level: 'bad' | 'warn' | 'good' | 'info'; text: string }
export function advisories(s: GameState): Advisory[] {
  const c = getCountry(s);
  const f = fiscal(s);
  const out: Advisory[] = [];
  if (c.deficitCap !== null && f.deficitPct > c.deficitCap) out.push({ level: f.capBreach ? 'bad' : 'warn', text: `Deficit ${f.deficitPct.toFixed(1)}% vs. constitutional limit ${c.deficitCap}%.` });
  if (s.inflation > c.inflationTarget + 2) out.push({ level: 'bad', text: `Inflation ${s.inflation.toFixed(1)}% is well above the ${c.inflationTarget}% target.` });
  if (s.unemployment > c.unemployment0 + 2) out.push({ level: 'bad', text: `Unemployment has risen to ${s.unemployment.toFixed(1)}%.` });
  if (s.growth < 0) out.push({ level: 'bad', text: 'The economy is in recession.' });
  if (debtPct(s) > 100 && c.debtTolerance < 0.6) out.push({ level: 'warn', text: `Debt is ${debtPct(s).toFixed(0)}% of GDP – markets are watching.` });
  if (f.interestPct > 4.5) out.push({ level: 'warn', text: `Debt interest costs ${f.interestPct.toFixed(1)}% of GDP.` });
  if (s.approval < 30) out.push({ level: 'bad', text: `Approval is only ${s.approval.toFixed(0)}% – your position is in danger.` });
  if (s.stability < 35) out.push({ level: 'bad', text: 'Political stability is low; unrest and rebellions are likely.' });
  if (s.currency < 88) out.push({ level: 'warn', text: `Currency has fallen ${Math.round(100 - s.currency)}% – import prices will rise.` });
  if (s.monthsToElection <= 12) out.push({ level: 'info', text: `Election in ${s.monthsToElection} month(s). Approval ${s.approval.toFixed(0)}%.` });
  if (s.growth > c.potentialGrowth + 1.5 && s.inflation < c.inflationTarget + 1.5) out.push({ level: 'good', text: 'The economy is growing strongly.' });
  if (f.deficitPct < 0) out.push({ level: 'good', text: 'You are running a budget surplus.' });
  if (out.length === 0) out.push({ level: 'info', text: 'No urgent issues. Review your budget or enact a policy.' });
  return out.slice(0, 5);
}

/** Player's answer to coalition talks: a list of partners to invite, or null to decline and go into opposition. */
export function resolveFormation(input: GameState, partners: string[] | null): string | null {
  const s = input;
  const c = getCountry(s);
  const rnd = () => rngNext(s);
  const rec = s.electionHistory[s.electionHistory.length - 1];
  const wasPM = s.pol.inGovernment;
  if (partners === null) declineFormation(s, rnd);
  else { const err = confirmFormation(s, partners, rnd); if (err) return err; }
  finishElection(s, c, rec, s.pol.inGovernment && s.pol.pmParty === s.pol.playerParty, wasPM);
  return null;
}
