// Stage 2 political simulation: parties, vote shares, regions, seats, coalitions, bills, confidence votes, ministers.
// Imports no sim.ts code (sim.ts imports this file).
import { COUNTRIES } from './countries';
import { getBill, getPromise, BILLS, PROMISES } from './laws';
import { POSTS, SYSTEMS, type PartyDef, type SystemDef } from './parties';
import type { GameState, Minister, PartyState, PoliticsState, RegionResult } from './types';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const round = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
function normal(rnd: () => number): number { const u = Math.max(1e-9, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export const sysOf = (s: GameState): SystemDef => SYSTEMS[s.countryId];
export const pdef = (s: GameState | SystemDef, id: string): PartyDef => ((s as SystemDef).parties ?? sysOf(s as GameState).parties).find((p) => p.id === id)!;
export const isPresidential = (s: GameState) => sysOf(s).presidential;
export const totalSeats = (s: GameState) => Object.values(s.pol.parties).reduce((a, p) => a + p.seats, 0);
export const coalSeats = (s: GameState) => s.pol.coalition.reduce((a, id) => a + (s.pol.parties[id]?.seats ?? 0), 0);
export const govSeatShare = (s: GameState) => (isPresidential(s) ? (s.pol.parties[s.pol.pmParty]?.seats ?? 0) : coalSeats(s)) / Math.max(1, totalSeats(s));
export const dist = (a: PartyDef, b: PartyDef) => Math.hypot(a.econ - b.econ, 0.75 * (a.social - b.social));
export const playerDef = (s: GameState) => pdef(s, s.pol.playerParty);

// ---------- Economic position of the government's policies (-1 left .. +1 right) ----------
export function policyTilt(s: GameState): number {
  const c = COUNTRIES[s.countryId];
  const d = (a: number, b: number) => a - b;
  let x = -0.10 * d(s.tax.incomeTax, c.tax0.incomeTax) - 0.05 * d(s.tax.corpTax, c.tax0.corpTax) - 0.08 * d(s.tax.vat, c.tax0.vat)
    - 0.25 * d(s.spend.welfare, c.spend0.welfare) - 0.08 * (d(s.spend.health, c.spend0.health) + d(s.spend.education, c.spend0.education));
  if (s.programs.subsidies) x -= 0.12; if (s.programs.jobsGuarantee) x -= 0.15; if (s.programs.investHoliday) x += 0.12;
  return clamp(x, -1, 1);
}

// ---------- Incumbent margin (calibrated like Stage 1: 0 = toss-up) ----------
export function incMargin(s: GameState): { projected: number; threshold: number; margin: number } {
  const c = COUNTRIES[s.countryId];
  const projected = clamp(10 + 0.78 * s.approval + 0.05 * (s.stability - 50), 5, 80);
  const threshold = 0.78 * c.approval0 + 10 + 0.05 * (c.stability0 - 50) - 1.5 + 1.2 * s.pol.tenure + (s.difficulty.election - 1) * 8;
  return { projected, threshold, margin: projected - threshold };
}

function promiseNet(s: GameState, judge: boolean): { fresh: number; kept: number; broken: number } {
  const n = s.electionHistory.length;
  let fresh = 0, kept = 0, broken = 0;
  const c = COUNTRIES[s.countryId];
  for (const p of s.pol.promises) {
    if ((p.base._c ?? 0) >= n) fresh++;
    else if (judge) { const d = getPromise(p.id); if (d && d.kept(s, c, p.base)) kept++; else broken++; }
  }
  return { fresh: Math.min(3, fresh), kept, broken };
}

/** National vote shares (%). With rnd = noisy election-day result; without = poll estimate. */
const isPlayerInc0 = (s: GameState) => s.pol.pmParty === s.pol.playerParty;
export function nationalShares(s: GameState, rnd?: () => number, extra = 0): Record<string, number> {
  const sy = sysOf(s), P = s.pol;
  const { margin } = incMargin(s);
  const inc = pdef(sy, P.pmParty);
  const rivalBase = Math.max(...sy.parties.filter((p) => p.id !== inc.id && !p.regions).map((p) => p.base));
  const B = Math.max(0, rivalBase - inc.base) * 0.5 + (s.flags.incBonus ?? 0) - (isPlayerInc0(s) ? 0.5 * (s.ai?.opp.momentum ?? 0) : 0);
  const swing = rnd ? normal(rnd) * 3 : 0;
  const isPlayerInc = P.pmParty === P.playerParty;
  let incShare = clamp(inc.base + 0.9 * margin + B + swing + (isPlayerInc ? extra : 0), 4, 65);
  const disc = Math.max(0, -margin) / 8;
  const w: Record<string, number> = {};
  let sum = 0;
  for (const p of sy.parties) {
    if (p.id === inc.id) continue;
    const partner = P.coalition.includes(p.id);
    let f = partner ? 1 + 0.018 * margin : (1 - 0.012 * margin) * (1 + (p.protest ?? 0) * disc) * (1 + 0.016 * Math.max(0, -margin));
    if (rnd) f *= Math.exp(0.07 * normal(rnd));
    w[p.id] = Math.max(0.01, p.base * f); sum += w[p.id];
  }
  const R = 100 - incShare;
  const out: Record<string, number> = { [inc.id]: incShare };
  for (const id of Object.keys(w)) out[id] = (w[id] / sum) * R;
  if (!isPlayerInc && extra !== 0) {
    const pp = P.playerParty; const gain = clamp(extra, -6, 8);
    const others = Object.keys(out).filter((k) => k !== pp && k !== inc.id);
    const os = others.reduce((a, k) => a + out[k], 0);
    out[pp] = Math.max(1, out[pp] + gain);
    others.forEach((k) => { out[k] -= (out[k] / os) * gain; });
  }
  return out;
}

function pollExtra(s: GameState): number {
  const pn = promiseNet(s, false);
  return s.pol.campaign + 0.8 * pn.fresh;
}
export const pollShares = (s: GameState) => nationalShares(s, undefined, pollExtra(s));

// ---------- Regions ----------
function regionFactor(p: PartyDef, urban: number, cons: number): number {
  return Math.exp(1.4 * (cons - 0.5) * p.social - 0.9 * (urban - 0.5) * p.social - 0.25 * (urban - 0.5) * p.econ);
}

function regionalShares(s: GameState, national: Record<string, number>, rnd: (() => number) | undefined): RegionResult[] {
  const sy = sysOf(s);
  const noise = rnd ? 0.12 : 0;
  return sy.regions.map((r) => {
    const raw: Record<string, number> = {};
    let sum = 0;
    for (const p of sy.parties) {
      let v = national[p.id] ?? 0;
      if (p.regions) {
        if (!p.regions.includes(r.id)) { raw[p.id] = 0; continue; }
        const cover = sy.regions.filter((x) => p.regions!.includes(x.id)).reduce((a, x) => a + x.seatShare, 0);
        v = v / Math.max(0.05, cover);
      }
      v *= regionFactor(p, r.urban, r.cons);
      if (p.id === s.pol.playerParty) v *= 1 + 0.012 * (s.pol.campaignRegion[r.id] ?? 0);
      if (rnd) v *= Math.exp(noise * normal(rnd));
      raw[p.id] = v; sum += v;
    }
    const shares: Record<string, number> = {};
    for (const id of Object.keys(raw)) shares[id] = (raw[id] / sum) * 100;
    return { id: r.id, name: r.name, shares, seats: {} };
  });
}

// ---------- Seats ----------
function largestRemainder(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const q = weights.map((w) => (w / sum) * total);
  const out = q.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = q.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) { if (left <= 0) break; out[i]++; left--; }
  return out;
}

function dhondt(seats: number, shares: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}; Object.keys(shares).forEach((k) => (out[k] = 0));
  for (let i = 0; i < seats; i++) {
    let best = '', bv = -1;
    for (const k of Object.keys(shares)) { const v = shares[k] / (out[k] + 1); if (v > bv) { bv = v; best = k; } }
    out[best]++;
  }
  return out;
}

