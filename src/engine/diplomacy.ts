// International relations: nations, trade agreements, organisations, sanctions, aid and loans.
import { COUNTRIES } from './countries';
import type { DiploState, GameState, NationState } from './types';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const rnd1 = (x: number) => Math.round(x * 10) / 10;

export interface Nation { id: string; name: string; flag: string; size: number; blurb: string; rich: boolean }
export const WORLD: Nation[] = [
  { id: 'usa', name: 'United States', flag: '🇺🇸', size: 25, blurb: 'Largest economy; global security and finance hub.', rich: true },
  { id: 'china', name: 'China', flag: '🇨🇳', size: 18, blurb: 'Factory of the world; big lender and investor.', rich: false },
  { id: 'eu', name: 'European Union', flag: '🇪🇺', size: 17, blurb: 'Huge single market with strict standards.', rich: true },
  { id: 'japan', name: 'Japan', flag: '🇯🇵', size: 5, blurb: 'Technology and aid heavyweight.', rich: true },
  { id: 'india', name: 'India', flag: '🇮🇳', size: 4, blurb: 'Fast-growing giant and regional power.', rich: false },
  { id: 'uk', name: 'United Kingdom', flag: '🇬🇧', size: 3.2, blurb: 'Finance, services and Commonwealth ties.', rich: true },
  { id: 'gulf', name: 'Gulf States', flag: '🇦🇪', size: 3, blurb: 'Oil money, investors and labour importers.', rich: true },
  { id: 'asean', name: 'ASEAN bloc', flag: '🌏', size: 3.2, blurb: 'Dynamic Southeast Asian markets.', rich: false },
  { id: 'russia', name: 'Russia', flag: '🇷🇺', size: 2, blurb: 'Energy exporter and military power.', rich: false },
  { id: 'canada', name: 'Canada', flag: '🇨🇦', size: 2, blurb: 'Resource-rich North American partner.', rich: true },
  { id: 'brazil', name: 'Brazil', flag: '🇧🇷', size: 2.2, blurb: 'Agricultural and mineral giant.', rich: false },
  { id: 'australia', name: 'Australia', flag: '🇦🇺', size: 1.6, blurb: 'Mining and agriculture exporter.', rich: true },
  { id: 'pakistan', name: 'Pakistan', flag: '🇵🇰', size: 0.5, blurb: 'Populous neighbour with fraught politics.', rich: false },
];
export const RIVALS: Record<string, string[]> = {
  usa: ['china', 'russia'], china: ['usa', 'japan', 'india'], russia: ['usa', 'eu', 'uk', 'japan'], india: ['china', 'pakistan'], pakistan: ['india'],
  japan: ['china', 'russia'], eu: ['russia'], uk: ['russia'], australia: ['china'], canada: ['russia'],
};
// Starting relations (0-100) and trade-weight multipliers by player country
const REL: Record<string, Record<string, number>> = {
  nepal: { india: 62, china: 58, usa: 56, eu: 55, japan: 60, uk: 58, gulf: 60, pakistan: 48, russia: 45 },
  india: { china: 36, pakistan: 15, usa: 64, russia: 62, japan: 70, eu: 60, uk: 60, gulf: 68, australia: 66, canada: 50, asean: 62 },
  uk: { usa: 80, eu: 55, china: 40, russia: 20, india: 60, canada: 82, australia: 82, japan: 72, gulf: 62 },
  usa: { uk: 82, canada: 82, japan: 78, eu: 68, china: 33, russia: 18, india: 62, australia: 82, gulf: 58, pakistan: 42 },
  germany: { usa: 72, uk: 64, china: 50, russia: 26, india: 60, japan: 68, canada: 70, australia: 66, gulf: 60 },
  japan: { usa: 82, china: 34, russia: 30, australia: 74, india: 68, eu: 66, uk: 70, asean: 68, canada: 66 },
  canada: { usa: 80, uk: 80, eu: 70, china: 40, russia: 28, japan: 68, australia: 76, india: 52 },
  australia: { uk: 80, usa: 86, japan: 72, china: 40, eu: 62, india: 62, canada: 76, asean: 64, russia: 28 },
};
const TRADE_MULT: Record<string, Record<string, number>> = {
  nepal: { india: 7, china: 2 }, india: { china: 1.8, usa: 1.4, gulf: 2.2, pakistan: 3 }, uk: { eu: 2.4, usa: 1.2 }, usa: { canada: 3, china: 1.2 },
  germany: { usa: 1.2, uk: 1.3 }, japan: { china: 1.8, usa: 1.3, asean: 1.8 }, canada: { usa: 6 }, australia: { china: 2.4, japan: 2.2, asean: 1.6 },
};

