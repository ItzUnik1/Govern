import { COUNTRY_LIST } from '../src/engine/countries';
import { advanceMonth, newGame, resolveFormation, DIFFICULTY_PRESETS, resolveEvent, getCountry, setSpend } from '../src/engine/sim';
import { getEvent, availableChoices } from '../src/engine/events';
import { SYSTEMS } from '../src/engine/parties';
import { forecast, totalSeats, coalSeats, pdef } from '../src/engine/politics';
import { mediaBlitz, rally, attackGovernment, promise } from '../src/engine/polactions';
import type { GameState } from '../src/engine/types';

function autoPlay(id: string, party: string | undefined, seed: number, years: number, strat: 'idle' | 'good') {
  let s = newGame(id, DIFFICULTY_PRESETS.standard, seed, 'You', party);
  const log = { elections: 0, wins: 0, opp: 0, snap: 0, hung: 0, nc: 0, over: '' };
  for (let i = 0; i < years * 12 && !s.gameOver; i++) {
    if (s.pol.pending === 'formation') {
      log.hung++;
      const ask = s.pol.formation!.ask; const sy = SYSTEMS[id]; const tot = s.pol.formation!.seatsTotal;
      let seats = s.pol.parties[s.pol.playerParty].seats; const pick: string[] = [];
      for (const k of Object.keys(ask).sort((a, b) => s.pol.parties[b].seats - s.pol.parties[a].seats)) { if (seats > tot / 2) break; pick.push(k); seats += s.pol.parties[k].seats; }
      s = structuredClone(s);
      let err = resolveFormation(s, pick);
      if (err) err = resolveFormation(s, null);
    }
    if (s.pendingEvent) {
      const d = getEvent(s.pendingEvent)!; const ch = availableChoices(d, s, getCountry(s)); s = structuredClone(s);
      if (d.id === 'noConfidence') log.nc++;
      resolveEvent(s, d.id === 'noConfidence' ? 0 : i % ch.length);
    }
    if (strat === 'good' && i % 12 === 0 && s.pol.inGovernment) { s = structuredClone(s); const c = getCountry(s); setSpend(s, 'education', c.spend0.education * 1.15); setSpend(s, 'health', c.spend0.health * 1.1); }
    if (strat === 'good' && s.monthsToElection <= 10) { s = structuredClone(s); if (s.monthsToElection % 2 === 0) mediaBlitz(s); if (s.monthsToElection === 8) { promise(s, 'health'); promise(s, 'jobs'); } }
    if (strat === 'good' && !s.pol.inGovernment) { s = structuredClone(s); attackGovernment(s); if (s.monthsToElection <= 10) mediaBlitz(s); }
    s = advanceMonth(s);
    if (!s.pol.inGovernment) log.opp++;
  }
  const gen = s.electionHistory.filter((e) => e.kind !== 'midterm'); log.elections = gen.length; log.wins = gen.filter((e) => e.won).length;
  log.over = s.gameOver ? s.gameOver.kind : '-';
  return { s, log };
}
const mode = process.argv[2] ?? 'init';
if (mode === 'init') {
  for (const c of COUNTRY_LIST) {
    for (const party of SYSTEMS[c.id].leadable) {
      const s = newGame(c.id, DIFFICULTY_PRESETS.standard, 11, 'You', party);
      const f = forecast(s);
      console.log(c.id.padEnd(9), party.padEnd(8), 'seats', Object.values(s.pol.parties).map((p) => p.seats).join('/'), 'coal', s.pol.coalition.join('+'), `${coalSeats(s)}/${totalSeats(s)}`, 'win%', Math.round(f.winProb * 100), 'maj%', Math.round(f.majorityProb * 100));
    }
  }
} else {
  const N = Number(process.argv[3] ?? 12);
  console.log('country  party    elections wins win% opp% hung nc over');
  for (const c of COUNTRY_LIST) for (const party of SYSTEMS[c.id].leadable) {
    const a = { e: 0, w: 0, opp: 0, hung: 0, nc: 0, months: 0 }; const overs: Record<string, number> = {};
    for (let k = 1; k <= N; k++) { const r = autoPlay(c.id, party, k * 977, 24, mode === 'good' ? 'good' : 'idle'); a.e += r.log.elections; a.w += r.log.wins; a.opp += r.log.opp; a.hung += r.log.hung; a.nc += r.log.nc; a.months += r.s.turn; overs[r.log.over] = (overs[r.log.over] ?? 0) + 1; }
    console.log(c.id.padEnd(9), party.padEnd(8), String(a.e).padEnd(9), String(a.w).padEnd(4), String(Math.round(100 * a.w / Math.max(1, a.e))).padEnd(4), String(Math.round(100 * a.opp / Math.max(1, a.months))).padEnd(4), String(a.hung).padEnd(4), String(a.nc).padEnd(2), JSON.stringify(overs));
  }
}
