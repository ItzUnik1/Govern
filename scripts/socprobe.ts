// Society probe. Run: npx tsx scripts/socprobe.ts [policy-set]
import { COUNTRY_LIST } from '../src/engine/countries';
import { advanceMonth, newGame, resolveEvent, DIFFICULTY_PRESETS, getCountry, debtPct } from '../src/engine/sim';
import { getEvent, availableChoices } from '../src/engine/events';
import { setSocPolicy } from '../src/engine/society';
import type { GameState } from '../src/engine/types';

const mode = process.argv[2] ?? 'idle';
const apply = (s: GameState) => {
  if (mode === 'green') { setSocPolicy(s, 'carbon', 2); setSocPolicy(s, 'renew', 1); setSocPolicy(s, 'adapt', 1); }
  if (mode === 'people') { setSocPolicy(s, 'family', 2); setSocPolicy(s, 'migration', 2); setSocPolicy(s, 'rural', 1); setSocPolicy(s, 'housing', 1); }
  if (mode === 'media') { setSocPolicy(s, 'broadcaster', 1); setSocPolicy(s, 'foi', 1); }
};
for (const c of COUNTRY_LIST) {
  let s = newGame(c.id, DIFFICULTY_PRESETS.standard, 11);
  apply(s);
  let appSum = 0, n = 0, disasters = 0;
  for (let i = 0; i < 360 && !s.gameOver; i++) {
    if (s.pol.pending) break;
    if (s.pendingEvent) { const def = getEvent(s.pendingEvent)!; if (def.id === 'disaster') disasters++; s = structuredClone(s); resolveEvent(s, i % availableChoices(def, s, getCountry(s)).length); }
    s = advanceMonth(s);
    for (const v of [s.gdp, s.inflation, s.soc.emissions, s.soc.trust, s.soc.work, s.soc.old]) if (!Number.isFinite(v)) throw new Error('NaN ' + c.id + ' ' + i);
    appSum += s.approval; n++;
  }
  const o = s.soc;
  console.log(c.id.padEnd(11), `yrs ${(n / 12).toFixed(0)} appr ${(appSum / n).toFixed(0)} infl ${s.inflation.toFixed(1)} debt ${debtPct(s).toFixed(0)}% | old ${o.old.toFixed(1)} work ${o.work.toFixed(1)} (ref ${o.workRef.toFixed(1)}) urb ${o.urban.toFixed(0)} fert ${o.fertility.toFixed(2)} | emis ${o.emissions.toFixed(0)} ren ${o.renew.toFixed(0)} risk ${o.risk.toFixed(0)} res ${o.resilience.toFixed(0)} dis ${disasters} | trust ${o.trust.toFixed(0)} heat ${o.heat.toFixed(0)} | blocs ${Object.values(o.bloc).map((x) => x.toFixed(0)).join('/')}`);
}