export interface Org { id: string; name: string; kind: 'global' | 'bloc' | 'security'; desc: string; member0: boolean; gate?: string[]; trade: number; stab: number; cost: number }
const GL: Org[] = [
  { id: 'wto', name: 'World Trade Organization', kind: 'global', desc: 'Rules-based trade; permanent membership.', member0: true, trade: 0.8, stab: 0, cost: 0 },
  { id: 'imf', name: 'IMF & World Bank', kind: 'global', desc: 'Access to concessional loans; permanent membership.', member0: true, trade: 0, stab: 0, cost: 0 },
];
const ORGS: Record<string, Org[]> = {
  nepal: [...GL, { id: 'bimstec', name: 'BIMSTEC', kind: 'bloc', desc: 'Bay of Bengal regional cooperation.', member0: true, trade: 0.8, stab: 0, cost: 0.01 }],
  india: [...GL, { id: 'brics', name: 'BRICS', kind: 'bloc', desc: 'Emerging-economy bloc.', member0: true, trade: 0.8, stab: 0, cost: 0.01 }, { id: 'quad', name: 'Quad dialogue', kind: 'security', desc: 'Security talks with the US, Japan and Australia.', member0: false, gate: ['usa', 'japan', 'australia'], trade: 0, stab: 1.5, cost: 0.03 }],
  uk: [...GL, { id: 'nato', name: 'NATO', kind: 'security', desc: 'Collective defence.', member0: true, trade: 0, stab: 2.5, cost: 0.1 }, { id: 'commonwealth', name: 'Commonwealth', kind: 'bloc', desc: 'Historic ties and trade links.', member0: true, trade: 0.6, stab: 0, cost: 0.01 }, { id: 'cptpp', name: 'CPTPP trade pact', kind: 'bloc', desc: 'Pacific trade partnership.', member0: false, gate: ['japan', 'australia', 'canada'], trade: 1.2, stab: 0, cost: 0.02 }],
  usa: [...GL, { id: 'nato', name: 'NATO', kind: 'security', desc: 'Collective defence.', member0: true, trade: 0, stab: 2.5, cost: 0.1 }, { id: 'usmca', name: 'North American trade pact', kind: 'bloc', desc: 'Free trade with Canada and Mexico.', member0: true, trade: 1.0, stab: 0, cost: 0.01 }],
  germany: [...GL, { id: 'nato', name: 'NATO', kind: 'security', desc: 'Collective defence.', member0: true, trade: 0, stab: 2.5, cost: 0.1 }, { id: 'eumarket', name: 'EU single market', kind: 'bloc', desc: 'Frictionless trade across Europe.', member0: true, trade: 2.0, stab: 0.5, cost: 0.02 }],
  japan: [...GL, { id: 'usjp', name: 'US–Japan alliance', kind: 'security', desc: 'American security guarantee.', member0: true, trade: 0, stab: 3, cost: 0.08 }, { id: 'cptpp', name: 'CPTPP trade pact', kind: 'bloc', desc: 'Pacific trade partnership.', member0: true, trade: 1.2, stab: 0, cost: 0.02 }],
  canada: [...GL, { id: 'nato', name: 'NATO', kind: 'security', desc: 'Collective defence.', member0: true, trade: 0, stab: 2.5, cost: 0.1 }, { id: 'usmca', name: 'North American trade pact', kind: 'bloc', desc: 'Free trade with the US and Mexico.', member0: true, trade: 1.4, stab: 0, cost: 0.01 }],
  australia: [...GL, { id: 'anzus', name: 'ANZUS / AUKUS', kind: 'security', desc: 'Security pact with the US and UK.', member0: true, trade: 0, stab: 2.5, cost: 0.08 }, { id: 'cptpp', name: 'CPTPP trade pact', kind: 'bloc', desc: 'Pacific trade partnership.', member0: true, trade: 1.2, stab: 0, cost: 0.02 }],
};
export const orgsOf = (s: GameState) => ORGS[s.countryId];
export const nationsOf = (s: GameState) => WORLD.filter((n) => n.id !== s.countryId && !(s.countryId === 'germany' && n.id === 'eu'));
export const getNation = (id: string) => WORLD.find((n) => n.id === id)!;
export const baseRel = (cid: string, nid: string) => REL[cid]?.[nid] ?? 50;

