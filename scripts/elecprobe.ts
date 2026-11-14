import { COUNTRY_LIST } from '../src/engine/countries';
import { advanceMonth, newGame, resolveEvent, DIFFICULTY_PRESETS, getCountry } from '../src/engine/sim';
import { getEvent, availableChoices } from '../src/engine/events';
const N = 80;
for (const c of COUNTRY_LIST) {
  let wins = 0, apprAt = 0, tot = 0, wins2 = 0, tot2 = 0;
  for (let seed = 1; seed <= N; seed++) {
    let s = newGame(c.id, DIFFICULTY_PRESETS.standard, seed * 977);
    for (let i = 0; i < 12 * 14 && !s.gameOver; i++) {
      if (s.pendingEvent) { const ch = availableChoices(getEvent(s.pendingEvent as string)!, s, getCountry(s)); s = structuredClone(s); resolveEvent(s, (seed * 7 + i) % ch.length); }
      s = advanceMonth(s);
      if (s.lastElection) { if (s.electionHistory.length === 1) { tot++; if (s.lastElection.won) wins++; apprAt += s.lastElection.approval; } else if (s.electionHistory.length === 2) { tot2++; if (s.lastElection.won) wins2++; } }
    }
  }
  console.log(c.id.padEnd(10), 'first-election win', (100 * wins / tot).toFixed(0) + '%', 'mean approval at election', (apprAt / tot).toFixed(1), '(start', c.approval0 + ')', ' second election win', tot2 ? (100 * wins2 / tot2).toFixed(0) + '%' : '-');
}
