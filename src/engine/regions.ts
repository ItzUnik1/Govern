// Stage 6 (part 3): regional governments. Every region has its own ruling party, development level, trust in the
// centre and grievances. The centre sets how much power is devolved and how generous national grants are, and can
// invest in or negotiate with individual regions. Imports no politics.ts or sim.ts code.
import { SYSTEMS } from './parties';
import type { EventDef } from './events';
import type { CountryDef, GameState } from './types';

export interface RegionGov {
  id: string; name: string; seatShare: number; urban: number;
  dev: number; relation: number; grievance: number;
  gov: string; // ruling party of the region
  since: number; // turn the current regional government took office
  cool: Record<string, number>;
  note: string;
}
export interface RegionState { list: RegionGov[]; devolution: number; grants: number; log: string[] }

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
export const DEVOLUTION = ['Centralised', 'Standard', 'Devolved'];
export const GRANTS = ['Lean', 'Standard', 'Generous', 'Equalising'];
export const DEV_NOTE = [
  'The centre decides almost everything. Stable control, but regions feel ignored and regional parties gain.',
  'A balanced split of powers between the capital and the regions.',
  'Regions run their own services and raise some of their own money. Better local fit and calmer regions, at some cost to central control and a duplicated bureaucracy.',
];
export const GRANT_NOTE = [
  'Saves 0.1% of GDP; poorer regions fall behind and relations sour.',
  'Formula grants. No change.',
  'Costs 0.2% of GDP a year; regions are happier and develop faster.',
  'Costs 0.4% of GDP a year and favours the poorest regions; closes the development gap over time.',
];
const GRANT_COST = [-0.1, 0, 0.2, 0.4];
const DEV_COST = [0, 0, 0.1];

export function initRegions(s: GameState, c: CountryDef, rnd: () => number): RegionState {
  const sy = SYSTEMS[s.countryId];
  const rich = c.devLevel === 'High income' ? 12 : c.devLevel === 'Low income' ? -8 : 0;
  const list = sy.regions.map((r, i) => {
    const reg = sy.parties.some((p) => p.regions?.includes(r.id));
    const res = s.pol?.regional?.[i];
    let gov = s.pol?.pmParty ?? sy.parties[0].id;
    if (res) gov = Object.keys(res.shares).sort((a, b) => res.shares[b] - res.shares[a])[0];
    return {
      id: r.id, name: r.name, seatShare: r.seatShare, urban: r.urban,
      dev: clamp(28 + 42 * r.urban + rich + (rnd() - 0.5) * 10, 12, 92),
      relation: clamp(56 + (rnd() - 0.5) * 12 - (reg ? 9 : 0), 20, 90),
      grievance: clamp(22 + (reg ? 14 : 0) + (rnd() - 0.5) * 10, 3, 90),
      gov, since: 0, cool: {}, note: '',
    };
  });
  return { list, devolution: 1, grants: 1, log: [] };
}

export const nationalRelation = (s: GameState) => s.reg.list.reduce((a, r) => a + r.seatShare * r.relation, 0) / s.reg.list.reduce((a, r) => a + r.seatShare, 0);
export const devGap = (s: GameState) => {
  const L = s.reg.list, m = L.reduce((a, r) => a + r.seatShare * r.dev, 0) / L.reduce((a, r) => a + r.seatShare, 0);
  return Math.sqrt(L.reduce((a, r) => a + r.seatShare * (r.dev - m) ** 2, 0) / L.reduce((a, r) => a + r.seatShare, 0));
};
export const regCostPct = (s: GameState): number => (s.reg ? GRANT_COST[s.reg.grants] + DEV_COST[s.reg.devolution] : 0);
/** Tilt used by the election model: a region that trusts the centre favours the governing party, an aggrieved one favours regional parties. */
export function regionTilt(s: GameState, regionId: string): { incumbent: number; regional: number } {
  const r = s.reg?.list.find((x) => x.id === regionId);
  if (!r) return { incumbent: 1, regional: 1 };
  return { incumbent: Math.exp(0.006 * (r.relation - 50)), regional: Math.exp(0.007 * (r.grievance - 40)) };
}
const isRegionalParty = (countryId: string, partyId: string) => !!SYSTEMS[countryId].parties.find((p) => p.id === partyId)?.regions;
const partyShort = (countryId: string, id: string) => SYSTEMS[countryId].parties.find((p) => p.id === id)?.short ?? id;

