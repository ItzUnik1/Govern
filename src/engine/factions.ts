// Stage 6 (part 2): party factions and backbench MPs. Imports no politics.ts code (politics.ts imports this file).
// The player's own party is split into three wings. Each has a leader, a share of the party's MPs and a loyalty
// that follows how close government policy is to its position. Loyalty decides how many of your own MPs vote
// for a bill, how likely a confidence-vote defection is, and whether a wing rebels or breaks away.
import { SYSTEMS } from './parties';
import type { EventDef } from './events';
import type { GameState } from './types';

export interface Faction {
  id: string; name: string; blurb: string;
  econ: number; social: number; // offset from the party's own position
  share: number; // fraction of the party's MPs
  leader: string;
  loyalty: number; // 0..100
  lowMonths: number; // consecutive months below 18
  asked: number; // months since you last consulted or rewarded them
}
export interface FactionState { party: string; factions: Faction[]; whipTurn: number; capital: number; log: string[]; lastChallenge: number }

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export function initFactions(s: GameState, rnd: () => number): FactionState {
  const sy = SYSTEMS[s.countryId], pid = s.pol.playerParty;
  const pd = sy.parties.find((p) => p.id === pid)!;
  const right = pd.econ >= 0;
  const nm = () => `${sy.names.first[Math.floor(rnd() * sy.names.first.length)]} ${sy.names.last[Math.floor(rnd() * sy.names.last.length)]}`;
  const mk = (id: string, name: string, blurb: string, econ: number, social: number, share: number): Faction =>
    ({ id, name, blurb, econ, social, share, leader: nm(), loyalty: 62 + Math.round(rnd() * 8), lowMonths: 0, asked: 0 });
  return {
    party: pid, whipTurn: -1, capital: 50, log: [], lastChallenge: -99,
    factions: [
      mk('left', right ? 'Moderates' : 'Left flank', right ? 'Want a softer, more spending-friendly line.' : 'Want more state spending, welfare and public services.', -0.35, -0.2, 0.28),
      mk('core', 'Mainstream', 'Loyal to the leadership unless things go badly.', 0, 0, 0.44),
      mk('right', right ? 'Free-market hawks' : 'Fiscal hawks', 'Want tax cuts, lean budgets and discipline.', 0.35, 0.2, 0.28),
    ],
  };
}

export const playerPM = (s: GameState) => !!s.fac && s.pol.inGovernment && s.pol.pmParty === s.pol.playerParty;
export const avgLoyalty = (s: GameState) => s.fac ? s.fac.factions.reduce((a, f) => a + f.share * f.loyalty, 0) : 60;
/** Share of your own MPs who are in open revolt (loyalty below 30). */
export const rebelShare = (s: GameState) => (playerPM(s) ? s.fac.factions.filter((f) => f.loyalty < 30).reduce((a, f) => a + f.share, 0) : 0);

/** Bill support within the governing party, faction by faction. Returns null when the player does not lead the government. */
export function partyYes(s: GameState, zBase: (econOff: number, socialOff: number) => number): number | null {
  if (!playerPM(s)) return null;
  const whipped = s.pol.bill && s.fac.whipTurn === s.pol.bill.turn;
  let yes = 0;
  for (const f of s.fac.factions) {
    const z = zBase(f.econ, f.social) + 0.03 * (f.loyalty - 50) + (whipped ? 0.9 : 0);
    yes += f.share * sigmoid(2.2 * z);
  }
  return yes;
}

