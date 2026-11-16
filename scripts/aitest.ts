// Rival AI test: offers, sanctions, opposition moves, no NaN, determinism. Run: npx tsx scripts/aitest.ts
import { COUNTRY_LIST } from '../src/engine/countries';
import { advanceMonth, newGame, resolveFormation, DIFFICULTY_PRESETS, resolveEvent, getCountry } from '../src/engine/sim';
import { getEvent, availableChoices } from '../src/engine/events';
import { answerOffer } from '../src/engine/rivalai';

let bad = 0;
const kinds: Record<string, number> = {}; let govM = 0, allM = 0, sanc = 0, moves = new Set<string>(), accepted = 0, declined = 0;
function run(id: string, seed: number, policy: 'accept' | 'decline' | 'ignore') {
  let s = newGame(id, DIFFICULTY_PRESETS.standard, seed);
  for (let i = 0; i < 180 && !s.gameOver; i++) {
    if (s.pendingEvent) { void getEvent; void availableChoices; void getCountry; resolveEvent(s, 0); }
    if (s.pol.pending === 'formation') {
      const ask = s.pol.formation!.ask, tot = s.pol.formation!.seatsTotal; let seats = s.pol.parties[s.pol.playerParty].seats; const pick: string[] = [];
      for (const k of Object.keys(ask).sort((a, b) => s.pol.parties[b].seats - s.pol.parties[a].seats)) { if (seats > tot / 2) break; pick.push(k); seats += s.pol.parties[k].seats; }
      s = structuredClone(s); if (resolveFormation(s, pick)) resolveFormation(s, null);
    }
    if (s.pol.inGovernment && policy !== 'ignore') for (const o of [...s.ai.offers]) { kinds[o.kind] = (kinds[o.kind] ?? 0) + 1; answerOffer(s, o.id, policy === 'accept' && Math.random() >= 0); policy === 'accept' ? accepted++ : declined++; }
    else for (const o of s.ai.offers) kinds[o.kind] = (kinds[o.kind] ?? 0) + 0;
    s = advanceMonth(s); allM++; if (s.pol.inGovernment) govM++;
    if (Object.values(s.dip.nations).some((n) => n.sanctionsYou)) sanc++;
    moves.add(s.ai.opp.lastMove.replace(/^.*?(hammers|courts|threatens|attacks|unveils).*$/, '$1'));
    for (const v of [s.gdp, s.inflation, s.approval, s.stability, s.ai.opp.momentum]) if (!Number.isFinite(v)) { bad++; console.log('NaN', id, i); return s; }
    if (s.ai.offers.length > 3) { bad++; console.log('too many offers', id); }
  }
  return s;
}
for (const c of COUNTRY_LIST) for (const p of ['accept', 'decline', 'ignore'] as const) run(c.id, 7, p);
console.log('offers by kind', kinds, 'months with sanctions on you', sanc, 'opp moves', [...moves]);
console.log('months', allM, 'in government', govM, 'accepted', accepted, 'declined', declined);
// forced scenario: ally with the US, relations with Russia collapse -> Russia sanctions you eventually
{ let s = newGame('canada', DIFFICULTY_PRESETS.standard, 5); s.dip.nations.usa.ally = true; let hit = false;
  for (let i = 0; i < 150 && !hit; i++) { if (s.pendingEvent) resolveEvent(s, 0); if (s.pol.pending) break; s.dip.nations.russia.rel = 10; s = advanceMonth(s); hit = s.dip.nations.russia.sanctionsYou; }
  console.log('hostile AI sanctions an allied target:', hit); if (!hit) bad++; }
// determinism
const a = run('india', 99, 'ignore'), b = run('india', 99, 'ignore');
if (JSON.stringify(a.ai) !== JSON.stringify(b.ai)) { bad++; console.log('NOT deterministic'); }
console.log(bad ? 'FAIL ' + bad : 'AI test passed');
process.exit(bad ? 1 : 0);
