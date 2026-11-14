import { EVENTS, availableChoices } from '../src/engine/events';
import { COUNTRY_LIST } from '../src/engine/countries';
import { newGame, resolveEvent, advanceMonth, DIFFICULTY_PRESETS, getCountry } from '../src/engine/sim';
let n = 0;
for (const c of COUNTRY_LIST) for (const ev of EVENTS) {
  const base = newGame(c.id, DIFFICULTY_PRESETS.hard, 5);
  const count = availableChoices(ev, base, c).length;
  for (let i = 0; i < count; i++) {
    let s = structuredClone(base); s.pendingEvent = ev.id;
    resolveEvent(s, i);
    if (s.pendingEvent) throw new Error('not resolved ' + ev.id);
    s = advanceMonth(s);
    if (![s.gdp, s.inflation, s.debt, s.approval, s.stability].every(Number.isFinite)) throw new Error(`NaN after ${ev.id}/${i}/${c.id}`);
    n++;
  }
  void getCountry;
}
console.log('every event choice executed on every country without errors:', n);