// ---------- monthly ----------
export function stepFactions(s: GameState, rnd: () => number, notes: string[], tilt: number) {
  const F = s.fac; if (!F) return;
  if (!playerPM(s)) { F.factions.forEach((f) => { f.loyalty += 0.05 * (60 - f.loyalty); f.lowMonths = 0; }); return; }
  const P = s.pol;
  const norm = () => (rnd() + rnd() + rnd() - 1.5) * 2;
  F.capital = clamp(F.capital + 0.8 + 0.02 * (s.approval - 40), 0, 100);
  for (const f of F.factions) {
    const align = 1 - 1.3 * Math.abs(tilt - f.econ);
    const hardTimes = s.approval < 35 ? -0.6 : 0;
    const winning = s.approval > 55 ? 0.3 : 0;
    f.loyalty = clamp(f.loyalty + 0.5 * align - 0.3 + 0.02 * (s.approval - 40) + hardTimes + winning + 0.5 * norm(), 0, 100);
    f.asked++;
    f.lowMonths = f.loyalty < 18 ? f.lowMonths + 1 : 0;
  }
  // a wing that has been in revolt for months breaks away and takes its MPs to the strongest rival
  for (const f of F.factions) {
    if (f.lowMonths < 4) continue;
    const mine = P.parties[P.playerParty];
    const moved = Math.floor(mine.seats * f.share * 0.7);
    const sy = SYSTEMS[s.countryId];
    const target = sy.parties.filter((p) => p.id !== P.playerParty && !p.regions && !P.coalition.includes(p.id)).sort((a, b) => (P.parties[b.id]?.seats ?? 0) - (P.parties[a.id]?.seats ?? 0))[0];
    if (!target || moved < 1) { f.lowMonths = 0; continue; }
    mine.seats -= moved; P.parties[target.id].seats += moved;
    const coal = P.coalition.reduce((a, id) => a + (P.parties[id]?.seats ?? 0), 0);
    const tot = Object.values(P.parties).reduce((a, p) => a + p.seats, 0);
    P.minority = coal <= tot / 2;
    f.share *= 0.3; f.loyalty = 40; f.lowMonths = 0;
    const sum = F.factions.reduce((a, x) => a + x.share, 0); F.factions.forEach((x) => (x.share /= sum));
    s.stability = clamp(s.stability - 5, 3, 98); s.approval = clamp(s.approval - 3, 3, 95);
    notes.push(`The ${f.name} wing, led by ${f.leader}, has broken away: ${moved} MPs now sit with ${target.short}.${P.minority ? ' You have lost your majority.' : ''}`);
  }
  // open revolt weakens the government's standing; the confidence-vote effect is applied in politics.ts through rebelShare()
  const rs = rebelShare(s);
  if (rs > 0) s.modifiers.push({ id: 'rebels', label: 'Party in open revolt', monthsLeft: 1, stability: -5 * rs, approval: -1.2 * rs });
  const lo = F.factions.filter((f) => f.loyalty < 30 && f.lowMonths === 0 && rnd() < 0.05);
  if (lo.length) notes.push(`Rumblings in the party: the ${lo[0].name} are unhappy.`);
}

// ---------- player actions ----------
export interface FacAction { id: string; name: string; desc: string; costPct: number; capital: number }
export const FAC_ACTIONS: FacAction[] = [
  { id: 'consult', name: 'Consult', desc: 'Hold a meeting and listen. Loyalty +4; free but costs a little time.', costPct: 0, capital: 4 },
  { id: 'reward', name: 'Reward with posts', desc: 'Give the wing junior jobs and committee seats. Loyalty +10; looks like patronage.', costPct: 0.03, capital: 15 },
  { id: 'discipline', name: 'Discipline', desc: 'Warn their leader. Loyalty drops, but other wings see strong leadership (+2).', costPct: 0, capital: 5 },
];
export function facAction(s: GameState, facId: string, act: string): string {
  const F = s.fac; if (!F || !playerPM(s)) return 'Only the party leader in government can manage the party.';
  const f = F.factions.find((x) => x.id === facId), a = FAC_ACTIONS.find((x) => x.id === act);
  if (!f || !a) return 'Unknown';
  if (F.capital < a.capital) return `Not enough political capital (need ${a.capital}).`;
  if (f.asked < 2 && act !== 'discipline') return 'You spoke with them very recently. Give it a couple of months.';
  F.capital -= a.capital; f.asked = 0;
  if (a.costPct) s.pendingCosts += (a.costPct / 100) * s.gdp;
  if (act === 'consult') { f.loyalty = clamp(f.loyalty + 4, 0, 100); return `${f.leader} appreciates being heard. (+4 loyalty)`; }
  if (act === 'reward') { f.loyalty = clamp(f.loyalty + 10, 0, 100); s.approval = clamp(s.approval - 0.3, 3, 95); return `${f.leader} and allies get new posts. (+10 loyalty)`; }
  f.loyalty = clamp(f.loyalty - 8, 0, 100);
  F.factions.forEach((o) => { if (o !== f) o.loyalty = clamp(o.loyalty + 2, 0, 100); });
  return `${f.leader} is put on notice. The other wings take note.`;
}
export function whipBill(s: GameState): string | null {
  const F = s.fac; if (!F || !playerPM(s)) return 'Only the governing party leader can whip.';
  if (!s.pol.bill) return 'No bill pending.';
  if (F.whipTurn === s.pol.bill.turn) return 'Already whipped.';
  if (F.capital < 10) return 'Not enough political capital (need 10).';
  F.capital -= 10; F.whipTurn = s.pol.bill.turn;
  F.factions.forEach((f) => { f.loyalty = clamp(f.loyalty - 2.5, 0, 100); });
  return 'Whips are out. Your MPs are told to vote with the government (-2.5 loyalty each wing).';
}

