import { advanceMonth, newGame, DIFFICULTY_PRESETS, resolveEvent, getCountry } from '../src/engine/sim';
import { getEvent, availableChoices, EVENTS } from '../src/engine/events';
import { negotiateTrade, takeLoan, joinOrg, delegation } from '../src/engine/diplomacy';
import { startTech, setBudget } from '../src/engine/research';
const id = process.argv[2] ?? 'india';
let s = newGame(id, DIFFICULTY_PRESETS.standard, 3);
console.log(negotiateTrade(s, 'usa'), takeLoan(s, 'wb', 1), startTech(s, 'seeds'), startTech(s, 'egov'));
setBudget(s, 1.0);
for (let i = 0; i < 180 && !s.gameOver; i++) {
  if (s.pol.pending) { break; }
  if (s.pendingEvent) { const d = getEvent(s.pendingEvent)!; const ch = availableChoices(d, s, getCountry(s)); s = structuredClone(s); resolveEvent(s, i % ch.length); }
  if (i % 8 === 0) { s = structuredClone(s); delegation(s, 'usa'); delegation(s, 'china'); }
  s = advanceMonth(s);
  if (i % 36 === 35) console.log(s.y, 'gdp', s.gdp.toFixed(0), 'g', s.growth.toFixed(1), 'X', s.eco.exportsPct.toFixed(1), 'FDI', s.eco.fdiPct.toFixed(2), 'infl', s.dip.influence.toFixed(0), 'done', s.res.done.join(','), 'trade', Object.entries(s.dip.nations).filter(([, n]) => n.trade).map(([k]) => k).join(','), 'ev', s.eventHistory.filter((e) => ['Diplomacy'].includes(EVENTS.find((x) => x.id === e.id)?.category ?? '')).length);
}
