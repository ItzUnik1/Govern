// Headless simulation tests / balance probe.  Run: npm run test:sim
import { COUNTRY_LIST } from '../src/engine/countries';
import { advanceMonth, newGame, debtPct, fiscal, setSpend, setTax, resolveEvent, DIFFICULTY_PRESETS, computeLegacy } from '../src/engine/sim';
import { getEvent, availableChoices } from '../src/engine/events';
import { getCountry } from '../src/engine/sim';
import type { GameState } from '../src/engine/types';

type Strategy = (s: GameState) => void;
const strategies: Record<string, Strategy> = {
  idle: () => {},
  austerity: (s) => { const c = getCountry(s); setSpend(s, 'administration', s.spend.administration * 0.85); setTax(s, 'vat', c.tax0.vat + 3); },
  bigSpend: (s) => { const c = getCountry(s); setSpend(s, 'education', c.spend0.education * 1.4); setSpend(s, 'health', c.spend0.health * 1.3); setSpend(s, 'infrastructure', c.spend0.infrastructure * 1.5); },
  taxCut: (s) => { const c = getCountry(s); setTax(s, 'incomeTax', c.tax0.incomeTax - 5); setTax(s, 'corpTax', c.tax0.corpTax - 8); },
  invest: (s) => { const c = getCountry(s); setSpend(s, 'education', c.spend0.education * 1.3); setSpend(s, 'infrastructure', c.spend0.infrastructure * 1.4); setTax(s, 'vat', c.tax0.vat + 2); setTax(s, 'incomeTax', c.tax0.incomeTax + 2); },
};

function play(countryId: string, strat: string, years: number, seed: number, verbose = false) {
  let s = newGame(countryId, DIFFICULTY_PRESETS.standard, seed);
  strategies[strat](s);
  let events = 0, elections = 0, wins = 0;
  const months = years * 12;
  for (let i = 0; i < months && !s.gameOver; i++) {
    if (s.pendingEvent) {
      const def = getEvent(s.pendingEvent as string)!;
      const ch = availableChoices(def, s, getCountry(s));
      s = structuredClone(s);
      resolveEvent(s, Math.floor((seed + i) % ch.length));
      events++;
    }
    s = advanceMonth(s);
    if (s.lastElection) { elections++; if (s.lastElection.won) wins++; }
    if (!Number.isFinite(s.gdp) || !Number.isFinite(s.inflation) || !Number.isFinite(s.debt)) throw new Error(`NaN at ${countryId}/${strat}/${seed} month ${i}`);
    if (verbose && i % 12 === 11) console.log(s.y, s.growth.toFixed(1), s.inflation.toFixed(1), s.unemployment.toFixed(1), debtPct(s).toFixed(0), s.approval.toFixed(0), s.stability.toFixed(0));
  }
  return { s, events, elections, wins };
}

const arg = process.argv[2];
if (arg === 'trace') {
  play(process.argv[3] ?? 'uk', process.argv[4] ?? 'idle', 20, 7, true);
  process.exit(0);
}

const pad = (x: string | number, n = 8) => String(x).padEnd(n);
console.log(pad('country', 10), pad('strat', 10), pad('yrs', 5), pad('growth'), pad('infl'), pad('unemp'), pad('debt%'), pad('appr'), pad('stab'), pad('def%'), pad('evts'), pad('legacy'));
for (const c of COUNTRY_LIST) {
  for (const st of Object.keys(strategies)) {
    const agg = { g: 0, i: 0, u: 0, d: 0, a: 0, st: 0, df: 0, ev: 0, yrs: 0, lg: 0 };
    const N = 6;
    for (let seed = 1; seed <= N; seed++) {
      const r = play(c.id, st, 20, seed * 101);
      agg.g += r.s.growth; agg.i += r.s.inflation; agg.u += r.s.unemployment; agg.d += debtPct(r.s); agg.a += r.s.approval; agg.st += r.s.stability;
      agg.df += fiscal(r.s).deficitPct; agg.ev += r.events; agg.yrs += (r.s.turn / 12); agg.lg += computeLegacy(r.s).total;
    }
    const f = (x: number, d = 1) => (x / N).toFixed(d);
    console.log(pad(c.id, 10), pad(st, 10), pad(f(agg.yrs, 0), 5), pad(f(agg.g)), pad(f(agg.i)), pad(f(agg.u)), pad(f(agg.d, 0)), pad(f(agg.a, 0)), pad(f(agg.st, 0)), pad(f(agg.df)), pad(f(agg.ev, 0)), pad(f(agg.lg)));
  }
}