function constituencyWinner(sy: SystemDef, shares: Record<string, number>, rnd: () => number, preferential: boolean): string {
  const v: Record<string, number> = {};
  let tot = 0;
  for (const p of sy.parties) { const sh = shares[p.id] ?? 0; if (sh <= 0) continue; v[p.id] = sh * Math.exp(0.45 * normal(rnd)); tot += v[p.id]; }
  for (const k of Object.keys(v)) v[k] /= tot;
  if (preferential) {
    let alive = Object.keys(v);
    while (alive.length > 2 && Math.max(...alive.map((k) => v[k])) < 0.5) {
      const low = alive.reduce((a, b) => (v[a] < v[b] ? a : b));
      const lp = pdef(sy, low);
      const rest = alive.filter((k) => k !== low);
      const ws = rest.map((k) => Math.exp(-2.5 * Math.hypot(lp.econ - pdef(sy, k).econ, 0.75 * (lp.social - pdef(sy, k).social))));
      const ws2 = ws.reduce((a, b) => a + b, 0);
      rest.forEach((k, i) => { v[k] += v[low] * ws[i] / ws2; });
      v[low] = 0; alive = rest;
    }
  }
  return Object.keys(v).reduce((a, b) => (v[a] >= v[b] ? a : b));
}

interface SeatResult { seats: Record<string, number>; regional: RegionResult[]; ev?: Record<string, number> }
function allocateSeats(s: GameState, national: Record<string, number>, rnd: () => number): SeatResult {
  const sy = sysOf(s);
  const regional = regionalShares(s, national, rnd);
  const seats: Record<string, number> = {}; sy.parties.forEach((p) => (seats[p.id] = 0));
  const fptpTotal = sy.kind === 'fptp' || sy.kind === 'preferential' ? sy.seats : sy.kind === 'mixed' ? sy.fptpSeats ?? 0 : 0;
  if (fptpTotal > 0) {
    const per = largestRemainder(fptpTotal, sy.regions.map((r) => r.seatShare));
    regional.forEach((rr, i) => {
      rr.seats = {}; sy.parties.forEach((p) => (rr.seats[p.id] = 0));
      for (let k = 0; k < per[i]; k++) { const w = constituencyWinner(sy, rr.shares, rnd, sy.kind === 'preferential'); rr.seats[w]++; seats[w]++; }
    });
  } else regional.forEach((rr) => { rr.seats = {}; });
  const prTotal = sy.kind === 'pr' ? sy.seats : sy.kind === 'mixed' ? sy.seats - (sy.fptpSeats ?? 0) : 0;
  if (prTotal > 0) {
    // national share recomputed from regional results
    const nat: Record<string, number> = {};
    sy.parties.forEach((p) => { nat[p.id] = regional.reduce((a, rr, i) => a + rr.shares[p.id] * sy.regions[i].seatShare, 0); });
    const elig: Record<string, number> = {};
    for (const p of sy.parties) { if (nat[p.id] >= sy.threshold || (p.regions && nat[p.id] >= 1)) elig[p.id] = nat[p.id]; }
    const pr = dhondt(prTotal, elig);
    Object.keys(pr).forEach((k) => (seats[k] += pr[k]));
  }
  const res: SeatResult = { seats, regional };
  if (sy.presidential) {
    const ev: Record<string, number> = {}; sy.parties.forEach((p) => (ev[p.id] = 0));
    regional.forEach((rr, i) => {
      const r = sy.regions[i]; const n = Math.max(3, Math.round(50 * r.seatShare));
      for (let k = 0; k < n; k++) { const w = constituencyWinner(sy, rr.shares, rnd, false); ev[w] += (538 * r.seatShare) / n; }
    });
    Object.keys(ev).forEach((k) => (ev[k] = Math.round(ev[k])));
    res.ev = ev;
  }
  return res;
}