// ---------- monthly ----------
export function stepRegions(s: GameState, c: CountryDef, rnd: () => number, notes: string[]) {
  const R = s.reg; if (!R) return;
  const P = s.pol, dv = R.devolution, g = R.grants;
  const norm = () => (rnd() + rnd() + rnd() - 1.5) * 2;
  const avgDev = R.list.reduce((a, r) => a + r.seatShare * r.dev, 0) / R.list.reduce((a, r) => a + r.seatShare, 0);
  R.list.forEach((r, i) => {
    for (const k of Object.keys(r.cool)) { r.cool[k]--; if (r.cool[k] <= 0) delete r.cool[k]; }
    const allied = P.coalition.includes(r.gov) || r.gov === P.playerParty;
    const regionalParty = isRegionalParty(s.countryId, r.gov);
    // trust drifts towards a level set by who runs the region, the money it gets, the powers it has and how the country is doing
    let target = 48 + (allied ? 10 : -15 * (0.6 + c.polarisation)) + [-14, 0, 8, 14][g] + (dv - 1) * (regionalParty ? 11 : 4) - (regionalParty && dv === 0 ? 8 : 0)
      + 0.25 * (s.approval - 45) - (r.dev < avgDev - 10 && g < 3 ? 6 : 0) + (!P.inGovernment ? 4 : 0);
    target = clamp(target, 8, 95);
    r.relation = clamp(r.relation + 0.07 * (target - r.relation) + 0.35 * norm(), 0, 100);
    r.grievance = clamp(r.grievance + 0.05 * ((100 - r.relation) * 0.95 + (regionalParty ? 8 : 0) - r.grievance) + 0.1 * norm(), 0, 100);
    const devTarget = 0.45 * s.stocks.infrastructure + 0.25 * s.stocks.education + 0.12 * s.stocks.health + 25 * r.urban - 5 + [-3, 0, 2, 4][g];
    r.dev = clamp(r.dev + 0.012 * (devTarget - r.dev) + (g === 3 ? 0.02 * (avgDev - r.dev) : 0) + 0.04 * norm(), 5, 98);
    // regional elections (staggered): the governing party in a region can change
    if (s.turn > 0 && (s.turn + 11 * i) % 48 === 0) {
      const res = P.regional[i];
      if (res) {
        const w: Record<string, number> = {};
        for (const id of Object.keys(res.shares)) w[id] = Math.max(0.01, res.shares[id]) * (id === P.pmParty ? Math.exp(0.035 * (r.relation - 50)) : isRegionalParty(s.countryId, id) ? Math.exp(0.02 * (r.grievance - 40)) : 1) * Math.exp(0.15 * norm());
        const tot = Object.values(w).reduce((a, b) => a + b, 0);
        let x = rnd() * tot, win = r.gov;
        for (const id of Object.keys(w)) { x -= w[id]; if (x <= 0) { win = id; break; } }
        if (win !== r.gov) {
          const was = r.gov; r.gov = win; r.since = s.turn;
          if (P.coalition.includes(win) || win === P.playerParty) r.relation = clamp(r.relation + 8, 0, 100); else if (P.coalition.includes(was)) r.relation = clamp(r.relation - 6, 0, 100);
          notes.push(`Regional election in ${r.name}: ${partyShort(s.countryId, win)} takes over from ${partyShort(s.countryId, was)}.`);
        }
      }
    }
  });
  // national effects, weighted by each region's share of the country
  const rel = nationalRelation(s), gap = devGap(s);
  const sep = R.list.filter((r) => isRegionalParty(s.countryId, r.gov)).reduce((a, r) => a + r.seatShare * Math.max(0, r.grievance - 40) / 60, 0);
  s.modifiers.push({
    id: 'regions', label: 'Regional relations and development gap', monthsLeft: 1,
    stability: 0.045 * (rel - 50) + (dv === 0 ? 0.25 : dv === 2 ? -0.2 : 0) - 2 * sep,
    approval: 0.02 * (rel - 50),
    growth: -0.004 * Math.max(0, gap - 12) + (dv === 2 ? 0.03 : 0) + (g === 3 ? 0.02 : 0),
    confidence: -0.8 * sep,
  });
  if (gap > 0) s.eco.gini = clamp(s.eco.gini + 0.0025 * (gap - 12), 15, 70);
  if (s.turn % 24 === 0 && s.turn > 0 && R.list.some((r) => r.grievance > 65)) notes.push('Unrest is simmering in at least one region. Check Politics > Regions.');
}

