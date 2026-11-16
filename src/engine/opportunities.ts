// Surprise opportunities: good luck that still has to be planned for and paid for.
// Each one can be seized in full (costly, slot-using, risky), taken cheaply, or wasted.
import type { EventDef } from './events';

const res = (c: { resources: string[] }, re: RegExp) => c.resources.some((r) => re.test(r));
const debtPct = (s: { debt: number; gdp: number }) => (s.debt / s.gdp) * 100;

export const OPPORTUNITY_EVENTS: EventDef[] = [
  {
    id: 'gasFind', title: 'Major gas field discovered', icon: '🛢️', category: 'Opportunity', cooldown: 120,
    weight: (s, c) => (s.pol.inGovernment ? (res(c, /oil|gas|LNG|coal|shale|mineral|iron/i) ? 0.45 : 0.08) : 0),
    text: () => 'Surveyors confirm a large offshore gas field. It could transform the budget, but developing it takes years, billions and a plan for the windfall.',
    choices: [
      { label: 'State-led development', hint: 'Costs ~2% of GDP over 4 years; big revenue later, currency pressure', run: (fx) => { fx.project({ key: 'gasfield', name: 'National gas field', icon: '🛢️', desc: 'State-owned extraction and a processing terminal.', months: 48, foreign: false, costPct: 2, maintenance: 0.05, asset: { infrastructure: 1 }, mod: { growth: 0.18, revenuePct: 0.35, confidence: 1 }, exportBoost: 1, sector: { energy: 1 } }); fx.currency(3); fx.mod('Resource-currency squeeze', 36, { growth: -0.08 }); fx.approval(2); return 'Drilling contracts are signed. Exporters feel the stronger currency; the treasury waits for the gas.'; } },
      { label: 'Licence to foreign majors', hint: 'No cost, smaller revenue share, tougher politics', run: (fx) => { fx.project({ key: 'gasfield', name: 'Foreign-run gas field', icon: '🛢️', desc: 'An international consortium develops the field under licence.', months: 40, foreign: true, mod: { growth: 0.1, revenuePct: 0.12, confidence: 1.5 }, exportBoost: 0.7, sector: { energy: 0.7 } }); fx.stability(-1); fx.approval(-0.5); return 'Critics say the country sold too cheaply, but work starts quickly and at no cost to the budget.'; } },
      { label: 'Develop slowly and save', hint: 'Small start, 1% of GDP; keeps the economy balanced', run: (fx) => { fx.cost(0.2); fx.mod('Resource reserve fund', 60, { revenuePct: 0.08, confidence: 1 }); fx.approval(0.5); return 'A modest first phase begins, with proceeds earmarked for a savings fund.'; } },
      { label: 'Leave it in the ground', hint: 'Green votes and calm markets; the chance is wasted', run: (fx) => { fx.approval(1); fx.stability(1); fx.mod('Missed windfall', 24, { growth: -0.04 }); return 'Environmentalists cheer. Industry groans.'; } },
    ],
  },
  {
    id: 'tourismSurge', title: 'Tourism takes off', icon: '🧳', category: 'Opportunity', cooldown: 60,
    weight: (s, c) => (s.pol.inGovernment ? (res(c, /tourism/i) ? 0.55 : 0.12) : 0),
    text: () => 'A viral campaign and a new airline route have visitors flooding in. Hotels are full, but roads, airports and staff are stretched.',
    choices: [
      { label: 'Invest in airports and resorts', hint: 'Costs ~1.5% of GDP; lasting boost', run: (fx) => { fx.project({ key: 'tourpush', name: 'Tourism capacity drive', icon: '🏝️', desc: 'Airport upgrades, hotel zones and visitor transport.', months: 30, foreign: false, costPct: 1.5, maintenance: 0.05, asset: { infrastructure: 2 }, mod: { growth: 0.1, unemployment: -0.1, approval: 0.5 }, sector: { tourism: 1, construction: 0.3 }, exportBoost: 0.3 }); fx.approval(1); return 'Cranes go up; the industry promises jobs.'; } },
      { label: 'Let the market run', hint: 'A quick, uneven boost; risk of overcrowding', run: (fx) => { fx.mod('Tourism wave', 18, { growth: 0.12, unemployment: -0.1 }); fx.mod('Overcrowding backlash', 24, { approval: -0.6 }); fx.inflation(0.2); return 'Money flows in, so do complaints about prices.'; } },
      { label: 'Tax the visitors', hint: 'Revenue now, slows the boom', run: (fx) => { fx.mod('Tourist levy', 24, { revenuePct: 0.1, growth: 0.04 }); fx.approval(0.5); return 'A visitor levy brings steady income.'; } },
    ],
  },
  {
    id: 'bumperHarvest', title: 'Bumper harvest', icon: '🌾', category: 'Opportunity', cooldown: 48,
    weight: (s, c) => (s.pol.inGovernment ? (res(c, /agri/i) ? 0.5 : 0.1) : 0),
    text: () => 'Perfect weather has produced a record crop. Prices at the farm gate are tumbling.',
    choices: [
      { label: 'Build grain reserves', hint: 'Costs ~0.4% of GDP; buffers future shortages', run: (fx) => { fx.cost(0.4); fx.mod('Food buffer', 36, { inflation: -0.2, stability: 0.5 }); fx.approval(1); return 'Silos fill; farmers keep fair prices and families keep cheap bread.'; } },
      { label: 'Push exports', hint: 'Trade and currency gain; local prices rise', run: (fx) => { fx.mod('Export harvest', 12, { growth: 0.15 }); fx.currency(1.5); fx.inflation(0.3); return 'Foreign buyers snap up the crop; supermarket prices edge up.'; } },
      { label: 'Support farm incomes', hint: 'Cost ~0.25% of GDP; farmers loyal', run: (fx) => { fx.cost(0.25); fx.approval(1.5); fx.stability(0.5); return 'Farm groups praise you.'; } },
    ],
  },
  {
    id: 'breakthrough', title: 'Scientific breakthrough', icon: '🔬', category: 'Opportunity', cooldown: 72,
    weight: (s) => (s.pol.inGovernment && s.stocks.education > 35 ? 0.3 : 0),
    text: () => 'A national university lab announces a breakthrough with real commercial promise. Investors are circling and so are foreign buyers.',
    choices: [
      { label: 'Back a commercialisation fund', hint: 'Costs ~0.8% of GDP over 3 years; domestic industry', run: (fx) => { fx.project({ key: 'commerc', name: 'Commercialisation fund & pilot plants', icon: '🧪', desc: 'Public money to turn the discovery into a new industry.', months: 36, foreign: false, costPct: 0.8, maintenance: 0.02, asset: { education: 1 }, mod: { growth: 0.12, confidence: 1.5 }, sector: { technology: 0.9, manufacturing: 0.2 } }); fx.approval(1); return 'The lab spins out a company with state backing.'; } },
      { label: 'Sell the licence abroad', hint: 'Cash windfall of 0.2% of GDP now; the upside goes elsewhere', run: (fx) => { fx.cost(-0.2); fx.approval(0.5); return 'The treasury cashes in; some call it a giveaway.'; } },
      { label: 'Let the university keep it', hint: 'Small gain, no cost', run: (fx) => { fx.mod('Research prestige', 24, { confidence: 1 }); return 'The lab celebrates its independence.'; } },
    ],
  },
  {
    id: 'globalEvent', title: 'Invitation to host a global event', icon: '🏟️', category: 'Opportunity', cooldown: 150,
    weight: (s) => (s.pol.inGovernment && s.confidence > 45 ? 0.12 : 0),
    text: () => 'The country is invited to bid for a major global sporting and cultural event. Prestige, tourists and jobs are on offer, but cost overruns are legendary.',
    choices: [
      { label: 'Bid ambitiously', hint: 'Costs ~2% of GDP, long build; may overrun', run: (fx) => { const over = fx.rnd() < 0.4; fx.project({ key: 'globalevent', name: 'Global event venues', icon: '🏟️', desc: 'Stadiums, transport and a showcase district.', months: 48, foreign: false, costPct: over ? 2.8 : 2, maintenance: 0.08, asset: { infrastructure: 2 }, mod: { growth: 0.1, approval: 1, confidence: 1.5 }, sector: { tourism: 0.8, construction: 0.6 }, exportBoost: 0.2 }); fx.approval(2); return over ? 'You win the bid, but planners warn the budget is already slipping.' : 'You win the bid and the project starts on budget.'; } },
      { label: 'Bid with a lean plan', hint: 'Costs ~0.9% of GDP; less prestige', run: (fx) => { fx.project({ key: 'globalevent', name: 'Compact global event', icon: '🏟️', desc: 'Existing venues and temporary structures.', months: 36, foreign: false, costPct: 0.9, maintenance: 0.03, mod: { growth: 0.05, approval: 0.5 }, sector: { tourism: 0.5 } }); fx.approval(1); return 'A modest bid succeeds.'; } },
      { label: 'Decline politely', hint: 'No cost; some will call it timid', run: (fx) => { fx.approval(-0.5); return 'The invitation goes to a rival.'; } },
    ],
  },
  {
    id: 'creditUpgrade', title: 'Credit rating upgrade', icon: '📈', category: 'Opportunity', cooldown: 60,
    weight: (s, c) => (s.pol.inGovernment && debtPct(s) < c.debtPct0 + 5 && s.growth > 1.5 && s.confidence > 50 ? 0.45 : 0),
    text: () => 'Rating agencies upgrade the country, citing steady policy. Borrowing just got cheaper and investors are listening.',
    choices: [
      { label: 'Refinance and lock in low rates', hint: 'Saves interest for years', run: (fx) => { fx.mod('Cheaper debt', 48, { revenuePct: 0.12, confidence: 1 }); fx.approval(0.5); return 'Treasury swaps expensive debt for cheaper bonds.'; } },
      { label: 'Spend the dividend on services', hint: 'Cost ~0.3% of GDP; popular', run: (fx) => { fx.cost(0.3); fx.approval(2.5); return 'Hospitals and schools get a bonus.'; } },
      { label: 'Build a rainy-day buffer', hint: 'Dull but wise', run: (fx) => { fx.mod('Fiscal buffer', 60, { confidence: 2, stability: 0.5 }); return 'Markets applaud the prudence.'; } },
    ],
  },
  {
    id: 'diasporaBoom', title: 'Remittances surge', icon: '💸', category: 'Opportunity', cooldown: 60,
    weight: (s, c) => (s.pol.inGovernment && ['nepal', 'india', 'pakistan', 'bangladesh'].includes(c.id) ? 0.5 : 0),
    text: () => 'Workers abroad are sending record sums home. Families are spending more, but much of it flows into land and imports.',
    choices: [
      { label: 'Diaspora development bonds', hint: 'Cost ~0.3% of GDP to set up; channels money into infrastructure', run: (fx) => { fx.cost(0.3); fx.mod('Diaspora investment', 36, { growth: 0.12, confidence: 1.5 }); fx.approval(1); return 'Expat savings fund roads and power lines.'; } },
      { label: 'Small-business credit scheme', hint: 'Cost ~0.2% of GDP; jobs', run: (fx) => { fx.cost(0.2); fx.mod('Micro-enterprise boom', 24, { unemployment: -0.15, growth: 0.06 }); fx.approval(1); return 'Households start businesses with the new capital.'; } },
      { label: 'Let it flow', hint: 'Spending boom; imports and property prices rise', run: (fx) => { fx.mod('Consumption boom', 12, { growth: 0.15, inflation: 0.15 }); fx.currency(2); return 'The shops are full; so is the property market.'; } },
    ],
  },
  {
    id: 'tradeWindow', title: 'Preferential market access offered', icon: '🚢', category: 'Opportunity', cooldown: 60,
    weight: (s) => (s.pol.inGovernment && s.dip && Object.values(s.dip.nations).some((n) => n.rel > 62 && n.trade < 2) ? 0.35 : 0),
    text: () => 'A major partner offers preferential access for your exporters in return for opening parts of your own market.',
    choices: [
      { label: 'Accept in full', hint: 'Exports jump; some local firms suffer', run: (fx) => { fx.mod('Market access', 36, { growth: 0.14 }); fx.mod('Import competition', 18, { unemployment: 0.1, approval: -0.5 }); fx.s.eco.fdiPct += 0.1; return 'Exporters celebrate; protected industries lobby hard.'; } },
      { label: 'Negotiate a phased deal', hint: 'Smaller gain, softer landing', run: (fx) => { fx.mod('Phased market access', 36, { growth: 0.07 }); fx.confidence(1); return 'A careful deal is signed.'; } },
      { label: 'Decline', hint: 'Domestic industry is safe; the chance passes', run: (fx) => { fx.approval(0.5); fx.confidence(-0.5); return 'Producers are relieved; exporters are not.'; } },
    ],
  },
];