// ---------- Government formation ----------
const MAX_DIST = 1.5;
const isMisc = (p: PartyDef) => p.id.endsWith('_oth') || p.id === 'us_ind';
const compatible = (a: PartyDef, b: PartyDef, maxD = MAX_DIST) => !a.pariah && !b.pariah && !a.rivals?.includes(b.id) && !b.rivals?.includes(a.id) && !isMisc(a) && !isMisc(b) && dist(a, b) <= maxD;

function tryLeadD(sy: SystemDef, seats: Record<string, number>, leader: string, exclude: string[], maxD: number): string[] | null {
  const total = Object.values(seats).reduce((a, b) => a + b, 0);
  const major = total / 2;
  const lp = pdef(sy, leader);
  let tot = seats[leader];
  let co = [leader];
  if (tot > major) return co;
  if (lp.pariah) return null;
  const key = (p: PartyDef) => dist(lp, p) - 1.8 * seats[p.id] / total;
  const cands = sy.parties.filter((p) => p.id !== leader && !exclude.includes(p.id) && seats[p.id] > 0 && seats[p.id] <= seats[leader] && compatible(lp, p, maxD)).sort((a, b) => key(a) - key(b));
  for (const p of cands) { co.push(p.id); tot += seats[p.id]; if (tot > major) break; }
  if (tot <= major) return null;
  // drop partners that are not needed (smallest first)
  for (const id of [...co].slice(1).sort((a, b) => seats[a] - seats[b])) { if (tot - seats[id] > major) { co = co.filter((x) => x !== id); tot -= seats[id]; } }
  return co;
}
function tryLead(sy: SystemDef, seats: Record<string, number>, leader: string, exclude: string[]): string[] | null {
  return tryLeadD(sy, seats, leader, exclude, 1.0) ?? tryLeadD(sy, seats, leader, exclude, MAX_DIST);
}

export function askFor(sy: SystemDef, seats: Record<string, number>, leader: string, partner: string): number {
  const ls = seats[leader], ps = seats[partner];
  const lp = pdef(sy, leader), pp = pdef(sy, partner);
  let a = Math.round((6 * ps) / (ls + ps) + (dist(lp, pp) > 0.8 ? 1 : 0));
  return clamp(a, 1, 3);
}

type Form = { kind: 'formed'; pm: string; coalition: string[]; minority: boolean } | { kind: 'player'; minorityOnly: boolean };

function formGovernment(s: GameState, seats: Record<string, number>, excludeParties: string[] = []): Form {
  const sy = sysOf(s);
  const order = sy.parties.filter((p) => seats[p.id] > 0 && !excludeParties.includes(p.id)).sort((a, b) => seats[b.id] - seats[a.id]);
  const total = Object.values(seats).reduce((a, b) => a + b, 0);
  for (const p of order) {
    const co = tryLead(sy, seats, p.id, [s.pol.playerParty].filter((x) => x !== p.id));
    if (p.id === s.pol.playerParty) {
      const co2 = tryLead(sy, seats, p.id, []);
      if (co2 && co2.length === 1) return { kind: 'formed', pm: p.id, coalition: co2, minority: false };
      if (co2) return { kind: 'player', minorityOnly: false };
      continue;
    }
    if (co) return { kind: 'formed', pm: p.id, coalition: co, minority: false };
  }
  // nobody reaches a majority: the first party with a workable share governs as a minority
  for (const p of order) {
    if (seats[p.id] >= 0.3 * total) {
      if (p.id === s.pol.playerParty) return { kind: 'player', minorityOnly: true };
      const near = order.filter((q) => q.id !== p.id && compatible(p, q)).sort((a, b) => dist(p, a) - dist(p, b))[0];
      return { kind: 'formed', pm: p.id, coalition: near ? [p.id, near.id] : [p.id], minority: true };
    }
  }
  const p = order[0];
  return { kind: 'formed', pm: p.id, coalition: [p.id], minority: true };
}