// ---------- events ----------
const cl = clamp;
export const FACTION_EVENTS: EventDef[] = [
  {
    id: 'backbenchRevolt', title: 'Backbench revolt', icon: '🗣️', category: 'Politics', cooldown: 18,
    weight: (s) => (playerPM(s) ? Math.max(0, (45 - Math.min(...s.fac.factions.map((f) => f.loyalty))) / 18) * 0.8 : 0),
    text: (s) => { const f = [...s.fac.factions].sort((a, b) => a.loyalty - b.loyalty)[0]; return `${f.leader} and the ${f.name} wing are threatening to vote against the government unless their concerns are met. ${f.blurb}`; },
    choices: [
      { label: 'Meet their demands', hint: 'Shifts policy their way; loyalty up, others grumble', run: (fx) => { const F = fx.s.fac; const f = [...F.factions].sort((a, b) => a.loyalty - b.loyalty)[0]; f.loyalty = cl(f.loyalty + 22, 0, 100); F.factions.forEach((o) => { if (o !== f) o.loyalty = cl(o.loyalty - 3, 0, 100); }); fx.cost(0.15); fx.approval(-0.5); return `You agree to a package of concessions. ${f.leader} calls off the revolt.`; } },
      { label: 'Offer posts and patronage', hint: 'Costs political capital; loyalty up', run: (fx) => { const F = fx.s.fac; const f = [...F.factions].sort((a, b) => a.loyalty - b.loyalty)[0]; f.loyalty = cl(f.loyalty + 16, 0, 100); F.capital = cl(F.capital - 15, 0, 100); fx.approval(-0.8); return `Jobs and committee seats are handed out. ${f.leader} is satisfied for now.`; } },
      { label: 'Crack down', hint: 'Might break them, might split the party', run: (fx) => { const F = fx.s.fac; const f = [...F.factions].sort((a, b) => a.loyalty - b.loyalty)[0]; if (fx.rnd() < 0.5 + 0.004 * F.capital) { f.loyalty = cl(f.loyalty + 8, 0, 100); F.factions.forEach((o) => { if (o !== f) o.loyalty = cl(o.loyalty + 3, 0, 100); }); fx.stability(1); return `${f.leader} backs down. The party sees a leader in command.`; } f.loyalty = cl(f.loyalty - 12, 0, 100); fx.stability(-2); fx.approval(-1.5); return `The crackdown backfires. ${f.leader} goes public with their grievances.`; } },
      { label: 'Ignore it', hint: 'Cheap, but loyalty keeps sliding', run: (fx) => { const F = fx.s.fac; const f = [...F.factions].sort((a, b) => a.loyalty - b.loyalty)[0]; f.loyalty = cl(f.loyalty - 6, 0, 100); fx.approval(-0.5); return 'The grumbling continues.'; } },
    ],
  },
  {
    id: 'leadershipChallenge', title: 'Leadership challenge', icon: '⚔️', category: 'Crisis', cooldown: 48,
    weight: (s) => (playerPM(s) && s.approval < 32 && s.turn - s.fac.lastChallenge > 24 ? Math.max(0, (36 - Math.min(...s.fac.factions.map((f) => f.loyalty))) / 20) * 0.9 : 0),
    text: (s) => { const f = [...s.fac.factions].sort((a, b) => a.loyalty - b.loyalty)[0]; return `With the polls so poor, ${f.leader} of the ${f.name} wing has called for a vote on the party leadership. A challenge is on.`; },
    choices: [
      { label: 'Fight it out', hint: 'Win and your authority is restored; lose and you are out', run: (fx) => { const s = fx.s; s.fac.lastChallenge = s.turn; const odds = clamp(0.2 + 0.006 * (s.fac.factions.reduce((a, f) => a + f.share * f.loyalty, 0) - 30) + 0.004 * s.fac.capital + 0.004 * s.approval, 0.1, 0.9); if (fx.rnd() < odds) { s.fac.factions.forEach((f) => { f.loyalty = cl(f.loyalty + 10, 0, 100); }); fx.stability(3); return 'You win the party vote and see off the challenger. The rebels are chastened.'; } s.gameOver = { kind: 'lost', title: 'Ousted by your party', text: 'You lost the leadership vote. Your career as head of government is over.' }; return 'You lose the ballot.'; } },
      { label: 'Offer a deal and a reshuffle', hint: 'Costs approval and capital; avoids a vote', run: (fx) => { const s = fx.s; s.fac.lastChallenge = s.turn; s.fac.factions.forEach((f) => { f.loyalty = cl(f.loyalty + 12, 0, 100); }); s.fac.capital = cl(s.fac.capital - 25, 0, 100); fx.approval(-1.5); fx.stability(-1); return 'You surrender some power in return for peace.'; } },
      { label: 'Call a confidence test', hint: 'Risky for the whole government', run: (fx) => { const s = fx.s; s.fac.lastChallenge = s.turn; if (fx.rnd() < 0.5) { s.fac.factions.forEach((f) => { f.loyalty = cl(f.loyalty + 15, 0, 100); }); fx.stability(4); return 'The party closes ranks behind you rather than risk an election.'; } s.monthsToElection = Math.min(s.monthsToElection, 1); s.flags.snap = 1; fx.stability(-4); return 'The gamble fails. An election is called for next month.'; } },
    ],
  },
  {
    id: 'partyConference', title: 'Party conference', icon: '🎤', category: 'Politics', cooldown: 30,
    weight: (s) => (playerPM(s) && s.turn > 10 ? 0.35 : 0),
    text: () => 'Delegates gather for the annual party conference. Each wing wants a headline motion. You can shape the mood.',
    choices: [
      { label: 'Back the left wing\'s motion', hint: 'Left loyalty up, right down', run: (fx) => { const F = fx.s.fac; F.factions[0].loyalty = cl(F.factions[0].loyalty + 12, 0, 100); F.factions[2].loyalty = cl(F.factions[2].loyalty - 6, 0, 100); return 'Delegates cheer the left flank; the hawks sulk.'; } },
      { label: 'Back the right wing\'s motion', hint: 'Right loyalty up, left down', run: (fx) => { const F = fx.s.fac; F.factions[2].loyalty = cl(F.factions[2].loyalty + 12, 0, 100); F.factions[0].loyalty = cl(F.factions[0].loyalty - 6, 0, 100); return 'The hawks win the vote; the left flank grumbles.'; } },
      { label: 'Give a unity speech', hint: 'All wings a little happier; capital up', run: (fx) => { const F = fx.s.fac; F.factions.forEach((f) => { f.loyalty = cl(f.loyalty + 4, 0, 100); }); F.capital = cl(F.capital + 10, 0, 100); fx.approval(0.5); return 'A strong speech lifts everyone.'; } },
    ],
  },
];
