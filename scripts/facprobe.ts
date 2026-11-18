// Factions probe. Run: npx tsx scripts/facprobe.ts
import { COUNTRY_LIST } from '../src/engine/countries';
import { advanceMonth, newGame, resolveEvent, DIFFICULTY_PRESETS, getCountry, setSpend, setTax } from '../src/engine/sim';
import { getEvent, availableChoices } from '../src/engine/events';
import { resolveFormation } from '../src/engine/sim';
import type { GameState } from '../src/engine/types';

const strat: Record<string, (s: GameState) => void> = {
  idle: () => {},
  left: (s) => { const c = getCountry(s); setSpend(s, 'welfare', c.spend0.welfare * 1.5); setTax(s, 'incomeTax', c.tax0.incomeTax + 4); },
  right: (s) => { const c = getCountry(s); setSpend(s, 'welfare', c.spend0.welfare * 0.6); setTax(s, 'incomeTax', c.tax0.incomeTax - 5); setTax(s, 'corpTax', c.tax0.corpTax - 6); },
};
for (const name of Object.keys(strat)) {
  let revolts = 0, splits = 0, challenges = 0, minLoy = 100, n = 0;
  for (const c of COUNTRY_LIST) {
    let s = newGame(c.id, DIFFICULTY_PRESETS.standard, 5);
    strat[name](s);
    for (let i = 0; i < 240 && !s.gameOver; i++) {
      if (s.pol.pending) { s = structuredClone(s); resolveFormation(s, null); continue; }
      if (s.pendingEvent) { const def = getEvent(s.pendingEvent)!; if (def.id === 'backbenchRevolt') revolts++; if (def.id === 'leadershipChallenge') challenges++; s = structuredClone(s); resolveEvent(s, i % availableChoices(def, s, getCountry(s)).length); }
      const before = s.pol.parties[s.pol.playerParty].seats;
      s = advanceMonth(s);
      if (s.pol.parties[s.pol.playerParty].seats < before - 2 && !s.lastElection) splits++;
      if (s.pol.inGovernment && s.pol.pmParty === s.pol.playerParty) { minLoy = Math.min(minLoy, ...s.fac.factions.map((f) => f.loyalty)); }
      n++;
      for (const f of s.fac.factions) if (!Number.isFinite(f.loyalty)) throw new Error('NaN loyalty');
    }
  }
  console.log(name.padEnd(6), `months ${n} revolts ${revolts} splits ${splits} challenges ${challenges} lowest loyalty ${minLoy.toFixed(0)}`);
}