// ---------- Ministers & cabinet ----------
const POST_ORDER = ['welfare', 'health', 'education', 'interior', 'foreign', 'infrastructure', 'defence', 'finance'];
let _mid = 0;
export function genMinister(sy: SystemDef, post: string, party: string, rnd: () => number): Minister {
  const comp = clamp(Math.round(55 + 16 * normal(rnd)), 18, 95);
  const rep = clamp(Math.round(comp + 12 * normal(rnd)), 10, 98);
  const name = `${sy.names.first[Math.floor(rnd() * sy.names.first.length)]} ${sy.names.last[Math.floor(rnd() * sy.names.last.length)]}`;
  return { id: `m${Date.now() % 1e6}_${_mid++}`, name, post, party, comp, rep, perf: 50, months: 0 };
}
export function refreshPool(s: GameState, rnd: () => number, post?: string) {
  const sy = sysOf(s);
  for (const p of POSTS) {
    if (post && p.id !== post) continue;
    s.pol.pool[p.id] = [0, 1, 2].map(() => genMinister(sy, p.id, s.pol.playerParty, rnd));
  }
}

function buildCabinet(s: GameState, ask: Record<string, number>, rnd: () => number) {
  const sy = sysOf(s), P = s.pol;
  const posts = [...POST_ORDER];
  const cab: Record<string, Minister | null> = {};
  POSTS.forEach((p) => (cab[p.id] = null));
  const partners = P.coalition.filter((id) => id !== P.pmParty);
  for (const pid of partners) {
    let n = Math.min(ask[pid] ?? 1, 3);
    for (const post of posts) { if (n <= 0) break; if (post === 'finance' || cab[post]) continue; cab[post] = genMinister(sy, post, pid, rnd); n--; }
  }
  for (const post of posts) if (!cab[post]) cab[post] = genMinister(sy, post, P.pmParty, rnd);
  P.cabinet = cab;
  if (P.pmParty === P.playerParty) refreshPool(s, rnd);
}

export function ministerComp(s: GameState, post: string): number { return s.pol.cabinet[post]?.comp ?? 50; }
/** quality multiplier for stock gains / project speed from the minister's competence (1.0 at comp 50) */
export function ministerMult(s: GameState, post: string): number {
  if (!s.pol?.inGovernment) return 1;
  return 0.8 + 0.4 * ministerComp(s, post) / 100;
}
export function ministerBonus(s: GameState): { conf: number; unemp: number; stab: number } {
  if (!s.pol?.inGovernment) return { conf: 0, unemp: 0, stab: 0 };
  return { conf: 0.06 * (ministerComp(s, 'finance') - 50), unemp: -0.012 * (ministerComp(s, 'welfare') - 50), stab: 0.04 * (ministerComp(s, 'interior') - 50) + 0.02 * (ministerComp(s, 'foreign') - 50) };
}

export function appoint(s: GameState, post: string, id: string): string | null {
  const cur = s.pol.cabinet[post];
  if (cur && cur.party !== s.pol.playerParty) return 'That ministry belongs to a coalition partner.';
  const cand = s.pol.pool[post]?.find((m) => m.id === id);
  if (!cand) return 'Candidate unavailable.';
  s.pol.cabinet[post] = { ...cand, months: 0 };
  s.pol.pool[post] = s.pol.pool[post].filter((m) => m.id !== id);
  s.approval = clamp(s.approval - 0.2, 3, 95);
  return null;
}
export function dismissPartnerMinister(s: GameState, post: string, rnd: () => number): void {
  const cur = s.pol.cabinet[post];
  if (!cur || cur.party === s.pol.playerParty) return;
  const ps = s.pol.parties[cur.party]; if (ps) ps.sat = clamp(ps.sat - 22, 0, 100);
  s.pol.cabinet[post] = genMinister(sysOf(s), post, s.pol.playerParty, rnd);
}
export function reshuffle(s: GameState, rnd: () => number): void {
  const P = s.pol;
  for (const p of POSTS) {
    const cur = P.cabinet[p.id];
    if (cur && cur.party !== P.playerParty) continue;
    const best = [...(P.pool[p.id] ?? [])].sort((a, b) => b.rep - a.rep)[0];
    if (best && (!cur || best.rep > cur.rep + 3)) { P.cabinet[p.id] = { ...best, months: 0 }; }
  }
  refreshPool(s, rnd);
  s.approval = clamp(s.approval - 1, 3, 95); s.stability = clamp(s.stability - 1, 3, 98);
}
export function ministerAdvice(s: GameState, post: string): string | null {
  const c = COUNTRIES[s.countryId];
  const debt = (s.debt / s.gdp) * 100;
  switch (post) {
    case 'finance': return debt > c.debtPct0 + 15 ? 'Debt is climbing. A modest tax rise or spending restraint would calm markets.' : s.inflation > c.inflationTarget + 2 ? 'Inflation is above target; avoid fresh stimulus.' : s.unemployment > c.unemployment0 + 1.5 ? 'Jobs are weak: targeted stimulus would help.' : null;
    case 'health': return s.stocks.health < c.stock0.health - 3 ? 'Hospitals are under strain. Health funding needs to rise.' : null;
    case 'education': return s.stocks.education < c.stock0.education - 3 ? 'Schools are slipping. Education needs investment.' : null;
    case 'infrastructure': return s.stocks.infrastructure < c.stock0.infrastructure - 3 ? 'Roads and grids are decaying; maintenance or a major project is overdue.' : null;
    case 'defence': return s.stocks.security < c.stock0.security - 4 ? 'Readiness is falling behind regional peers.' : null;
    case 'interior': return s.stability < c.stability0 - 10 ? 'Unrest is building. Show results on jobs and prices, and fight corruption.' : null;
    case 'welfare': return s.unemployment > c.unemployment0 + 1.5 ? 'Unemployment is hurting households. Consider a jobs guarantee.' : null;
    case 'foreign': return s.currency < 88 ? 'The weak currency is straining relations with creditors.' : null;
  }
  return null;
}