// ---------- player actions ----------
export function setRegPolicy(s: GameState, which: 'devolution' | 'grants', v: number): string {
  if (!s.reg) return '';
  const old = s.reg[which];
  const nv = clamp(Math.round(v), 0, which === 'grants' ? 3 : 2);
  if (nv === old) return '';
  s.reg[which] = nv;
  if (which === 'devolution') {
    // changing the settlement shifts every region's mood right away: devolving pleases, clawing back angers
    for (const r of s.reg.list) r.relation = clamp(r.relation + (nv - old) * (isRegionalParty(s.countryId, r.gov) ? 6 : 3), 0, 100);
    return `Devolution: ${DEVOLUTION[nv]}`;
  }
  return `Regional grants: ${GRANTS[nv]}`;
}

export interface RegAction { id: string; name: string; desc: string; cooldown: number; costPct: number }
export const REG_ACTIONS: RegAction[] = [
  { id: 'visit', name: 'Visit & listen', desc: 'Relation +4, grievance −3. Free.', cooldown: 4, costPct: 0 },
  { id: 'invest', name: 'Invest', desc: 'Development +6, relation +5. Costs 0.1% of GDP.', cooldown: 12, costPct: 0.1 },
  { id: 'pact', name: 'Regional pact', desc: 'Relation +12, grievance −15; a hard deal that costs 0.15% of GDP and 1 approval point.', cooldown: 24, costPct: 0.15 },
];
export function regAction(s: GameState, regionId: string, act: string): string {
  if (!s.pol.inGovernment) return 'Only the government can do this.';
  const r = s.reg.list.find((x) => x.id === regionId), a = REG_ACTIONS.find((x) => x.id === act);
  if (!r || !a) return 'Unknown';
  if ((r.cool[act] ?? 0) > 0) return `Not again for ${r.cool[act]} month(s).`;
  r.cool[act] = a.cooldown;
  if (a.costPct) s.pendingCosts += (a.costPct / 100) * s.gdp;
  if (act === 'visit') { r.relation = clamp(r.relation + 4, 0, 100); r.grievance = clamp(r.grievance - 3, 0, 100); return `You tour ${r.name}. Locals appreciate the attention.`; }
  if (act === 'invest') { r.dev = clamp(r.dev + 6, 0, 100); r.relation = clamp(r.relation + 5, 0, 100); return `New projects are announced for ${r.name}.`; }
  r.relation = clamp(r.relation + 12, 0, 100); r.grievance = clamp(r.grievance - 15, 0, 100); s.approval = clamp(s.approval - 1, 3, 95);
  return `A pact is signed with ${r.name}. Other regions notice.`;
}

// ---------- events ----------
const cl = clamp;
const worst = (s: GameState) => [...s.reg.list].sort((a, b) => b.grievance - a.grievance || a.relation - b.relation)[0];
const hostile = (s: GameState) => [...s.reg.list].filter((r) => !s.pol.coalition.includes(r.gov) && r.gov !== s.pol.playerParty).sort((a, b) => a.relation - b.relation)[0] ?? worst(s);
const regPartyRegion = (s: GameState) => [...s.reg.list].filter((r) => isRegionalParty(s.countryId, r.gov)).sort((a, b) => b.grievance - a.grievance)[0] ?? worst(s);

