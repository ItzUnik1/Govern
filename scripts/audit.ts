// Realism audit: a competent, fiscally sensible bot governs each country for 30 years; we compare long-run
// outcomes with plausible real-world bands. Run: npx tsx scripts/audit.ts [country] [seeds]
import { COUNTRY_LIST } from '../src/engine/countries';
import { SYSTEMS } from '../src/engine/parties';
import { advanceMonth, newGame, debtPct, fiscal, setTax, resolveEvent, resolveFormation, DIFFICULTY_PRESETS, getCountry } from '../src/engine/sim';
import { getEvent, availableChoices } from '../src/engine/events';
import type { GameState } from '../src/engine/types';

function play(id: string, seed: number, years: number) {
  let s: GameState = newGame(id, DIFFICULTY_PRESETS.standard, seed, 'You');
  const c0 = getCountry(s);
  const snaps: Record<number, { g: number; i: number; u: number; d: number; df: number; a: number; real: number; ca: number }> = {};
  let prevReal = s.realIdx;
  for (let m = 0; m < years * 12 && !s.gameOver; m++) {
    if (s.pol.pending === 'formation') {
      const ask = s.pol.formation!.ask; const tot = s.pol.formation!.seatsTotal;
      let seats = s.pol.parties[s.pol.playerParty].seats; const pick: string[] = [];
      for (const k of Object.keys(ask).sort((a, b) => s.pol.parties[b].seats - s.pol.parties[a].seats)) { if (seats > tot / 2) break; pick.push(k); seats += s.pol.parties[k].seats; }
      s = structuredClone(s); if (resolveFormation(s, pick)) resolveFormation(s, null);
    }
    if (s.pendingEvent) { const d = getEvent(s.pendingEvent)!; const ch = availableChoices(d, s, getCountry(s)); s = structuredClone(s); resolveEvent(s, m % ch.length); }
    if (m % 12 === 0 && s.pol.inGovernment) {   // annual fiscal review: steer the deficit toward ~2.5% of GDP (or 1% if debt is high)
      s = structuredClone(s);
      const target = debtPct(s) > 90 ? 1.0 : 2.5; const f = fiscal(s);
      const gap = f.deficitPct - target;
      if (Math.abs(gap) > 0.6) setTax(s, 'vat', Math.max(c0.tax0.vat - 4, Math.min(c0.tax0.vat + 12, s.tax.vat + Math.sign(gap) * Math.min(1.5, Math.abs(gap) * 0.6))));
    }
    s = advanceMonth(s);
    if (m % 12 === 11) {
      const y = (m + 1) / 12;
      if (y === 1 || y % 5 === 0) snaps[y] = { g: (s.realIdx / prevReal - 1) * 100, i: s.inflation, u: s.unemployment, d: debtPct(s), df: fiscal(s).deficitPct, a: s.approval, real: s.realIdx, ca: s.eco.caPct };
      if (y === 1 || y % 5 === 0) prevReal = s.realIdx;
    }
  }
  return { s, snaps, yrs: s.turn / 12 };
}
const only = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2] : null;
const N = Number(process.argv[3] ?? 3);
const f = (x: number, d = 1) => x.toFixed(d);
console.log('country      yrs | start: gdp-g infl unemp debt | y10: g/yr infl unemp debt def appr | y20: g/yr infl unemp debt | y30: g/yr infl unemp debt | realIdx30');
for (const c of COUNTRY_LIST) {
  if (only && c.id !== only) continue;
  const runs = Array.from({ length: N }, (_, k) => play(c.id, 1000 + 77 * k, 30));
  const avg = (y: number, k: 'g' | 'i' | 'u' | 'd' | 'df' | 'a' | 'real') => { const v = runs.map((r) => r.snaps[y]?.[k]).filter((x): x is number => x !== undefined); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN; };
  const yrs = runs.reduce((a, r) => a + r.yrs, 0) / N;
  const cg = (y: number) => { const a = avg(y, 'real'), b = y > 5 ? avg(y - 5, 'real') : 100; return (Math.pow(a / b, 1 / 5) - 1) * 100; };
  console.log(c.id.padEnd(12), f(yrs, 0).padStart(3), '|', f(c.potentialGrowth).padStart(5), f(c.inflation0).padStart(5), f(c.unemployment0).padStart(5), f(c.debtPct0, 0).padStart(4),
    '|', f(cg(10)).padStart(5), f(avg(10, 'i')).padStart(5), f(avg(10, 'u')).padStart(5), f(avg(10, 'd'), 0).padStart(4), f(avg(10, 'df')).padStart(5), f(avg(10, 'a'), 0).padStart(4),
    '|', f(cg(20)).padStart(5), f(avg(20, 'i')).padStart(5), f(avg(20, 'u')).padStart(5), f(avg(20, 'd'), 0).padStart(4),
    '|', f(cg(30)).padStart(5), f(avg(30, 'i')).padStart(5), f(avg(30, 'u')).padStart(5), f(avg(30, 'd'), 0).padStart(4), '|', f(avg(30, 'real'), 0));
}