// ---------- Legislation ----------
export function billSupport(s: GameState, billId: string, lobby = false): { party: string; yes: number; seats: number }[] {
  const b = getBill(billId)!, sy = sysOf(s), P = s.pol;
  const tilt = 0; void tilt;
  return sy.parties.filter((p) => (P.parties[p.id]?.seats ?? 0) > 0).map((p) => {
    const seats = P.parties[p.id].seats;
    const inGov = P.coalition.includes(p.id);
    const pres = sy.presidential;
    let z = 1.0 - 1.1 * Math.abs(b.econ - p.econ) - 0.9 * Math.abs(b.social - p.social) + 0.7 * b.popular;
    if (pres) z += p.id === P.pmParty ? 0.9 : -0.5; // president's party backs him; opposition reflex
    else if (inGov) z += 1.0 + (p.id === P.pmParty ? 0.6 : 0.015 * (P.parties[p.id].sat - 50));
    else z -= 0.5;
    if (!inGov && lobby) z += 0.6;
    if (inGov && p.id === P.pmParty) z -= 0.012 * Math.max(0, 40 - s.approval);
    return { party: p.id, yes: sigmoid(2.2 * z), seats };
  });
}
export function billOutcome(s: GameState, billId: string, lobby = false): { yes: number; no: number; pass: boolean; pct: number } {
  const sup = billSupport(s, billId, lobby);
  const yes = sup.reduce((a, r) => a + r.yes * r.seats, 0);
  const tot = sup.reduce((a, r) => a + r.seats, 0);
  return { yes: Math.round(yes), no: Math.round(tot - yes), pass: yes > tot / 2, pct: (yes / tot) * 100 };
}
export function availableBills(s: GameState) { return BILLS.filter((b) => !s.pol.passed.includes(b.id)); }

// ---------- Confidence ----------
export function ncRisk(s: GameState): number {
  const P = s.pol;
  if (isPresidential(s)) return 0;
  const share = coalSeats(s) / Math.max(1, totalSeats(s));
  let r = 0.003 + 0.12 * Math.max(0, 0.55 - share) + 0.02 * Math.max(0, 30 - s.approval) / 30 * 2;
  for (const id of P.coalition) if (id !== P.pmParty) r += 0.03 * Math.max(0, 35 - (P.parties[id]?.sat ?? 50)) / 35;
  if (P.minority) r += 0.012;
  r += 0.006 * Math.max(0, s.ai?.opp.momentum ?? 0);
  return clamp(r * s.difficulty.stability, 0, 0.25);
}
export function confidenceVote(s: GameState, rnd: () => number): { won: boolean; yes: number; no: number } {
  const P = s.pol; const sy = sysOf(s);
  let yes = 0, no = 0;
  for (const p of sy.parties) {
    const seats = P.parties[p.id]?.seats ?? 0; if (!seats) continue;
    if (P.coalition.includes(p.id)) {
      const defect = p.id === P.pmParty ? clamp((30 - s.approval) / 120, 0, 0.25) : sigmoid((35 - (P.parties[p.id].sat)) / 8);
      const d = clamp(defect + 0.03 * normal(rnd), 0, 1);
      yes += seats * (1 - d); no += seats * d;
    } else if (P.minority && dist(pdef(sy, P.pmParty), p) < 0.7) { yes += seats * 0.5; no += seats * 0.1; }
    else no += seats;
  }
  return { won: yes > no, yes: Math.round(yes), no: Math.round(no) };
}
export function fallOfGovernment(s: GameState) {
  s.stability = clamp(s.stability - 5, 3, 98);
  s.monthsToElection = Math.min(s.monthsToElection, 1);
  s.flags.snap = 1;
}