export function tradeWeights(s: GameState): Record<string, number> {
  const out: Record<string, number> = {}; let tot = 0;
  for (const n of nationsOf(s)) { out[n.id] = n.size * (TRADE_MULT[s.countryId]?.[n.id] ?? 1); tot += out[n.id]; }
  for (const k of Object.keys(out)) out[k] /= tot;
  return out;
}

export function initDiplo(countryId: string): DiploState {
  const nations: Record<string, NationState> = {};
  for (const n of WORLD) {
    if (n.id === countryId || (countryId === 'germany' && n.id === 'eu')) continue;
    const rel = baseRel(countryId, n.id);
    nations[n.id] = { rel, trade: rel >= 78 ? 1 : 0, negotiating: 0, sanctionedByYou: false, sanctionsYou: false, ally: false };
  }
  const orgs: Record<string, boolean> = {}; ORGS[countryId].forEach((o) => (orgs[o.id] = o.member0));
  const d: DiploState = { nations, orgs, loans: [], influence: 0, log: [] };
  return d;
}

export interface DipEffects { x: number; m: number; fdi: number; conf: number; stab: number; growth: number }
export function effects(s: GameState): DipEffects {
  const c = COUNTRIES[s.countryId]; const w = tradeWeights(s); const D = s.dip;
  let x = 0, m = 0, fdi = 0, relAvg = 0;
  for (const id of Object.keys(D.nations)) {
    const n = D.nations[id];
    const rel = (n.rel - baseRel(s.countryId, id)) / 50; // deviation from the starting relationship
    const t0 = baseRel(s.countryId, id) >= 78 ? 1 : 0;
    x += w[id] * (1.5 * (n.trade - t0) + 1.2 * rel - (n.sanctionsYou ? 3.5 : 0) - (n.sanctionedByYou ? 1.0 : 0));
    m += w[id] * (1.2 * (n.trade - t0) + 0.6 * rel - (n.sanctionedByYou ? 1.5 : 0));
    fdi += w[id] * (0.8 * (n.trade - t0) + 0.5 * rel - (n.sanctionsYou ? 1.5 : 0));
    relAvg += w[id] * (n.rel - baseRel(s.countryId, id));
  }
  let ox = 0, stab = 0, cost = 0;
  for (const o of ORGS[s.countryId]) { const d = (D.orgs[o.id] ? 1 : 0) - (o.member0 ? 1 : 0); ox += d * o.trade; stab += d * o.stab; cost += d * o.cost; }
  for (const n of Object.values(D.nations)) if (n.ally) stab += 1.2;
  stab = clamp(stab, -6, 7);
  void cost;
  return { x: c.openness * 6 * x + ox * c.openness * 1.4, m: c.openness * 6 * m + ox * c.openness * 1.0, fdi: 0.25 * fdi + 0.02 * ox, conf: clamp(0.05 * relAvg, -4, 4), stab, growth: 0 };
}
export const orgCostPct = (s: GameState) => (s.dip ? ORGS[s.countryId].reduce((a, o) => a + ((s.dip.orgs[o.id] ? 1 : 0) - (o.member0 ? 1 : 0)) * o.cost, 0) : 0);
export const loanPaymentPct = (s: GameState) => (s.dip && s.gdp ? (s.dip.loans.reduce((a, l) => a + (l.amount / (l.monthsLeft + 0) + l.remaining * l.ratePct / 1200) * 12, 0) / s.gdp) * 100 * 0 : 0);

export function influence(s: GameState): number {
  const D = s.dip; let v = 0, tot = 0;
  for (const n of nationsOf(s)) { v += n.size * (D.nations[n.id].rel / 100); tot += n.size; }
  const gdpShare = Math.min(1, s.gdp / 8000);
  return clamp((v / tot) * 70 + 30 * Math.sqrt(gdpShare), 0, 100);
}

const addLog = (s: GameState, t: string) => { s.dip.log.unshift(`${s.y}: ${t}`); s.dip.log = s.dip.log.slice(0, 25); };

