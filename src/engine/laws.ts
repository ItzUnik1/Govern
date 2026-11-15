// Bills Parliament can pass, and manifesto promises voters can hold you to. No imports from sim.ts (avoids cycles).
import type { CountryDef, GameState, Modifier, StockKey } from './types';
import { applyAsset } from './economy';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const addMod = (s: GameState, label: string, months: number, e: Partial<Modifier>) => s.modifiers.push({ id: 'law:' + label, label, monthsLeft: months, ...e });
const spend = (s: GameState, k: keyof GameState['spend'], d: number) => { s.spend[k] = Math.round(Math.max(0.1, s.spend[k] + d) * 100) / 100; };
const asset = (s: GameState, k: StockKey, v: number) => applyAsset(s.eco, k, v);

export interface BillDef {
  id: string; name: string; icon: string; desc: string;
  econ: number; social: number; // position: -1 left/liberal .. +1 right/conservative
  popular: number; // general popularity (-1..1), nudges support
  effect: string; // plain-language summary
  enact: (s: GameState, c: CountryDef) => void;
}

export const BILLS: BillDef[] = [
  { id: 'labour', name: 'Labour Market Reform', icon: '👷', desc: 'Make hiring and firing easier and cut red tape for employers.', econ: 0.6, social: 0.1, popular: -0.3, effect: 'Growth and jobs improve over time; approval drops at first.',
    enact: (s) => { addMod(s, 'Labour reform: flexibility', 120, { growth: 0.12, unemployment: -0.3 }); addMod(s, 'Labour reform backlash', 10, { approval: -3 }); } },
  { id: 'minwage', name: 'Minimum Wage Increase', icon: '💵', desc: 'A big rise in the statutory minimum wage.', econ: -0.55, social: -0.1, popular: 0.4, effect: 'Popular with workers; costs some jobs and adds price pressure.',
    enact: (s) => { addMod(s, 'Higher minimum wage', 120, { approval: 1.8, unemployment: 0.2, inflation: 0.1 }); s.eco.gini = Math.max(20, s.eco.gini - 0.8); } },
  { id: 'pension', name: 'Pension Reform', icon: '👴', desc: 'Raise the retirement age and index pensions more slowly.', econ: 0.4, social: 0.2, popular: -0.6, effect: 'Saves welfare money; very unpopular with older voters.',
    enact: (s) => { spend(s, 'welfare', -0.3); addMod(s, 'Pension reform anger', 24, { approval: -3, stability: -1 }); addMod(s, 'Pension savings confidence', 60, { confidence: 2 }); } },
  { id: 'health', name: 'Universal Healthcare Act', icon: '🏥', desc: 'Expand public healthcare coverage and funding.', econ: -0.55, social: -0.2, popular: 0.5, effect: 'Raises health spending and long-run health quality; popular.',
    enact: (s) => { spend(s, 'health', 0.5); asset(s, 'health', 3); addMod(s, 'Healthcare expansion', 60, { approval: 1.5 }); } },
  { id: 'education', name: 'Education Act', icon: '📚', desc: 'Fund teachers, curricula and free tuition.', econ: -0.3, social: -0.2, popular: 0.35, effect: 'More education spending and a lasting quality boost.',
    enact: (s) => { spend(s, 'education', 0.4); asset(s, 'education', 3); } },
  { id: 'taxsimple', name: 'Tax Simplification', icon: '🧾', desc: 'Cut loopholes and simplify the tax code.', econ: 0.3, social: 0, popular: 0.1, effect: 'Better state efficiency and investor confidence; small revenue cost.',
    enact: (s) => { asset(s, 'efficiency', 4); addMod(s, 'Simpler taxes', 120, { confidence: 3, revenuePct: -0.1 }); } },
  { id: 'privatise', name: 'Privatisation Programme', icon: '🏢', desc: 'Sell state enterprises to private owners.', econ: 0.85, social: 0.1, popular: -0.5, effect: 'One-off windfall (≈1.5% of GDP) and efficiency gains; jobs and approval suffer.',
    enact: (s) => { s.debt = Math.max(0, s.debt - 0.015 * s.gdp); asset(s, 'efficiency', 2); addMod(s, 'Privatisation job losses', 24, { approval: -2.5, unemployment: 0.15 }); } },
  { id: 'anticorr', name: 'Anti-Corruption Act', icon: '⚖️', desc: 'An independent anti-graft agency with real powers.', econ: 0, social: -0.1, popular: 0.7, effect: 'Boosts efficiency and stability; popular across the spectrum.',
    enact: (s) => { asset(s, 'efficiency', 6); addMod(s, 'Clean-government dividend', 60, { stability: 3, approval: 1.5, confidence: 2 }); } },
  { id: 'green', name: 'Green Energy Act', icon: '🌱', desc: 'Binding targets and subsidies for clean energy.', econ: -0.3, social: -0.4, popular: 0.15, effect: 'Better infrastructure quality and cheaper energy over time; short-term cost.',
    enact: (s) => { asset(s, 'infrastructure', 2); addMod(s, 'Green investment', 60, { growth: 0.08, inflation: -0.05 }); addMod(s, 'Green transition costs', 18, { growth: -0.1 }); } },
  { id: 'border', name: 'Border & Immigration Control', icon: '🛂', desc: 'Tighter border rules and enforcement.', econ: 0.1, social: 0.75, popular: 0.1, effect: 'Pleases conservatives; slightly slows growth.',
    enact: (s) => { addMod(s, 'Tighter borders', 48, { approval: 1.2, growth: -0.06, stability: 1 }); } },
  { id: 'liberty', name: 'Civil Liberties Act', icon: '🕊️', desc: 'Expand rights and protections for minorities and speech.', econ: -0.1, social: -0.75, popular: 0.05, effect: 'Pleases liberals; polarises conservatives.',
    enact: (s) => { addMod(s, 'Rights expansion', 48, { approval: 1.0, stability: -0.5 }); } },
  { id: 'digital', name: 'Digital Economy Act', icon: '💻', desc: 'Light-touch rules and incentives for tech and start-ups.', econ: 0.3, social: -0.2, popular: 0.2, effect: 'Boosts technology and growth.',
    enact: (s) => { addMod(s, 'Digital economy boost', 120, { growth: 0.1, confidence: 1.5 }); s.eco.sectorBoost.technology = (s.eco.sectorBoost.technology ?? 0) + 0.6; } },
  { id: 'defence', name: 'Defence Modernisation Act', icon: '🛡️', desc: 'Long-term funding for armed-forces modernisation.', econ: 0.3, social: 0.4, popular: 0.1, effect: 'Higher defence spending and security quality.',
    enact: (s) => { spend(s, 'defence', 0.3); asset(s, 'security', 4); } },
  { id: 'fiscalrule', name: 'Fiscal Responsibility Act', icon: '📏', desc: 'Binding rules on deficits and debt.', econ: 0.5, social: 0, popular: 0.1, effect: 'Investor confidence and stability rise; less room to spend.',
    enact: (s) => { addMod(s, 'Fiscal rule credibility', 120, { confidence: 4, stability: 1 }); s.flags.fiscalRule = 1; } },
  { id: 'welfare', name: 'Social Safety Net Act', icon: '🤝', desc: 'Broader unemployment support and child benefits.', econ: -0.65, social: -0.15, popular: 0.45, effect: 'More welfare spending; lower inequality; popular.',
    enact: (s) => { spend(s, 'welfare', 0.5); s.eco.gini = Math.max(20, s.eco.gini - 1.2); addMod(s, 'Safety-net support', 60, { approval: 1.4 }); } },
];
export const getBill = (id: string) => BILLS.find((b) => b.id === id);