// ---------- Init ----------
export function initPolitics(s: GameState, partyId: string | undefined, rnd: () => number): PoliticsState {
  const sy = SYSTEMS[s.countryId];
  const pid = partyId && sy.leadable.includes(partyId) ? partyId : sy.leadable[0];
  const parties: Record<string, PartyState> = {};
  sy.parties.forEach((p) => (parties[p.id] = { seats: 0, share: p.base, sat: 60 }));
  const P: PoliticsState = {
    playerParty: pid, inGovernment: true, pmParty: pid, coalition: [pid], minority: false, tenure: 0, defeats: 0, parties, regional: [], cabinet: {}, pool: {},
    passed: [], failedAt: {}, bill: null, billCooldown: 0, promises: [], promiseLog: [], campaign: 0, campaignRegion: {}, pending: null, formation: null,
    lastGovernmentChange: null, midtermIn: sy.presidential ? 24 : 0, houseTilt: 0,
  };
  s.pol = P;
  // opening parliament: the player's party is in power; election-day variation with neutral conditions
  s.flags.incBonus = -6;
  P.pmParty = pid; P.coalition = [pid];
  for (let b = -6; b <= 16; b += 1.5) { s.flags.incBonus = b; if (forecast(s, 20).winProb >= 0.72) break; }
  let nat = nationalShares(s, rnd, 0);
  let res = allocateSeats(s, nat, rnd);
  for (let tries = 0; tries < 30; tries++) {
    const f = sy.presidential ? null : formGovernment(s, res.seats);
    const ok = sy.presidential ? res.seats[pid] > 0.45 * Object.values(res.seats).reduce((x, y) => x + y, 0) : (f!.kind === 'player' || (f!.kind === 'formed' && f!.pm === pid));
    if (ok) break;
    nat = nationalShares(s, rnd, 0); res = allocateSeats(s, nat, rnd);
  }
  P.regional = res.regional;
  sy.parties.forEach((p) => { P.parties[p.id].seats = res.seats[p.id]; P.parties[p.id].share = round(sy.regions.reduce((a, r, i) => a + res.regional[i].shares[p.id] * r.seatShare, 0), 1); });
  const total = Object.values(res.seats).reduce((a, b) => a + b, 0);
  // make sure the player's government can function: grow own seats until it has a workable coalition
  let guard = 0;
  let co = sy.presidential ? [pid] : tryLead(sy, res.seats, pid, []);
  while (!co && guard++ < 40) {
    const bump = Math.ceil(total * 0.01);
    const rival = sy.parties.filter((p) => p.id !== pid && !p.regions).sort((a, b) => P.parties[b.id].seats - P.parties[a.id].seats)[0];
    P.parties[pid].seats += bump; P.parties[rival.id].seats = Math.max(0, P.parties[rival.id].seats - bump);
    res.seats[pid] += bump; res.seats[rival.id] = Math.max(0, res.seats[rival.id] - bump);
    co = tryLead(sy, res.seats, pid, []);
  }
  P.coalition = co ?? [pid];
  const seatsNow: Record<string, number> = {}; sy.parties.forEach((p) => (seatsNow[p.id] = P.parties[p.id].seats));
  const ask: Record<string, number> = {};
  P.coalition.filter((x) => x !== pid).forEach((x) => (ask[x] = askFor(sy, seatsNow, pid, x)));
  buildCabinet(s, ask, rnd);
  return P;
}

// ---------- Monthly update ----------
export function monthlyPolitics(s: GameState, rnd: () => number, notes: string[]) {
  const P = s.pol, sy = sysOf(s);
  P.campaign *= 0.9; if (Math.abs(P.campaign) < 0.05) P.campaign = 0;
  for (const k of Object.keys(P.campaignRegion)) { P.campaignRegion[k] *= 0.9; if (P.campaignRegion[k] < 0.1) delete P.campaignRegion[k]; }
  if (P.billCooldown > 0) P.billCooldown--;
  // coalition satisfaction follows how close government policy is to each partner
  const tilt = policyTilt(s);
  for (const id of P.coalition) {
    if (id === P.pmParty) continue;
    const pd = pdef(sy, id);
    const align = 1 - 1.3 * Math.abs(tilt - pd.econ);
    const st = P.parties[id];
    st.sat = clamp(st.sat + 0.5 * align - 0.3 + 0.02 * (s.approval - 40) + 0.3 * normal(rnd), 0, 100);
  }
  // ministers: reputation is revealed gradually, competence slowly matters
  for (const id of Object.keys(P.cabinet)) {
    const m = P.cabinet[id]; if (!m) continue;
    m.months++; m.perf += 0.06 * (m.comp - m.perf) + 0.8 * normal(rnd);
    m.perf = clamp(m.perf, 0, 100);
  }
  if (P.inGovernment) {
    // scandal-driven resignations
    for (const id of Object.keys(P.cabinet)) {
      const m = P.cabinet[id]; if (!m || m.party !== P.playerParty && false) continue;
      if (m && rnd() < 0.0015 + 0.0001 * Math.max(0, 55 - m.comp)) {
        notes.push(`${m.name} (${POSTS.find((p) => p.id === id)?.label}) resigns amid controversy.`);
        P.cabinet[id] = { ...genMinister(sy, id, m.party, rnd), comp: 45, rep: 45, perf: 45 };
        s.approval = clamp(s.approval - 1, 3, 95);
        break;
      }
    }
    // a coalition partner quits if thoroughly alienated
    for (const id of [...P.coalition]) {
      if (id === P.pmParty) continue;
      if (P.parties[id].sat <= 6) {
        P.coalition = P.coalition.filter((x) => x !== id);
        P.minority = coalSeats(s) <= totalSeats(s) / 2;
        for (const post of Object.keys(P.cabinet)) if (P.cabinet[post]?.party === id) P.cabinet[post] = genMinister(sy, post, P.playerParty, rnd);
        notes.push(`${pdef(sy, id).short} has quit your coalition${P.minority ? ' - you now lead a minority government' : ''}.`);
        s.stability = clamp(s.stability - 3, 3, 98);
      }
    }
  }
  if (s.turn % 12 === 0 && P.pmParty === P.playerParty) refreshPool(s, rnd);
}