export function stepDiplomacy(s: GameState, rnd: () => number, notes: string[]): DipEffects {
  const D = s.dip; const c = COUNTRIES[s.countryId];
  const gauss = () => Math.sqrt(-2 * Math.log(Math.max(1e-9, rnd()))) * Math.cos(2 * Math.PI * rnd());
  const allies = Object.keys(D.nations).filter((k) => D.nations[k].ally);
  for (const id of Object.keys(D.nations)) {
    const n = D.nations[id];
    let target = baseRel(s.countryId, id) + 8 * n.trade + (n.ally ? 10 : 0) - (n.sanctionsYou ? 15 : 0) - (n.sanctionedByYou ? 18 : 0);
    for (const a of allies) if (RIVALS[a]?.includes(id)) target -= 8;
    n.rel = clamp(n.rel + 0.04 * (target - n.rel) + 0.5 * gauss(), 2, 98);
    if (n.negotiating > 0) {
      n.negotiating--;
      if (n.negotiating === 0) {
        const p = clamp((n.rel - 35) / 45, 0.25, 0.92);
        if (rnd() < p) { n.trade = Math.min(2, n.trade + 1) as 1 | 2; n.rel = clamp(n.rel + 4, 0, 98); s.approval = clamp(s.approval + 0.5, 3, 95); notes.push(`🤝 Trade agreement with ${getNation(id).name} signed (${n.trade === 2 ? 'deep' : 'free-trade'}).`); addLog(s, `${n.trade === 2 ? 'Deep' : 'Free-trade'} agreement with ${getNation(id).name}`); }
        else { n.rel = clamp(n.rel - 3, 0, 98); notes.push(`Trade talks with ${getNation(id).name} collapsed.`); addLog(s, `Trade talks with ${getNation(id).name} collapsed`); }
      }
    }
    if (n.sanctionsYou && n.rel > 45 && rnd() < 0.05) { n.sanctionsYou = false; notes.push(`${getNation(id).name} lifted its sanctions on you.`); }
  }
  // loans: interest + principal repaid from the budget
  for (const l of [...D.loans]) {
    const pay = l.remaining / Math.max(1, l.monthsLeft) + (l.remaining * l.ratePct) / 1200;
    s.pendingCosts += pay; s.debt = Math.max(0, s.debt - l.remaining / Math.max(1, l.monthsLeft));
    l.remaining -= l.remaining / Math.max(1, l.monthsLeft); l.monthsLeft--;
    if (l.monthsLeft <= 0) { D.loans = D.loans.filter((x) => x !== l); notes.push(`The ${getNation(l.lender)?.name ?? l.lender} loan is fully repaid.`); }
  }
  s.pendingCosts += (orgCostPct(s) / 100) * s.gdp / 12;
  D.influence = influence(s);
  void c;
  return effects(s);
}

// ---------- actions ----------
const use = (s: GameState, k: string) => s.flags['use_' + k] ?? 0;
const cooldown = (s: GameState, k: string, add: number, lim: number): boolean => { if (use(s, k) > lim) return false; s.flags['use_' + k] = use(s, k) + add; return true; };