// ---------- Manifesto promises ----------
export interface PromiseDef { id: string; label: string; icon: string; desc: string; base: (s: GameState) => Record<string, number>; kept: (s: GameState, c: CountryDef, b: Record<string, number>) => boolean }
const deficit = (s: GameState) => ((s.debt / s.gdp) * 100);
export const PROMISES: PromiseDef[] = [
  { id: 'cutIncome', label: 'Cut income tax', icon: '✂️', desc: 'Lower the top-line income tax by at least 1 point.', base: (s) => ({ v: s.tax.incomeTax }), kept: (s, _c, b) => s.tax.incomeTax <= b.v - 1 },
  { id: 'noNewTax', label: 'No new taxes', icon: '🚫', desc: 'No tax rate may be higher than it is now.', base: (s) => ({ i: s.tax.incomeTax, c: s.tax.corpTax, v: s.tax.vat }), kept: (s, _c, b) => s.tax.incomeTax <= b.i + 0.2 && s.tax.corpTax <= b.c + 0.2 && s.tax.vat <= b.v + 0.2 },
  { id: 'health', label: 'Better healthcare', icon: '🏥', desc: 'Raise health spending by at least 0.4% of GDP.', base: (s) => ({ v: s.spend.health }), kept: (s, _c, b) => s.spend.health >= b.v + 0.4 },
  { id: 'schools', label: 'Invest in schools', icon: '🎓', desc: 'Raise education spending by at least 0.4% of GDP.', base: (s) => ({ v: s.spend.education }), kept: (s, _c, b) => s.spend.education >= b.v + 0.4 },
  { id: 'jobs', label: 'More jobs', icon: '🛠️', desc: 'Cut unemployment by half a point.', base: (s) => ({ v: s.unemployment }), kept: (s, _c, b) => s.unemployment <= b.v - 0.5 },
  { id: 'prices', label: 'Tame inflation', icon: '🛒', desc: 'Keep inflation within 1 point of target.', base: () => ({}), kept: (s, c) => s.inflation <= c.inflationTarget + 1 },
  { id: 'debt', label: 'Reduce debt', icon: '📉', desc: 'Bring debt (% of GDP) below where it is now.', base: (s) => ({ v: deficit(s) }), kept: (s, _c, b) => deficit(s) < b.v - 1 },
  { id: 'build', label: 'Build big', icon: '🏗️', desc: 'Complete at least one national project.', base: (s) => ({ n: s.projects.filter((p) => p.status === 'complete').length }), kept: (s, _c, b) => s.projects.filter((p) => p.status === 'complete').length > b.n },
];
export const getPromise = (id: string) => PROMISES.find((p) => p.id === id);
export const clampN = clamp;
