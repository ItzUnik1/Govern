// Stage 6 (part 1): society. Demographics, climate and environment, media and public trust.
// Everything here is derived from, and feeds back into, the core simulation through monthly modifiers,
// running costs/revenue in fiscal(), the ageing bill and the disaster-event weight. Nothing is cosmetic.
import type { CountryDef, GameState } from './types';
import type { EventDef } from './events';

export interface DemoCfg { young: number; old: number; urban: number; fert: number; mig: number; ty: number; to: number; tu: number }
// young/old/urban in % of population, fert = children per woman, mig = net migration per 1000 people,
// ty/to/tu = baseline yearly drift of young share, old share and urban share (percentage points).
const DEMO: Record<string, DemoCfg> = {
  nepal: { young: 29, old: 6, urban: 22, fert: 1.9, mig: -3, ty: -0.4, to: 0.2, tu: 0.6 },
  india: { young: 25, old: 7, urban: 36, fert: 2.0, mig: -0.1, ty: -0.3, to: 0.2, tu: 0.45 },
  uk: { young: 17, old: 19, urban: 84, fert: 1.6, mig: 5, ty: -0.05, to: 0.25, tu: 0.08 },
  usa: { young: 18, old: 17, urban: 83, fert: 1.7, mig: 3, ty: -0.05, to: 0.25, tu: 0.06 },
  germany: { young: 14, old: 22, urban: 78, fert: 1.5, mig: 5, ty: -0.05, to: 0.28, tu: 0.06 },
  japan: { young: 12, old: 29, urban: 92, fert: 1.3, mig: 1, ty: -0.08, to: 0.22, tu: 0.02 },
  canada: { young: 16, old: 19, urban: 82, fert: 1.4, mig: 8, ty: -0.05, to: 0.25, tu: 0.06 },
  australia: { young: 18, old: 17, urban: 86, fert: 1.6, mig: 7, ty: -0.05, to: 0.25, tu: 0.06 },
  france: { young: 17, old: 21, urban: 82, fert: 1.8, mig: 1, ty: -0.06, to: 0.26, tu: 0.06 },
  italy: { young: 12, old: 24, urban: 71, fert: 1.3, mig: 2, ty: -0.08, to: 0.28, tu: 0.06 },
  pakistan: { young: 35, old: 4, urban: 38, fert: 3.4, mig: -1, ty: -0.35, to: 0.15, tu: 0.6 },
  bangladesh: { young: 26, old: 6, urban: 40, fert: 2.0, mig: -2, ty: -0.3, to: 0.2, tu: 0.6 },
  southafrica: { young: 28, old: 6, urban: 68, fert: 2.3, mig: 1, ty: -0.25, to: 0.15, tu: 0.3 },
  newzealand: { young: 19, old: 16, urban: 87, fert: 1.7, mig: 6, ty: -0.05, to: 0.25, tu: 0.05 },
};
const DEMO_DEFAULT: DemoCfg = { young: 22, old: 10, urban: 60, fert: 2.0, mig: 0, ty: -0.2, to: 0.2, tu: 0.3 };
export const demoCfg = (id: string): DemoCfg => DEMO[id] ?? DEMO_DEFAULT;

interface GreenCfg { co2: number; renew: number; risk: number; press: number }
// tonnes CO2 per person, renewable share of electricity %, climate hazard index 0-100, press freedom 0-100
const GREEN: Record<string, GreenCfg> = {
  nepal: { co2: 0.5, renew: 95, risk: 55, press: 60 }, india: { co2: 2, renew: 22, risk: 55, press: 50 },
  uk: { co2: 4.7, renew: 45, risk: 30, press: 80 }, usa: { co2: 14, renew: 22, risk: 40, press: 72 },
  germany: { co2: 7.5, renew: 52, risk: 30, press: 85 }, japan: { co2: 8.5, renew: 23, risk: 40, press: 70 },
  canada: { co2: 14, renew: 68, risk: 35, press: 82 }, australia: { co2: 15, renew: 36, risk: 55, press: 80 },
  france: { co2: 4.5, renew: 26, risk: 30, press: 76 }, italy: { co2: 5.3, renew: 41, risk: 35, press: 70 },
  pakistan: { co2: 1, renew: 33, risk: 60, press: 38 }, bangladesh: { co2: 0.6, renew: 4, risk: 70, press: 38 },
  southafrica: { co2: 7.5, renew: 8, risk: 45, press: 70 }, newzealand: { co2: 6, renew: 85, risk: 35, press: 88 },
};
const GREEN_DEFAULT: GreenCfg = { co2: 5, renew: 25, risk: 40, press: 60 };
export const greenCfg = (id: string): GreenCfg => GREEN[id] ?? GREEN_DEFAULT;