// ---------- Opposition: the AI government's policy drift ----------
export function oppositionDrift(s: GameState) {
  const c = COUNTRIES[s.countryId], sy = sysOf(s);
  const e = pdef(sy, s.pol.pmParty).econ;
  const tgt = { incomeTax: c.tax0.incomeTax - 2 * e, corpTax: c.tax0.corpTax - 3 * e, vat: c.tax0.vat - 0.4 * e };
  (Object.keys(tgt) as (keyof typeof tgt)[]).forEach((k) => { s.tax[k] = round(s.tax[k] + 0.03 * (tgt[k] - s.tax[k]), 2); });
  const sp = { welfare: c.spend0.welfare - 0.5 * e, health: c.spend0.health - 0.2 * e, education: c.spend0.education - 0.1 * e, defence: c.spend0.defence + 0.2 * Math.max(0, e) };
  (Object.keys(sp) as (keyof typeof sp)[]).forEach((k) => { s.spend[k] = round(s.spend[k] + 0.03 * (sp[k] - s.spend[k]), 2); });
}

// ---------- Elections ----------
export interface ElectionOutcome { won: boolean; text: string }
function applyGovernment(s: GameState, f: Form & { kind: 'formed' }, rnd: () => number) {
  const P = s.pol, sy = sysOf(s);
  const seats: Record<string, number> = {}; sy.parties.forEach((p) => (seats[p.id] = P.parties[p.id].seats));
  P.pmParty = f.pm; P.coalition = f.coalition; P.minority = f.minority;
  const ask: Record<string, number> = {}; f.coalition.filter((x) => x !== f.pm).forEach((x) => (ask[x] = askFor(sy, seats, f.pm, x)));
  f.coalition.forEach((id) => { P.parties[id].sat = 62; });
  buildCabinet(s, ask, rnd);
}

/** Runs the election (or midterm). Returns a record; may leave s.pol.pending = 'formation'. */
export function runElection(s: GameState, rnd: () => number, midterm = false): { shares: Record<string, number>; seats: Record<string, number>; ev?: Record<string, number>; turnout: number } {
  const c = COUNTRIES[s.countryId], sy = sysOf(s), P = s.pol;
  const pn = promiseNet(s, !midterm);
  const prm = 1.0 * pn.kept - 1.6 * pn.broken;
  const extra = P.campaign + 0.8 * pn.fresh + (P.pmParty === P.playerParty ? prm : 0.5 * Math.min(2, pn.kept));
  const national = nationalShares(s, rnd, extra + (midterm ? (P.pmParty === P.playerParty ? -3 : 3) * 0 : 0));
  if (midterm) { // the president's party tends to lose ground
    const pm = P.pmParty; national[pm] = Math.max(3, national[pm] - 3.5);
    const others = sy.parties.filter((p) => p.id !== pm).reduce((a, p) => a + national[p.id], 0);
    sy.parties.forEach((p) => { if (p.id !== pm) national[p.id] += (3.5 * national[p.id]) / others; });
  }
  const res = allocateSeats(s, national, rnd);
  P.regional = res.regional;
  const nat: Record<string, number> = {};
  sy.parties.forEach((p) => { nat[p.id] = round(res.regional.reduce((a, rr, i) => a + rr.shares[p.id] * sy.regions[i].seatShare, 0), 1); P.parties[p.id].seats = res.seats[p.id]; P.parties[p.id].share = nat[p.id]; });
  const turnout = clamp(c.turnout + (c.id === 'australia' ? 0 : 2 * (c.polarisation - 0.5) + (s.approval < 35 ? 2 : 0)), 40, 95);
  if (!midterm) {
    // judge promises
    for (const p of [...P.promises]) {
      if ((p.base._c ?? 0) < s.electionHistory.length) { const d = getPromise(p.id); P.promiseLog.push({ label: d?.label ?? p.id, kept: !!d && d.kept(s, c, p.base) }); }
    }
    P.promises = P.promises.filter((p) => (p.base._c ?? 0) >= s.electionHistory.length);
    if (P.promiseLog.length > 20) P.promiseLog = P.promiseLog.slice(-20);
    P.campaign = 0; P.campaignRegion = {};
  }
  return { shares: nat, seats: res.seats, ev: res.ev, turnout: round(turnout, 1) };
}

