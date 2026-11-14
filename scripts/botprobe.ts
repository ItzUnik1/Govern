import { COUNTRY_LIST } from '../src/engine/countries';
import { advanceMonth, newGame, resolveEvent, runAction, fiscal, setTax, setSpend, toggleProgram, debtPct, computeLegacy, DIFFICULTY_PRESETS, getCountry, actionAvailability } from '../src/engine/sim';
import { getEvent, availableChoices } from '../src/engine/events';
import type { GameState } from '../src/engine/types';

function botTurn(s: GameState) {
  const c = getCountry(s);
  const f = fiscal(s);
  const target = c.deficitCap !== null ? Math.min(2.2, c.deficitCap - 0.7) : Math.max(1.5, Math.min(3.2, c.deficitPct0 * 0.6));
  if (f.deficitPct > target + 0.6 && s.tax.vat < c.tax0.vat + 4) setTax(s, 'vat', s.tax.vat + 0.25);
  else if (f.deficitPct > target + 1.5) setSpend(s, 'administration', s.spend.administration * 0.99);
  else if (f.deficitPct < target - 1.2 && s.tax.vat > c.tax0.vat - 1) setTax(s, 'vat', s.tax.vat - 0.25);
  // modest long-term investment once finances allow
  if (f.deficitPct < target && s.spend.education < c.spend0.education * 1.15) setSpend(s, 'education', s.spend.education + 0.02);
  if (f.deficitPct < target && s.spend.infrastructure < c.spend0.infrastructure * 1.2) setSpend(s, 'infrastructure', s.spend.infrastructure + 0.02);
  if (s.inflation > c.inflationTarget + 2.5 && !s.programs.subsidies && c.fuelImports > 0.5) toggleProgram(s, 'subsidies');
  if (s.turn === 1) toggleProgram(s, 'anticorruption');
  if (s.approval < c.approval0 && actionAvailability(s, 'address').ok) runAction(s, 'address');
  if (s.monthsToElection <= 8 && actionAvailability(s, 'campaign').ok) runAction(s, 'campaign');
  if (s.growth < 0 && actionAvailability(s, 'stimulus').ok && s.debt / s.gdp < 1.1) runAction(s, 'stimulus');
}
const N = 30;
console.log('country    survive>=20y  meanYears  legacy  endDebt%  endApproval  winRate/election');
for (const c of COUNTRY_LIST) {
  let ok = 0, yrs = 0, lg = 0, d = 0, a = 0, el = 0, w = 0;
  for (let seed = 1; seed <= N; seed++) {
    let s = newGame(c.id, DIFFICULTY_PRESETS.standard, seed * 31337);
    for (let i = 0; i < 12 * 24 && !s.gameOver; i++) {
      s = structuredClone(s);
      botTurn(s);
      if (s.pendingEvent) { const ch = availableChoices(getEvent(s.pendingEvent as string)!, s, getCountry(s)); resolveEvent(s, 0 % ch.length); }
      s = advanceMonth(s);
      if (s.pendingEvent) { s = structuredClone(s); const ch = availableChoices(getEvent(s.pendingEvent as string)!, s, getCountry(s)); resolveEvent(s, 0); }
      if (s.lastElection) { el++; if (s.lastElection.won) w++; }
    }
    const y = s.turn / 12; yrs += y; if (y >= 20) ok++; lg += computeLegacy(s).total; d += debtPct(s); a += s.approval;
  }
  console.log(c.id.padEnd(10), (100 * ok / N).toFixed(0).padStart(5) + '%', (yrs / N).toFixed(1).padStart(10), (lg / N).toFixed(1).padStart(9), (d / N).toFixed(0).padStart(8), (a / N).toFixed(0).padStart(10), (100 * w / el).toFixed(0).padStart(10) + '%');
}