export interface SocietyState {
  // demographics (shares in % of population)
  young: number; old: number; work: number; urban: number; fertility: number; migration: number;
  /** what the shares would be with no policy changes (used to measure your effect) */
  oldRef: number; workRef: number; urbanRef: number;
  bloc: { youth: number; workers: number; elders: number; rural: number }; // satisfaction 0..100
  // climate
  emissions: number; // index, 100 = start
  renew: number; risk: number; resilience: number;
  // media
  trust: number; freedom: number; heat: number; seenEv: number;
  /** policy levels */
  pol: Record<string, number>;
  log: string[];
}

export interface SocPolicy { id: string; group: 'people' | 'climate' | 'media'; name: string; desc: string; levels: string[]; costPct: number[]; effect: string }
export const SOC_POLICIES: SocPolicy[] = [
  { id: 'family', group: 'people', name: 'Family support', desc: 'Child benefit, childcare and parental leave.', levels: ['None', 'Child benefit', 'Full family package'], costPct: [0, 0.25, 0.6], effect: 'Lifts the birth rate slowly, so the workforce shrinks less. Popular with young voters; pays back only after 15+ years.' },
  { id: 'migration', group: 'people', name: 'Immigration policy', desc: 'How many people may settle and work.', levels: ['Restricted', 'Balanced', 'Open'], costPct: [0, 0, 0.1], effect: 'More migrants grow the workforce and ease the ageing bill, but split public opinion in divided countries and add short-run job competition.' },
  { id: 'rural', group: 'people', name: 'Rural development', desc: 'Farm roads, clinics, broadband outside the cities.', levels: ['Off', 'On'], costPct: [0, 0.25], effect: 'Slows the drift to cities and wins rural voters; a small drag on city productivity.' },
  { id: 'housing', group: 'people', name: 'City housing & transit', desc: 'Build homes and transit where people want to live.', levels: ['Off', 'On'], costPct: [0, 0.35], effect: 'Urban productivity rises and cities stay affordable; rural voters feel overlooked.' },
  { id: 'carbon', group: 'climate', name: 'Carbon price', desc: 'Charge for every tonne of CO2.', levels: ['None', 'Low', 'Medium', 'High'], costPct: [0, 0, 0, 0], effect: 'Cuts emissions and raises revenue, but lifts prices, slows industry and is unpopular with workers and rural voters.' },
  { id: 'renew', group: 'climate', name: 'Renewables subsidy', desc: 'Support for solar, wind and grid upgrades.', levels: ['Off', 'On'], costPct: [0, 0.4], effect: 'Raises the clean-power share and energy independence; costs money every year.' },
  { id: 'adapt', group: 'climate', name: 'Climate resilience programme', desc: 'Flood defences, early warning, fire breaks, drought plans.', levels: ['Off', 'On'], costPct: [0, 0.3], effect: 'Natural disasters become rarer and less costly over the years.' },
  { id: 'broadcaster', group: 'media', name: 'Independent public broadcaster', desc: 'A publicly funded news service with an editorial charter.', levels: ['Off', 'On'], costPct: [0, 0.12], effect: 'Raises public trust over time and blunts rumours; pro-government spin works less well.' },
  { id: 'foi', group: 'media', name: 'Freedom of information law', desc: 'Citizens and journalists can demand government records.', levels: ['Off', 'On'], costPct: [0, 0.04], effect: 'Trust rises; scandals surface sooner but do less long-term damage.' },
];