/** After results: decide who governs. Returns true if the player is PM afterwards (or formation is pending). */
export function settleGovernment(s: GameState, res: { seats: Record<string, number>; ev?: Record<string, number> }, rnd: () => number): 'player' | 'ai' | 'pending' {
  const P = s.pol, sy = sysOf(s);
  if (sy.presidential) {
    const winner = Object.keys(res.ev!).reduce((a, b) => (res.ev![a] >= res.ev![b] ? a : b));
    applyGovernment(s, { kind: 'formed', pm: winner, coalition: [winner], minority: false }, rnd);
    return winner === P.playerParty ? 'player' : 'ai';
  }
  const f = formGovernment(s, res.seats);
  if (f.kind === 'player') {
    const seats = res.seats;
    const ask: Record<string, number> = {};
    sy.parties.filter((p) => p.id !== P.playerParty && seats[p.id] > 0 && compatible(playerDef(s), p) && seats[p.id] <= seats[P.playerParty]).forEach((p) => (ask[p.id] = askFor(sy, seats, P.playerParty, p.id)));
    const total = Object.values(seats).reduce((a, b) => a + b, 0);
    P.formation = { ask, seatsTotal: total, note: f.minorityOnly ? 'No majority is possible with willing partners; a minority government is your best option.' : 'You are asked to form a government. Invite partners until you control a majority.' };
    P.pending = 'formation';
    return 'pending';
  }
  applyGovernment(s, f, rnd);
  return f.pm === P.playerParty ? 'player' : 'ai';
}

/** Player confirms the partners they invited. Returns an error string or null on success. */
export function confirmFormation(s: GameState, partners: string[], rnd: () => number): string | null {
  const P = s.pol, sy = sysOf(s), F = P.formation;
  if (!F) return 'No negotiation in progress.';
  const seats: Record<string, number> = {}; sy.parties.forEach((p) => (seats[p.id] = P.parties[p.id].seats));
  let tot = seats[P.playerParty], posts = 0;
  for (const id of partners) { if (!(id in F.ask)) return 'A selected party refuses to join.'; tot += seats[id]; posts += F.ask[id]; }
  if (posts > 6) return 'You cannot hand out more than six ministries.';
  const major = F.seatsTotal / 2;
  const minority = tot <= major;
  if (minority && tot < 0.28 * F.seatsTotal) return 'Even as a minority government you would be too weak. Invite more partners or go into opposition.';
  const ask: Record<string, number> = {}; partners.forEach((id) => (ask[id] = F.ask[id]));
  P.pmParty = P.playerParty; P.coalition = [P.playerParty, ...partners]; P.minority = minority; P.inGovernment = true;
  partners.forEach((id) => (P.parties[id].sat = 62));
  buildCabinet(s, ask, rnd);
  P.pending = null; P.formation = null;
  return null;
}
/** Player declines to govern: the next-best party forms a government. */
export function declineFormation(s: GameState, rnd: () => number) {
  const P = s.pol, sy = sysOf(s);
  const seats: Record<string, number> = {}; sy.parties.forEach((p) => (seats[p.id] = P.parties[p.id].seats));
  const f = formGovernment(s, seats, [P.playerParty]);
  if (f.kind === 'formed') applyGovernment(s, f, rnd);
  P.inGovernment = false; P.pending = null; P.formation = null;
}

// ---------- Promises ----------
export function makePromise(s: GameState, id: string): string | null {
  const d = getPromise(id); if (!d) return 'Unknown promise';
  if (s.pol.promises.some((p) => p.id === id)) return 'Already promised';
  const n = s.electionHistory.length;
  if (s.pol.promises.filter((p) => (p.base._c ?? 0) >= n).length >= 3) return 'You can campaign on at most three promises.';
  if (s.monthsToElection > 18 && s.pol.inGovernment) return 'Voters only listen to manifesto promises in the last 18 months before an election.';
  s.pol.promises.push({ id, madeTurn: s.turn, base: { ...d.base(s), _c: n } });
  return null;
}
export const PROMISE_LIST = PROMISES;

// ---------- Forecast (Monte-Carlo over election-day noise) ----------
function mulberry(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function forecast(s: GameState, runs = 30) {
  const sy = sysOf(s), P = s.pol;
  const seatSum: Record<string, number> = {}; sy.parties.forEach((p) => (seatSum[p.id] = 0));
  let win = 0, majority = 0;
  const extra = pollExtra(s);
  for (let i = 0; i < runs; i++) {
    const rnd = mulberry(s.turn * 7919 + i * 104729 + (s.seed % 9973));
    const nat = nationalShares(s, rnd, extra);
    const res = allocateSeats(s, nat, rnd);
    sy.parties.forEach((p) => (seatSum[p.id] += res.seats[p.id]));
    const total = Object.values(res.seats).reduce((a, b) => a + b, 0);
    if (res.seats[P.playerParty] > total / 2) majority++;
    if (sy.presidential) { const w = Object.keys(res.ev!).reduce((a, b) => (res.ev![a] >= res.ev![b] ? a : b)); if (w === P.playerParty) win++; }
    else { const f = formGovernment(s, res.seats); if ((f.kind === 'player') || (f.kind === 'formed' && f.pm === P.playerParty)) win++; }
  }
  const seats: Record<string, number> = {}; sy.parties.forEach((p) => (seats[p.id] = Math.round(seatSum[p.id] / runs)));
  return { winProb: win / runs, majorityProb: majority / runs, seats, shares: pollShares(s) };
}
