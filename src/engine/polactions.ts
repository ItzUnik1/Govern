// Player actions in the political arena. Each mutates the state it is given (the UI passes a clone).
import { BILLS, getBill } from './laws';
import { billOutcome, confidenceVote, fallOfGovernment, isPresidential, makePromise, pdef, refreshPool } from './politics';
import { COUNTRIES } from './countries';
import { rngNext } from './sim';
import type { GameState } from './types';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const rnd = (s: GameState) => rngNext(s);
function normal(r: () => number) { return Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(2 * Math.PI * r()); }

export function proposeBill(s: GameState, id: string): string | null {
  const P = s.pol; const b = getBill(id);
  if (!b) return 'Unknown bill';
  if (!P.inGovernment) return 'Only the government can introduce bills.';
  if (P.bill) return 'A bill is already before parliament.';
  if (P.billCooldown > 0) return `The legislative calendar is full. Try again in ${P.billCooldown} month(s).`;
  if (P.passed.includes(id)) return 'Already law.';
  if (P.failedAt[id] !== undefined && s.turn - P.failedAt[id] < 12) return 'This bill failed recently; MPs will not reconsider it yet.';
  P.bill = { id, lobbied: false, turn: s.turn };
  return null;
}
export function lobbyBill(s: GameState): string | null {
  const P = s.pol; if (!P.bill) return 'No bill pending.';
  if (P.bill.lobbied) return 'You have already lobbied on this bill.';
  P.bill.lobbied = true; s.approval = clamp(s.approval - 1.5, 3, 95);
  return null;
}
export function withdrawBill(s: GameState) { s.pol.bill = null; }
export function voteBill(s: GameState): { pass: boolean; text: string } {
  const P = s.pol; const c = COUNTRIES[s.countryId];
  if (!P.bill) return { pass: false, text: 'No bill pending.' };
  const b = getBill(P.bill.id)!;
  const o = billOutcome(s, b.id, P.bill.lobbied);
  const r = rnd(s);
  const pass = o.pct + 1.5 * normal(() => rnd(s)) > 50;
  void r;
  P.bill = null; P.billCooldown = 2;
  if (pass) {
    b.enact(s, c); P.passed.push(b.id);
    s.approval = clamp(s.approval + 0.5, 3, 95); s.stability = clamp(s.stability + 0.5, 3, 98);
    return { pass: true, text: `${b.name} passes ${o.yes} to ${o.no} and becomes law. ${b.effect}` };
  }
  P.failedAt[b.id] = s.turn; s.stability = clamp(s.stability - 1.5, 3, 98); s.approval = clamp(s.approval - 1, 3, 95);
  return { pass: false, text: `${b.name} is defeated ${o.no} to ${o.yes}. It is a blow to your authority.` };
}

export function callConfidence(s: GameState): { won: boolean; text: string } | string {
  if (isPresidential(s)) return 'Presidential systems have no confidence votes.';
  if (!s.pol.inGovernment) return 'Only the government can call one.';
  const v = confidenceVote(s, () => rnd(s));
  if (v.won) { s.stability = clamp(s.stability + 4, 3, 98); s.pol.coalition.forEach((id) => { if (id !== s.pol.pmParty) s.pol.parties[id].sat = Math.min(100, s.pol.parties[id].sat + 4); }); return { won: true, text: `You win the confidence vote ${v.yes} to ${v.no}. Doubters fall silent.` }; }
  fallOfGovernment(s);
  return { won: false, text: `You lose ${v.no} to ${v.yes}. Parliament is dissolved and an election is called for next month.` };
}
export function callEarlyElection(s: GameState): string | null {
  if (isPresidential(s)) return 'Fixed-term elections only.';
  if (!s.pol.inGovernment) return 'Only the government can call one.';
  if (s.monthsInOffice < 12) return 'Too early: wait until you have governed for a year.';
  s.monthsToElection = 1; s.flags.snap = 1;
  return null;
}

// ---------- campaigning ----------
const use = (s: GameState, k: string) => s.flags['use_' + k] ?? 0;
export function mediaBlitz(s: GameState): string {
  const u = use(s, 'blitz'); const gain = 1.5 * Math.max(0.2, 1 - 0.3 * u);
  s.flags['use_blitz'] = u + 1; s.pol.campaign += gain;
  if (s.pol.inGovernment) s.pendingCosts += 0.0004 * s.gdp;
  return `National media push: +${gain.toFixed(1)} points of vote share in the polls (fades over time).`;
}
export function rally(s: GameState, regionId: string): string | null {
  const u = use(s, 'rally_' + regionId);
  if (u > 0.9) return 'You were just there - give the region a few months.';
  s.flags['use_rally_' + regionId] = u + 1.5; s.pol.campaignRegion[regionId] = (s.pol.campaignRegion[regionId] ?? 0) + 4;
  s.pol.campaign += 0.2;
  if (s.pol.inGovernment) s.pendingCosts += 0.0003 * s.gdp;
  return 'Big rally! Local support rises.';
}
export function attackGovernment(s: GameState): string | null {
  if (s.pol.inGovernment) return 'You are the government.';
  const u = use(s, 'attack'); const f = Math.max(0.2, 1 - 0.3 * u);
  s.flags['use_attack'] = u + 1;
  s.approval = clamp(s.approval - 1.0 * f, 3, 95); s.pol.campaign += 0.7 * f;
  return 'You hammer the government on the cost of living. Their approval slips and yours rises.';
}
export function promise(s: GameState, id: string) { return makePromise(s, id); }
export const BILL_COUNT = BILLS.length; void pdef; void refreshPool;