export interface SocAction { id: string; name: string; desc: string; costPct: number; cooldown: number; effect: string }
export const SOC_ACTIONS: SocAction[] = [
  { id: 'spin', name: 'Press offensive', desc: 'Brief friendly editors, flood the airwaves with good news.', costPct: 0.03, cooldown: 3, effect: 'Approval +2 now (less when repeated) but public trust falls' },
  { id: 'transparency', name: 'Open-government pledge', desc: 'Publish ministers\' diaries, contracts and spending.', costPct: 0.05, cooldown: 12, effect: 'Public trust +6, scandal heat -15; awkward questions follow' },
  { id: 'factcheck', name: 'Fact-checking unit', desc: 'A public unit that answers rumours and false claims.', costPct: 0.04, cooldown: 8, effect: 'Scandal heat -20, trust +2, press freedom unchanged' },
  { id: 'greenbond', name: 'Green bond issue', desc: 'Borrow from climate-minded investors for clean projects.', costPct: -0.15, cooldown: 24, effect: 'Raises 0.15% of GDP now; renewables +3 pts; adds some debt service' },
];

// ---------- initial state ----------
export function initSociety(s: Pick<GameState, 'countryId' | 'turn'>, c: CountryDef): SocietyState {
  const d = demoCfg(s.countryId), g = greenCfg(s.countryId);
  return {
    young: d.young, old: d.old, work: 100 - d.young - d.old, urban: d.urban, fertility: d.fert, migration: d.mig,
    oldRef: d.old, workRef: 100 - d.young - d.old, urbanRef: d.urban,
    bloc: { youth: 50, workers: 50, elders: 50, rural: 50 },
    emissions: 100, renew: g.renew, risk: g.risk, resilience: 10,
    trust: Math.round(Math.max(20, Math.min(75, 22 + 0.55 * c.stability0 - 12 * c.polarisation))), freedom: g.press, heat: 0, seenEv: 0,
    pol: { family: 0, migration: 1, rural: 0, housing: 0, carbon: 0, renew: 0, adapt: 0, broadcaster: 0, foi: 0 },
    log: [],
  };
}

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const lvl = (s: GameState, id: string) => s.soc?.pol[id] ?? 0;

// ---------- fiscal hooks ----------
export function socCostPct(s: GameState): number {
  if (!s.soc) return 0;
  let t = 0;
  for (const p of SOC_POLICIES) t += p.costPct[Math.min(lvl(s, p.id), p.costPct.length - 1)] ?? 0;
  return t;
}
const CARBON_REV = [0, 0.15, 0.3, 0.5];
export function socRevenuePct(s: GameState): number {
  if (!s.soc) return 0;
  return CARBON_REV[lvl(s, 'carbon')] * (s.soc.emissions / 100);
}
/** Multiplier on the ageing pension and health bill: more older people than the baseline path means a bigger bill. */
export function socAgeFactor(s: GameState): number {
  if (!s.soc) return 1;
  return clamp(s.soc.old / s.soc.oldRef, 0.85, 1.25);
}
/** Multiplier on the chance of a natural disaster this month. */
export function socDisasterFactor(s: GameState): number {
  if (!s.soc) return 1;
  return clamp(0.6 + s.soc.risk / 55, 0.7, 2.4) * (1 - 0.45 * (s.soc.resilience / 100));
}

// ---------- bloc satisfaction ----------
function blocTargets(s: GameState, c: CountryDef) {
  const rel = (k: 'education' | 'health' | 'infrastructure' | 'welfare') => 10 * Math.log(Math.max(0.1, s.spend[k]) / Math.max(0.1, c.spend0[k]));
  const u = s.unemployment - c.unemployment0, inf = s.inflation - c.inflationTarget;
  const incTax = s.tax.incomeTax - c.tax0.incomeTax, vat = s.tax.vat - c.tax0.vat;
  const P = s.soc.pol;
  return {
    youth: 50 + rel('education') * 1.6 - 4 * u + 5 * P.family + (s.soc.urban > 60 ? 2 * P.housing : 0) - 0.8 * (s.soc.heat > 40 ? 3 : 0) + 3 * (s.soc.risk > 60 ? -(1 - Math.min(1, P.carbon)) : 0) + 2.5 * P.carbon,
    workers: 50 - 4.5 * u - 3 * inf - 1.5 * incTax - 1.2 * vat + 8 * (s.growth - c.potentialGrowth) / 3 - 5 * P.carbon + (P.migration === 2 ? -4 * c.polarisation * 1.5 : 0) + (P.migration === 0 ? 3 * c.polarisation : 0),
    elders: 50 + rel('welfare') * 0.9 + rel('health') * 1.4 - 3 * inf - (s.flags.pensionReform ? 14 : 0) + (P.migration === 2 ? -3 * c.polarisation : 0) + (P.migration === 0 ? 2 * c.polarisation : 0),
    rural: 50 + rel('infrastructure') * 0.7 + 9 * P.rural - 4 * P.housing - 6 * P.carbon - 2 * u + (s.commodity - 100) * 0.04 * c.commodityExports,
  };
}

