import { advanceMonth, newGame, DIFFICULTY_PRESETS, getCountry } from '../src/engine/sim';
import { ecoMetrics } from '../src/engine/economy';
import { startProject, projectCapacity } from '../src/engine/projects';
import { getEvent, availableChoices } from '../src/engine/events';
import { resolveEvent } from '../src/engine/sim';
let id = process.argv[2] ?? 'uk', withProj = process.argv[3] === 'proj';
let s = newGame(id, DIFFICULTY_PRESETS.standard, 5);
if (withProj) { for (const p of ['highways', 'hydro', 'universities']) console.log('start', p, startProject(s, p)); console.log('cap', projectCapacity(s)); }
for (let i = 0; i < 240 && !s.gameOver; i++) {
  if (s.pendingEvent) { const d = getEvent(s.pendingEvent)!; const ch = availableChoices(d, s, getCountry(s)); s = structuredClone(s); resolveEvent(s, i % ch.length); }
  s = advanceMonth(s);
  if (i % 24 === 23 || i === 0) {
    const m = ecoMetrics(s, getCountry(s)); const e = s.eco;
    console.log(s.y, 'gdppc', m.gdpPc.toFixed(0), 'X', e.exportsPct.toFixed(1), 'M', e.importsPct.toFixed(1), 'CA', m.caPct.toFixed(1), 'FDI', m.fdiPct.toFixed(2), 'res', m.reservesMonths.toFixed(1), 'gini', m.gini.toFixed(1), 'hdi', m.hdi.toFixed(3), 'cur', s.currency.toFixed(0), 'agri', e.sectors.agriculture.share.toFixed(1), 'mfg', e.sectors.manufacturing.share.toFixed(1), 'svc', e.sectors.services.share.toFixed(1), 'proj', s.projects.map((p) => p.id + ':' + p.progress.toFixed(0)).join(','));
  }
}
