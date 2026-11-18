// Regions probe. Run: npx tsx scripts/regprobe.ts
import { COUNTRY_LIST } from '../src/engine/countries';
import { advanceMonth, newGame, resolveEvent, resolveFormation, DIFFICULTY_PRESETS, getCountry } from '../src/engine/sim';
import { getEvent, availableChoices } from '../src/engine/events';
import { devGap, nationalRelation, setRegPolicy } from '../src/engine/regions';
for (const mode of ['standard', 'central', 'devolved']) {
  const ev: Record<string, number> = {}; let flips = 0;
  for (const c of COUNTRY_LIST) {
    let s = newGame(c.id, DIFFICULTY_PRESETS.standard, 3);
    if (mode === 'central') { setRegPolicy(s, 'devolution', 0); setRegPolicy(s, 'grants', 0); }
    if (mode === 'devolved') { setRegPolicy(s, 'devolution', 2); setRegPolicy(s, 'grants', 3); }
    const gov0 = s.reg.list.map((r) => r.gov).join();
    for (let i = 0; i < 240 && !s.gameOver; i++) {
      if (s.pol.pending) { s = structuredClone(s); resolveFormation(s, null); continue; }
      if (s.pendingEvent) { const d = getEvent(s.pendingEvent)!; ev[d.id] = (ev[d.id] ?? 0) + 1; s = structuredClone(s); resolveEvent(s, i % availableChoices(d, s, getCountry(s)).length); }
      s = advanceMonth(s);
      for (const r of s.reg.list) for (const v of [r.dev, r.relation, r.grievance]) if (!Number.isFinite(v)) throw new Error('NaN');
    }
    if (s.reg.list.map((r) => r.gov).join() !== gov0) flips++;
    if (c.id === 'nepal' || c.id === 'uk') console.log(mode.padEnd(8), c.id.padEnd(6), `rel ${nationalRelation(s).toFixed(0)} gap ${devGap(s).toFixed(1)} gini ${s.eco.gini.toFixed(1)} regs`, s.reg.list.map((r) => `${r.relation.toFixed(0)}/${r.grievance.toFixed(0)}/${r.dev.toFixed(0)}`).join(' '));
  }
  console.log(mode, 'events', JSON.stringify({ p: ev.regionalProtest ?? 0, a: ev.autonomyDemand ?? 0, g: ev.governorFeud ?? 0 }), 'countries with a regional government change', flips);
}