// ---------- monthly step ----------
export function stepSociety(s: GameState, c: CountryDef, rnd: () => number, notes: string[]) {
  const so = s.soc, d = demoCfg(s.countryId), g = greenCfg(s.countryId), P = so.pol, dt = 1 / 12;

  // --- Demographics ---
  const fertTarget = d.fert + [-0.05, 0.12, 0.3][P.family] - 0.02 * Math.max(0, (s.gdp * 1000 / s.population) / 20000);
  so.fertility += 0.02 * (fertTarget - so.fertility);
  const migTarget = d.mig + (P.migration - 1) * 3.5;
  so.migration += 0.08 * (migTarget - so.migration);
  so.young = clamp(so.young + dt * (d.ty + so.young * (so.fertility / d.fert - 1) / 15), 5, 45);
  const refOld = d.to * dt;
  so.oldRef += refOld;
  so.old = clamp(so.old + refOld - dt * (so.migration - d.mig) / 1000 * so.old * 0.5, 2, 45);
  so.workRef = clamp(so.workRef - refOld - dt * d.ty, 30, 80); // baseline working share = 100 - baseline young - baseline old
  so.work = clamp(100 - so.young - so.old, 30, 80);
  // migrants are mostly working age: they raise the working share a little above its path
  so.work = clamp(so.work + clamp((so.migration - d.mig) * 0.03, -0.6, 0.8), 30, 80);
  so.urban = clamp(so.urban + dt * (d.tu * (P.rural ? 0.55 : 1) * (1 + 0.15 * P.housing)), 5, 98);
  so.urbanRef = clamp(so.urbanRef + dt * d.tu, 5, 98);
  // extra people from migration beyond the baseline path
  s.population *= 1 + ((so.migration - d.mig) / 1000) * dt;

  // --- Climate ---
  const globalTrend = 0.22 + 0.04 * Math.max(0, s.globalCycle);
  so.risk = clamp(so.risk + dt * globalTrend * (1 + 0.003 * (so.emissions - 100)), 5, 100);
  const renewRate = 0.5 + (P.renew ? 0.9 : 0) + 0.35 * P.carbon;
  so.renew = clamp(so.renew + dt * renewRate, 0, 98);
  const carbonCut = [0, 0.06, 0.13, 0.22][P.carbon];
  const target = 100 * Math.pow(Math.max(0.3, s.realIdx / 100), 0.7) * (1 - 0.0075 * (so.renew - g.renew)) * (1 - carbonCut) * (1 - 0.0004 * (s.stocks.efficiency - c.stock0.efficiency));
  so.emissions += 0.06 * (target - so.emissions);
  so.resilience = clamp(so.resilience + dt * ((P.adapt ? 9 : -1.5) + 0.04 * (s.stocks.infrastructure - c.stock0.infrastructure)), 0, 100);

  // --- Media ---
  const evs = s.eventHistory;
  for (let i = so.seenEv; i < evs.length; i++) if (['scandal', 'leakedMemo', 'pressProbe'].includes(evs[i].id)) so.heat = clamp(so.heat + 28, 0, 100);
  so.seenEv = evs.length;
  const scandalChance = (0.012 + 0.00018 * Math.max(0, 60 - s.stocks.efficiency)) * (P.foi ? 1.3 : 1) * (s.programs.anticorruption ? 0.6 : 1) * (s.difficulty.stability);
  if (s.pol.inGovernment && rnd() < scandalChance) { so.heat = clamp(so.heat + 14 + 10 * rnd(), 0, 100); notes.push('Press reports raise questions about the government\'s conduct.'); }
  so.heat = clamp(so.heat * (P.foi ? 0.86 : 0.92) - 0.2, 0, 100);
  const trustTarget = 38 + 0.3 * (s.approval - 40) + 0.2 * (s.stocks.efficiency - c.stock0.efficiency) + (P.broadcaster ? 9 : 0) + (P.foi ? 6 : 0) + 0.12 * (so.freedom - g.press) - 0.35 * Math.max(0, so.heat - 25) - 5 * c.polarisation + 0.15 * (c.stability0 - 50);
  so.trust = clamp(so.trust + 0.05 * (trustTarget - so.trust), 5, 95);
  so.freedom = clamp(so.freedom + 0.01 * (g.press - so.freedom), 5, 95);

  // --- Blocs and approval ---
  const bt = blocTargets(s, c);
  (Object.keys(bt) as (keyof typeof bt)[]).forEach((k) => { so.bloc[k] = clamp(so.bloc[k] + 0.15 * (clamp(bt[k], 5, 95) - so.bloc[k]), 0, 100); });
  const wy = so.young / 100, ww = so.work / 100, we = so.old / 100, wr = (100 - so.urban) / 100;
  const wsum = wy + ww + we + wr;
  const blocApproval = 2.4 * ((wy * (so.bloc.youth - 50) + ww * (so.bloc.workers - 50) + we * (so.bloc.elders - 50) + wr * (so.bloc.rural - 50)) / wsum) / 50;

  // --- Effects through modifiers (one month each; re-applied every turn) ---
  const workGap = so.work - so.workRef;
  const urbanGain = 0.012 * (so.urban - so.urbanRef) * (P.housing ? 1.5 : 1) - (P.rural ? 0.01 : 0);
  const heat = Math.max(0, so.heat - 40);
  const m = {
    growth: clamp(0.09 * workGap, -0.35, 0.35) + urbanGain + (P.housing ? 0.03 : 0) + (P.renew ? 0.03 : 0)
      - [0, 0.03, 0.08, 0.15][P.carbon] * (1 + 1.5 * c.commodityExports)
      - 0.004 * Math.max(0, so.risk - 50) * (1 - so.resilience / 150),
    inflation: [0, 0.1, 0.25, 0.45][P.carbon] - (P.renew ? 0.03 : 0),
    unemployment: P.migration === 2 ? 0.1 : P.migration === 0 ? -0.05 : 0,
    approval: blocApproval + 0.04 * (so.trust - 50) - 0.05 * heat,
    stability: 0.03 * (so.trust - 50) + 0.015 * (so.freedom - 50) - 0.03 * heat + (P.rural ? 0.3 : 0),
    confidence: 0.025 * (so.freedom - 50) + 0.02 * (so.trust - 50) + (P.carbon > 0 ? 0.4 : 0) * (so.risk > 60 ? 1 : 0) + (P.migration === 0 && c.agingDrag > 0.3 ? -0.5 : 0) - 0.5 * Math.max(0, so.heat - 60) / 40,
  };
  s.modifiers.push({ id: 'society', label: 'Society, climate and public mood', monthsLeft: 1, growth: m.growth, inflation: m.inflation, unemployment: m.unemployment, approval: m.approval, stability: m.stability, confidence: m.confidence });

  if (so.risk > 70 && s.turn % 36 === 0 && s.turn > 0) notes.push('Climate scientists warn the hazard level is climbing. A resilience programme would cut disaster damage.');
  if (so.heat > 60 && rnd() < 0.2) notes.push('Scandal coverage dominates the news cycle and is eroding trust.');
}