export function delegation(s: GameState, id: string): string | null {
  if (!s.pol.inGovernment) return 'Only the government can do this - you are in opposition.';
  const n = s.dip.nations[id]; if (!n) return 'Unknown';
  if (!cooldown(s, 'dele_' + id, 1.5, 0.9)) return 'You sent a delegation recently. Give it a few months.';
  s.pendingCosts += 0.0002 * s.gdp; n.rel = clamp(n.rel + 4, 0, 98);
  return `Delegation to ${getNation(id).name}: relations improve (+4).`;
}
export function summit(s: GameState, id: string): string | null {
  if (!s.pol.inGovernment) return 'Only the government can do this - you are in opposition.';
  const n = s.dip.nations[id];
  if (n.rel < 50) return 'They are not ready for a summit (relations below 50).';
  if (!cooldown(s, 'summit_' + id, 6, 5)) return 'A summit was held recently.';
  s.pendingCosts += 0.0005 * s.gdp; n.rel = clamp(n.rel + 8, 0, 98); s.approval = clamp(s.approval + 0.5, 3, 95);
  return `Summit with ${getNation(id).name}: a warm photo-op (+8).`;
}
export function negotiateTrade(s: GameState, id: string): string | null {
  if (!s.pol.inGovernment) return 'Only the government can do this - you are in opposition.';
  const n = s.dip.nations[id];
  if (n.negotiating > 0) return 'Talks already under way.';
  if (n.trade >= 2) return 'Already a deep agreement.';
  const need = n.trade === 0 ? 55 : 68;
  if (n.rel < need) return `Relations must be ${need}+ to start talks.`;
  if (n.sanctionsYou || n.sanctionedByYou) return 'Sanctions block talks.';
  n.negotiating = n.trade === 0 ? 8 : 12; s.pendingCosts += 0.0004 * s.gdp;
  return `Trade talks with ${getNation(id).name} begin (${n.negotiating} months).`;
}
export function cancelTrade(s: GameState, id: string): string | null {
  if (!s.pol.inGovernment) return 'Only the government can do this - you are in opposition.';
  const n = s.dip.nations[id]; if (n.trade === 0 && !n.negotiating) return 'Nothing to cancel.';
  n.trade = 0; n.negotiating = 0; n.rel = clamp(n.rel - 10, 0, 98); s.stability = clamp(s.stability - 1, 3, 98);
  return 'Agreement cancelled. Relations suffer.';
}
export function sanction(s: GameState, id: string): string | null {
  if (!s.pol.inGovernment) return 'Only the government can do this - you are in opposition.';
  const n = s.dip.nations[id];
  if (n.sanctionedByYou) { n.sanctionedByYou = false; n.rel = clamp(n.rel + 5, 0, 98); return 'Sanctions lifted.'; }
  n.sanctionedByYou = true; n.rel = clamp(n.rel - 15, 0, 98);
  for (const r of RIVALS[id] ?? []) if (s.dip.nations[r]) s.dip.nations[r].rel = clamp(s.dip.nations[r].rel + 2, 0, 98);
  if (RIVALS[id]?.some((r) => s.dip.nations[r]?.ally)) s.approval = clamp(s.approval + 0.5, 3, 95);
  if (getNation(id).size > 10 && Math.random() < 0.5) n.sanctionsYou = true;
  return `You impose sanctions on ${getNation(id).name}. Trade with them shrinks.`;
}
export function ally(s: GameState, id: string): string | null {
  if (!s.pol.inGovernment) return 'Only the government can do this - you are in opposition.';
  const n = s.dip.nations[id];
  if (n.ally) { n.ally = false; n.rel = clamp(n.rel - 6, 0, 98); return 'Defence cooperation ended.'; }
  if (n.rel < 70) return 'Need relations of 70+ for a defence partnership.';
  n.ally = true; s.pendingCosts += 0.0005 * s.gdp; s.stability = clamp(s.stability + 1, 3, 98);
  return `Defence partnership with ${getNation(id).name}: stability up; their rivals will cool toward you.`;
}
export function joinOrg(s: GameState, id: string): string | null {
  if (!s.pol.inGovernment) return 'Only the government can do this - you are in opposition.';
  const o = ORGS[s.countryId].find((x) => x.id === id)!;
  if (o.kind === 'global') return 'Permanent membership.';
  if (s.dip.orgs[id]) {
    s.dip.orgs[id] = false; s.confidence = clamp(s.confidence - 2, 0, 100); s.stability = clamp(s.stability - (o.kind === 'security' ? 2 : 0.5), 3, 98);
    (o.gate ?? []).forEach((g) => { if (s.dip.nations[g]) s.dip.nations[g].rel = clamp(s.dip.nations[g].rel - 8, 0, 98); });
    return `You leave ${o.name}.`;
  }
  const need = (o.gate ?? []).filter((g) => (s.dip.nations[g]?.rel ?? 0) < 62);
  if (need.length) return `Members are not ready: improve relations (62+) with ${need.map((g) => getNation(g).name).join(', ')}.`;
  s.dip.orgs[id] = true; s.confidence = clamp(s.confidence + 2, 0, 100);
  return `You join ${o.name}.`;
}
export const LENDERS = [
  { id: 'imf', name: 'IMF programme', rate: 2.5, months: 84, rel: null as string | null, cond: 'Reform conditions: tight budget for two years (growth and approval dip), but markets regain confidence.', min: 0 },
  { id: 'wb', name: 'World Bank development loan', rate: 1.8, months: 120, rel: null, cond: 'Funds must go to development: a small lasting boost to infrastructure and education.', min: 0 },
  { id: 'china', name: 'Chinese bank loan', rate: 4.5, months: 96, rel: 'china', cond: 'Quick and condition-free, but costs more and irritates China’s rivals.', min: 45 },
];
export function takeLoan(s: GameState, lenderId: string, pctGdp: number): string | null {
  if (!s.pol.inGovernment) return 'Only the government can do this - you are in opposition.';
  const L = LENDERS.find((l) => l.id === lenderId)!;
  if (L.rel && (s.dip.nations[L.rel]?.rel ?? 0) < L.min) return `Relations with ${getNation(L.rel).name} must be ${L.min}+.`;
  if (s.dip.loans.some((l) => l.lender === lenderId)) return 'You already have one of these loans.';
  const amt = (pctGdp / 100) * s.gdp;
  s.dip.loans.push({ id: `${lenderId}${s.turn}`, lender: lenderId, amount: amt, remaining: amt, ratePct: L.rate, monthsLeft: L.months });
  s.debt += amt;
  s.eco.reservesMonths += amt / Math.max(1, (s.eco.importsPct / 100) * s.gdp / 12);
  s.currency = clamp(s.currency + 2, 20, 200);
  if (lenderId === 'imf') { s.modifiers.push({ id: 'imf', label: 'IMF austerity conditions', monthsLeft: 24, growth: -0.15, approval: -1.5, confidence: 4 }); s.confidence = clamp(s.confidence + 4, 0, 100); }
  if (lenderId === 'wb') { applyBonus(s); }
  if (lenderId === 'china') ['usa', 'india', 'japan'].forEach((r) => { if (s.dip.nations[r]) s.dip.nations[r].rel = clamp(s.dip.nations[r].rel - 3, 0, 98); });
  return `${L.name}: ${Math.round(amt * 10) / 10 || amt.toFixed(2)} bn arrives. Repayment runs ${Math.round(L.months / 12)} years at ${L.rate}%.`;
}
function applyBonus(s: GameState) { s.eco.assetBonus.infrastructure = Math.min(60, s.eco.assetBonus.infrastructure + 2); s.eco.assetBonus.education = Math.min(60, s.eco.assetBonus.education + 1.5); }
export function repayLoan(s: GameState, lenderId: string): string | null {
  if (!s.pol.inGovernment) return 'Only the government can do this - you are in opposition.';
  const l = s.dip.loans.find((x) => x.lender === lenderId); if (!l) return 'No such loan.';
  if (s.debt <= 0) return 'Nothing to repay.';
  s.pendingCosts += l.remaining; s.debt = Math.max(0, s.debt - l.remaining);
  s.dip.loans = s.dip.loans.filter((x) => x !== l);
  return 'Loan repaid in full from the budget.';
}
export function requestAid(s: GameState, id: string): string | null {
  if (!s.pol.inGovernment) return 'Only the government can do this - you are in opposition.';
  const n = s.dip.nations[id]; const nat = getNation(id);
  const gdppc = (s.gdp * 1000) / s.population;
  if (!nat.rich && id !== 'china') return 'They are not a donor.';
  if (gdppc > 15000) return 'Your country no longer qualifies for aid.';
  if (n.rel < 58) return 'Relations must be 58+.';
  if (!cooldown(s, 'aid_' + id, 18, 17)) return 'They gave aid recently.';
  s.pendingCosts -= 0.004 * s.gdp; s.approval = clamp(s.approval + 1, 3, 95); n.rel = clamp(n.rel + 2, 0, 98);
  return `${nat.name} grants development aid (+0.4% of GDP).`;
}
export function giveAid(s: GameState, id: string): string | null {
  if (!s.pol.inGovernment) return 'Only the government can do this - you are in opposition.';
  const n = s.dip.nations[id];
  if (!cooldown(s, 'give_' + id, 12, 11)) return 'You gave aid recently.';
  s.pendingCosts += 0.0015 * s.gdp; n.rel = clamp(n.rel + 7, 0, 98); s.approval = clamp(s.approval - 0.3, 3, 95);
  return `Aid to ${getNation(id).name}: goodwill grows (+7).`;
}
export const topPartner = (s: GameState): string => { const w = tradeWeights(s); return Object.keys(w).sort((a, b) => w[b] - w[a])[0]; };
export const rivalNation = (s: GameState): string | null => { const ids = Object.keys(s.dip.nations).filter((k) => s.dip.nations[k].rel < 48).sort((a, b) => s.dip.nations[a].rel - s.dip.nations[b].rel); return ids[0] ?? null; };