export const REGION_EVENTS: EventDef[] = [
  {
    id: 'regionalProtest', title: 'Regional protests', icon: '📢', category: 'Crisis', cooldown: 20,
    weight: (s) => (s.reg && s.pol.inGovernment ? Math.max(0, (worst(s).grievance - 55) / 22) : 0),
    text: (s) => { const r = worst(s); return `Large protests have erupted across ${r.name}. People say the capital takes their taxes and gives little back. The local government is backing the marchers.`; },
    choices: [
      { label: 'Announce an emergency investment plan', hint: 'Costs ~0.2% of GDP; grievance eases', run: (fx) => { const r = worst(fx.s); fx.cost(0.2); r.dev = cl(r.dev + 5, 0, 100); r.relation = cl(r.relation + 10, 0, 100); r.grievance = cl(r.grievance - 15, 0, 100); fx.approval(0.3); return `The package for ${r.name} calms the streets, for now.`; } },
      { label: 'Send senior ministers to negotiate', hint: 'Free; may take a while', run: (fx) => { const r = worst(fx.s); if (fx.rnd() < 0.6) { r.relation = cl(r.relation + 8, 0, 100); r.grievance = cl(r.grievance - 10, 0, 100); return `Talks produce a modest deal in ${r.name}.`; } r.grievance = cl(r.grievance - 3, 0, 100); fx.approval(-0.5); return 'Talks drag on. Little changes.'; } },
      { label: 'Deploy police and restore order', hint: 'Order now, anger later', run: (fx) => { const r = worst(fx.s); r.grievance = cl(r.grievance + 8, 0, 100); r.relation = cl(r.relation - 10, 0, 100); fx.stability(1); fx.approval(-1); return `Calm returns to ${r.name} by force. Resentment deepens.`; } },
      { label: 'Wait it out', hint: 'No cost; risks escalation', run: (fx) => { const r = worst(fx.s); r.grievance = cl(r.grievance + 5, 0, 100); fx.stability(-1.5); fx.mod('Regional disruption', 3, { growth: -0.12 }); return 'The protests run for weeks.'; } },
    ],
  },
  {
    id: 'autonomyDemand', title: 'Demand for more autonomy', icon: '🏴', category: 'Politics', cooldown: 36,
    weight: (s) => { if (!s.reg || !s.pol.inGovernment) return 0; const r = regPartyRegion(s); return r && isRegionalParty(s.countryId, r.gov) && r.grievance > 40 && s.reg.devolution < 2 ? (r.grievance - 35) / 40 : 0; },
    text: (s) => { const r = regPartyRegion(s); return `The government of ${r.name}, run by ${partyShort(s.countryId, r.gov)}, is demanding a new settlement: control of local taxes, schools and police.`; },
    choices: [
      { label: 'Devolve more powers nationally', hint: 'Devolution up a notch for every region', run: (fx) => { const s = fx.s; const r = regPartyRegion(s); s.reg.devolution = cl(s.reg.devolution + 1, 0, 2); s.reg.list.forEach((x) => { x.relation = cl(x.relation + 5, 0, 100); }); r.grievance = cl(r.grievance - 18, 0, 100); fx.stability(-0.5); return `A new settlement is passed. ${r.name} celebrates; hardliners in the capital are uneasy.`; } },
      { label: 'Offer a fiscal deal for the region only', hint: 'Costs ~0.15% of GDP; others may demand the same', run: (fx) => { const s = fx.s; const r = regPartyRegion(s); fx.cost(0.15); r.relation = cl(r.relation + 12, 0, 100); r.grievance = cl(r.grievance - 14, 0, 100); s.reg.list.forEach((x) => { if (x !== r) x.relation = cl(x.relation - 2, 0, 100); }); return `${r.name} gets a special deal. Neighbours ask why not them.`; } },
      { label: 'Refuse', hint: 'Keeps the system intact; grievance grows', run: (fx) => { const r = regPartyRegion(fx.s); r.grievance = cl(r.grievance + 12, 0, 100); r.relation = cl(r.relation - 8, 0, 100); fx.stability(-2); fx.approval(0.5); return `Talks end. ${partyShort(fx.s.countryId, r.gov)} promises to take the fight to the ballot box.`; } },
    ],
  },
  {
    id: 'governorFeud', title: 'Regional leader attacks your policy', icon: '🎙️', category: 'Politics', cooldown: 24,
    weight: (s) => (s.reg && s.pol.inGovernment && hostile(s) && !s.pol.coalition.includes(hostile(s).gov) ? 0.35 + 0.01 * Math.max(0, 50 - hostile(s).relation) : 0),
    text: (s) => { const r = hostile(s); return `The ${partyShort(s.countryId, r.gov)} leader running ${r.name} has gone on national television to blame your government for local hardship.`; },
    choices: [
      { label: 'Meet and find common ground', hint: 'Relation up; looks conciliatory', run: (fx) => { const r = hostile(fx.s); r.relation = cl(r.relation + 8, 0, 100); fx.approval(0.3); return `A joint statement is issued with the ${r.name} government.`; } },
      { label: 'Hit back publicly', hint: 'Rallies your base; relation down', run: (fx) => { const r = hostile(fx.s); r.relation = cl(r.relation - 8, 0, 100); fx.approval(1); fx.stability(-0.5); return 'Your reply makes the evening news. Neither side blinks.'; } },
      { label: 'Freeze their special grants', hint: 'Saves money; relation much lower', run: (fx) => { const r = hostile(fx.s); fx.cost(-0.05); r.relation = cl(r.relation - 14, 0, 100); r.grievance = cl(r.grievance + 8, 0, 100); fx.approval(-0.5); return `Funding for ${r.name} is frozen pending review.`; } },
    ],
  },
];