// ---------- player actions ----------
export function setSocPolicy(s: GameState, id: string, level: number): string {
  const p = SOC_POLICIES.find((x) => x.id === id);
  if (!p) return 'Unknown policy';
  const lv = clamp(Math.round(level), 0, p.levels.length - 1);
  if (lv === s.soc.pol[id]) return '';
  s.soc.pol[id] = lv;
  return `${p.name}: ${p.levels[lv]}`;
}

export function socActionAvailability(s: GameState, id: string): { ok: boolean; reason?: string } {
  if (s.gameOver) return { ok: false, reason: 'Game over' };
  const cd = s.cooldowns['sa_' + id] ?? 0;
  return cd > 0 ? { ok: false, reason: `Available in ${cd} month(s)` } : { ok: true };
}

export function runSocAction(s: GameState, id: string, fx: { cost(p: number): void; approval(d: number): void }): string {
  const a = SOC_ACTIONS.find((x) => x.id === id);
  const av = socActionAvailability(s, id);
  if (!a || !av.ok) return av.reason ?? 'Not available';
  const so = s.soc;
  fx.cost(a.costPct);
  s.cooldowns['sa_' + id] = a.cooldown;
  const use = s.flags['use_sa_' + id] ?? 0; s.flags['use_sa_' + id] = use + 1;
  const scale = 1 / (1 + 0.8 * use);
  if (id === 'spin') { fx.approval((so.trust > 50 ? 2.5 : 1.8) * scale * (s.soc.pol.broadcaster ? 0.7 : 1)); so.trust = clamp(so.trust - 2.5, 0, 100); }
  if (id === 'transparency') { so.trust = clamp(so.trust + 6, 0, 100); so.heat = clamp(so.heat - 15, 0, 100); }
  if (id === 'factcheck') { so.heat = clamp(so.heat - 20, 0, 100); so.trust = clamp(so.trust + 2, 0, 100); }
  if (id === 'greenbond') { so.renew = clamp(so.renew + 3, 0, 98); s.debt += 0.0015 * s.gdp; }
  return 'Done: ' + a.effect;
}

// ---------- summaries for the UI ----------
export const dependency = (s: GameState) => ((s.soc.young + s.soc.old) / Math.max(1, s.soc.work)) * 100;
export const co2PerCapita = (s: GameState) => greenCfg(s.countryId).co2 * (s.soc.emissions / 100);

// ---------- events ----------
const cl = clamp;
export const SOCIETY_EVENTS: EventDef[] = [
  {
    id: 'climateSummit', title: 'Climate summit: pledge your target', icon: '🌍', category: 'Politics', cooldown: 60,
    weight: (s) => (s.pol.inGovernment && s.turn > 12 ? 0.35 : 0),
    text: () => 'Leaders gather for a climate summit. Allies expect a national pledge; green voters and investors are watching, and so are industry lobbyists.',
    choices: [
      { label: 'Ambitious pledge', hint: 'Carbon price rises a notch; confidence and friends gained, higher prices', run: (fx) => { const so = fx.s.soc; so.pol.carbon = cl(so.pol.carbon + 1, 0, 3); fx.confidence(3); fx.approval(-1); fx.stability(0.5); return 'You sign up to deep cuts. A higher carbon price follows, and so does the praise abroad.'; } },
      { label: 'Cautious, costed pledge', hint: 'Fund renewables; modest everywhere', run: (fx) => { fx.s.soc.pol.renew = 1; fx.cost(0.1); fx.confidence(1); return 'A realistic target, backed by a renewables fund.'; } },
      { label: 'Refuse to commit', hint: 'Protects industry now; reputational cost', run: (fx) => { fx.confidence(-2); fx.stability(-0.5); fx.mod('Green investor chill', 12, { growth: -0.04 }); fx.approval(0.5); return 'Industry cheers; diplomats wince.'; } },
    ],
  },
  {
    id: 'heatDrought', title: 'Record heat and drought', icon: '🔥', category: 'Crisis', cooldown: 30,
    weight: (s, c) => (s.soc ? Math.max(0, (s.soc.risk - 35) / 45) * (c.id === 'canada' || c.id === 'australia' || c.commodityExports > 0.3 || c.openness < 0.5 ? 1.2 : 0.8) * (1 - 0.5 * s.soc.resilience / 100) : 0),
    text: () => 'A record heatwave has cracked the soil. Crops are failing, rivers are low and power demand is at its limit.',
    choices: [
      { label: 'Emergency water and farm relief', hint: 'Costs ~0.4% of GDP; softens the blow', run: (fx) => { fx.cost(0.4); fx.mod('Drought disruption', 4, { growth: -0.2, inflation: 0.15 }); fx.approval(1); return 'Relief reaches farms and towns. Prices still rise, but gently.'; } },
      { label: 'Fast-track resilience plan', hint: 'Costs ~0.3% of GDP; turns on the resilience programme', run: (fx) => { fx.cost(0.3); fx.s.soc.pol.adapt = 1; fx.s.soc.resilience = cl(fx.s.soc.resilience + 8, 0, 100); fx.mod('Drought disruption', 6, { growth: -0.3, inflation: 0.2 }); return 'You commit to long-term defences while the summer is still bad.'; } },
      { label: 'Let the market adjust', hint: 'No cost; harsh on farms and the poor', run: (fx) => { fx.mod('Drought disruption', 9, { growth: -0.45, inflation: 0.4 }); fx.approval(-2.5); fx.stability(-2); return 'Food prices jump and rural anger grows.'; } },
    ],
  },
  {
    id: 'greenInvestors', title: 'Green investors come calling', icon: '🌱', category: 'Opportunity', cooldown: 72,
    weight: (s) => (s.soc && s.pol.inGovernment && (s.soc.pol.carbon > 0 || s.soc.pol.renew > 0) && s.confidence > 45 ? 0.35 : 0),
    text: () => 'A consortium of climate funds offers to finance wind, solar and grid projects, if the policy framework stays stable.',
    choices: [
      { label: 'Co-invest with the funds', hint: 'Costs ~0.5% of GDP over 3 years; clean power and jobs', run: (fx) => { fx.project({ key: 'greengrid', name: 'Clean power & grid partnership', icon: '⚡', desc: 'Solar, wind and grid upgrades built with private climate funds.', months: 36, foreign: false, costPct: 0.5, maintenance: 0.03, asset: { infrastructure: 2 }, mod: { growth: 0.1, inflation: -0.03, confidence: 1.2 }, sector: { energy: 0.8, construction: 0.4 } }); fx.s.soc.renew = cl(fx.s.soc.renew + 4, 0, 98); fx.approval(1); return 'Construction begins on a new generation of clean power.'; } },
      { label: 'Let the funds build alone', hint: 'No cost; smaller benefit, foreign-owned', run: (fx) => { fx.s.soc.renew = cl(fx.s.soc.renew + 2, 0, 98); fx.mod('Foreign-built clean power', 30, { growth: 0.05, confidence: 1 }); return 'The funds go ahead under tight rules.'; } },
      { label: 'Decline', hint: 'Keeps control; chance missed', run: (fx) => { fx.approval(0.3); return 'You pass.'; } },
    ],
  },
  {
    id: 'leakedMemo', title: 'Leaked memo', icon: '📄', category: 'Politics', cooldown: 30,
    weight: (s) => (s.soc && s.pol.inGovernment ? 0.4 + 0.012 * s.soc.heat + (s.soc.pol.foi ? -0.15 : 0.1) : 0),
    text: () => 'A confidential memo showing how the government weighed an unpopular decision has been leaked to the press. The wording looks bad.',
    choices: [
      { label: 'Publish the full documents', hint: 'Short-term pain, builds trust', run: (fx) => { fx.approval(-1.2); fx.s.soc.trust = cl(fx.s.soc.trust + 3, 0, 100); fx.s.soc.heat = cl(fx.s.soc.heat - 10, 0, 100); return 'The full record is less damning than the leak. Credit for openness.'; } },
      { label: 'Launch a leak inquiry', hint: 'Looks defensive; may chill the press', run: (fx) => { fx.s.soc.freedom = cl(fx.s.soc.freedom - 4, 0, 100); fx.approval(-1.5); fx.stability(0.5); return 'Journalists complain of intimidation; the story lingers.'; } },
      { label: 'Say nothing', hint: 'A gamble', run: (fx) => { if (fx.rnd() < 0.5) { fx.approval(-0.5); return 'The story fades.'; } fx.approval(-3.5); fx.s.soc.heat = cl(fx.s.soc.heat + 15, 0, 100); return 'Silence is read as guilt; it becomes a week-long story.'; } },
    ],
  },
  {
    id: 'pressProbe', title: 'Newspaper investigation', icon: '🕵️', category: 'Politics', cooldown: 36,
    weight: (s) => (s.soc && s.pol.inGovernment && s.stocks.efficiency < 55 ? 0.35 : 0),
    text: () => 'A newspaper investigation alleges favouritism in awarding public contracts. Editors say they have more documents coming.',
    choices: [
      { label: 'Order an independent audit', hint: 'Credible; may find more', run: (fx) => { fx.cost(0.03); fx.s.soc.trust = cl(fx.s.soc.trust + 2, 0, 100); fx.stock('efficiency', 1.5); fx.approval(-1); return 'An independent auditor is appointed and gets to work.'; } },
      { label: 'Discredit the paper', hint: 'Rallies loyalists; damages trust and press freedom', run: (fx) => { fx.s.soc.freedom = cl(fx.s.soc.freedom - 5, 0, 100); fx.s.soc.trust = cl(fx.s.soc.trust - 4, 0, 100); fx.approval(0.5); return 'Your base likes the fight; everyone else notices.'; } },
      { label: 'Sue for defamation', hint: 'Costs trust; chills critics', run: (fx) => { fx.s.soc.freedom = cl(fx.s.soc.freedom - 6, 0, 100); fx.approval(-1); fx.confidence(-1); return 'A lawsuit makes things worse in the international press.'; } },
    ],
  },
  {
    id: 'rumourWave', title: 'Viral rumours and fake news', icon: '📱', category: 'Politics', cooldown: 40,
    weight: (s) => (s.soc ? 0.3 + 0.008 * Math.max(0, 55 - s.soc.trust) : 0),
    text: () => 'False stories about the budget are spreading on social media and in chat groups. Some are believed.',
    choices: [
      { label: 'Fund a fact-checking unit', hint: 'Costs ~0.04% of GDP; calms things', run: (fx) => { fx.cost(0.04); fx.s.soc.heat = cl(fx.s.soc.heat - 8, 0, 100); fx.s.soc.trust = cl(fx.s.soc.trust + 2, 0, 100); return 'Rumours are answered within hours.'; } },
      { label: 'Regulate the platforms', hint: 'Effective but censors speech', run: (fx) => { fx.s.soc.freedom = cl(fx.s.soc.freedom - 6, 0, 100); fx.stability(0.8); fx.approval(-0.5); return 'Posts vanish and so do some real critics.'; } },
      { label: 'Ignore it', hint: 'Free; costs trust', run: (fx) => { fx.s.soc.trust = cl(fx.s.soc.trust - 4, 0, 100); fx.approval(-1); return 'The rumours settle into public belief.'; } },
    ],
  },
  {
    id: 'ageingDebate', title: 'The workforce is getting older', icon: '👵', category: 'Policy', cooldown: 72,
    weight: (s, c) => (s.soc && s.soc.old > 15 && s.pol.inGovernment ? 0.2 + c.agingDrag * 0.4 : 0),
    text: (s) => `${s.soc.old.toFixed(0)}% of the population is now over 65. Employers say they cannot find workers and the pension fund is under strain.`,
    choices: [
      { label: 'Raise the retirement age', hint: 'Cheaper pensions; angry elders', run: (fx) => { fx.s.flags.pensionReform = 1; fx.approval(-3); fx.stability(-1); fx.mod('Longer working lives', 36, { growth: 0.08 }); return 'The retirement age rises. Unions and pensioners are furious.'; } },
      { label: 'Open the door to skilled workers', hint: 'Immigration up a notch', run: (fx) => { fx.s.soc.pol.migration = cl(fx.s.soc.pol.migration + 1, 0, 2); fx.approval(-0.5); return 'A fast track for skilled workers is announced. Opinions are split.'; } },
      { label: 'Back a family package', hint: 'Costs money; long payoff', run: (fx) => { fx.s.soc.pol.family = cl(fx.s.soc.pol.family + 1, 0, 2); fx.approval(1.2); return 'Child benefits expand. The payoff comes in 15 years.'; } },
      { label: 'Study the problem', hint: 'No change', run: (fx) => { fx.approval(-0.3); return 'A commission is appointed to report in two years.'; } },
    ],
  },
];
