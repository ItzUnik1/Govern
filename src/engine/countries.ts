// Country data. All figures are APPROXIMATE (circa 2024-25) and rounded for gameplay.
// See docs/SIMULATION.md for the documented assumptions. The game starts in January 2026
// in a fictional timeline: you have just taken office.
import type { CountryDef } from './types';
import { X1_COUNTRIES } from './extra1';

export const COUNTRIES: Record<string, CountryDef> = {
  nepal: {
    id: 'nepal', name: 'Nepal', flag: '🇳🇵', title: 'Prime Minister',
    government: 'Federal parliamentary republic',
    constitution:
      'Constitution of 2015. The Prime Minister leads a cabinet answerable to the 275-seat House of Representatives (mixed FPTP + proportional). Seven provinces and 753 local governments share power. Coalitions are the norm and governments are fragile.',
    history:
      'A young republic emerging from a decade of civil war and the abolition of the monarchy (2008). Frequent changes of government, a youth that increasingly looks abroad for work, and a landscape of enormous hydropower potential and earthquake risk.',
    challenges: ['Remittances are ~22% of GDP – a Gulf/Malaysia slump hits you hard', 'Fragile coalitions and low state capacity', 'Weak tax collection and a large informal economy', 'Earthquake and monsoon-flood risk', 'Dependent on India for fuel and trade transit'],
    strengths: ['Hydropower: infrastructure investment pays back ×1.5', 'Fast catch-up growth', 'Low debt', 'Foreign aid and concessional loans'],
    resources: ['Hydropower', 'Tourism', 'Agriculture'],
    devLevel: 'Lower-middle income',
    difficultyStars: 5,
    partyName: 'Your party', opposition: 'Rival coalition blocs',
    relationships: 'India (vital neighbour), China (infrastructure partner), Gulf states and Malaysia (migrant labour), Western aid donors.',
    population: 30, gdp: 43, potentialGrowth: 4.5, popGrowth: 0.9,
    inflationTarget: 5, inflation0: 4.5, unemployment0: 11, naturalUnemployment: 9,
    debtPct0: 43, deficitPct0: 3, rev0: 21,
    tax0: { incomeTax: 15, corpTax: 25, vat: 13 },
    revShare: { incomeTax: 0.22, corpTax: 0.16, vat: 0.30, other: 0.32 },
    spend0: { education: 3.8, health: 1.9, infrastructure: 3.5, defence: 1.1, welfare: 4.0 },
    stock0: { education: 42, health: 38, infrastructure: 30, security: 45, efficiency: 38 },
    policyRate0: 5.5, neutralRate: 6, rateFloor: 1, premium0: 2.5, avgCost0: 3.0, debtTolerance: 0.05,
    openness: 0.35, commodityExports: 0.1, fuelImports: 1.0, remittances: 22, aid: 2.0, disasterRisk: 2.0,
    catchUp: 1.5, infraMult: 1.5, agingDrag: 0,
    approval0: 48, stability0: 45, fragmentation: 0.85, polarisation: 0.5,
    termYears: 5, monthsToElection0: 24, maxTerms: null, turnout: 66, deficitCap: null, reserveCurrency: 0,
  },
  india: {
    id: 'india', name: 'India', flag: '🇮🇳', title: 'Prime Minister',
    government: 'Federal parliamentary republic',
    constitution:
      'Constitution of 1950. The Prime Minister leads the Union cabinet answerable to the 543-seat Lok Sabha (first-past-the-post). Five-year terms. States control a large share of public spending, so the centre cannot simply command policy.',
    history:
      'The world’s most populous democracy, a fast-growing but still lower-middle-income economy. Reforms since 1991 unlocked growth; jobs for a huge young workforce, food prices and fuel imports remain the political pressure points.',
    challenges: ['Huge youth workforce needs jobs', 'Imports ~85% of its oil – fuel spikes hurt', 'Low tax-to-GDP ratio and high general-government deficit', 'Federal tensions with states', 'Monsoon-dependent food prices'],
    strengths: ['Strong growth potential (6%+)', 'Large domestic market', 'Services and technology sector', 'Deep consumer demand'],
    resources: ['Agriculture', 'Services/IT', 'Coal'],
    devLevel: 'Lower-middle income',
    difficultyStars: 4,
    partyName: 'Your party', opposition: 'A fragmented national opposition plus powerful state parties',
    relationships: 'Neighbours Pakistan and China (rivalry), US/EU/Japan (trade and technology), Russia and Gulf (energy).',
    population: 1440, gdp: 3900, potentialGrowth: 6.3, popGrowth: 0.9,
    inflationTarget: 4, inflation0: 4.5, unemployment0: 7.5, naturalUnemployment: 6.5,
    debtPct0: 82, deficitPct0: 7.5, rev0: 19,
    tax0: { incomeTax: 20, corpTax: 25, vat: 18 },
    revShare: { incomeTax: 0.22, corpTax: 0.20, vat: 0.30, other: 0.28 },
    spend0: { education: 4.0, health: 2.0, infrastructure: 4.5, defence: 2.4, welfare: 5.0 },
    stock0: { education: 48, health: 45, infrastructure: 50, security: 60, efficiency: 50 },
    policyRate0: 6.0, neutralRate: 6, rateFloor: 2, premium0: 1.5, avgCost0: 6.5, debtTolerance: 0.25,
    openness: 0.45, commodityExports: 0.0, fuelImports: 0.8, remittances: 3, aid: 0, disasterRisk: 1.5,
    catchUp: 1.3, infraMult: 1.2, agingDrag: 0,
    approval0: 55, stability0: 58, fragmentation: 0.5, polarisation: 0.55,
    termYears: 5, monthsToElection0: 36, maxTerms: null, turnout: 66, deficitCap: null, reserveCurrency: 0,
  },
  uk: {
    id: 'uk', name: 'United Kingdom', flag: '🇬🇧', title: 'Prime Minister',
    government: 'Unitary parliamentary monarchy',
    constitution:
      'Uncodified constitution; Parliament is sovereign. The Prime Minister commands the confidence of the 650-seat House of Commons (first-past-the-post). Elections must be held within five years. A large majority gives great freedom; a small one gives rebellions.',
    history:
      'A services-led economy still adjusting to Brexit, with heavy public debt, stretched public services (especially the NHS) and sharp regional inequality. Voters have been punishing incumbents.',
    challenges: ['Debt ~100% of GDP and rising interest costs', 'NHS and public-service pressure', 'Post-Brexit trade friction', 'Low productivity and weak investment', 'Voters are in an anti-incumbent mood'],
    strengths: ['Finance and services', 'World-class universities', 'Stable institutions', 'Deep bond market'],
    resources: ['Finance', 'North Sea energy', 'Creative industries'],
    devLevel: 'High income',
    difficultyStars: 3,
    partyName: 'Your party', opposition: 'Two main rival parties plus insurgent challengers',
    relationships: 'EU (largest trade partner), US (special relationship), Commonwealth, NATO.',
    population: 69, gdp: 3600, potentialGrowth: 1.3, popGrowth: 0.5,
    inflationTarget: 2, inflation0: 3.4, unemployment0: 4.5, naturalUnemployment: 4.3,
    debtPct0: 101, deficitPct0: 4.5, rev0: 38,
    tax0: { incomeTax: 28, corpTax: 25, vat: 20 },
    revShare: { incomeTax: 0.38, corpTax: 0.10, vat: 0.20, other: 0.32 },
    spend0: { education: 4.5, health: 7.5, infrastructure: 2.8, defence: 2.3, welfare: 12 },
    stock0: { education: 78, health: 72, infrastructure: 68, security: 75, efficiency: 72 },
    policyRate0: 4.25, neutralRate: 3.25, rateFloor: 0.1, premium0: 0.7, avgCost0: 3.4, debtTolerance: 0.5,
    openness: 0.6, commodityExports: 0.1, fuelImports: 0.4, remittances: 0, aid: 0, disasterRisk: 0.3,
    catchUp: 1.0, infraMult: 1.0, agingDrag: 0.2,
    approval0: 38, stability0: 62, fragmentation: 0.3, polarisation: 0.55,
    termYears: 5, monthsToElection0: 30, maxTerms: null, turnout: 67, deficitCap: null, reserveCurrency: 0.4,
  },
  usa: {
    id: 'usa', name: 'United States', flag: '🇺🇸', title: 'President',
    government: 'Federal presidential republic',
    constitution:
      'Constitution of 1787. The President is head of state and government, elected for four years and limited to two terms. Congress (House + Senate) controls taxes and spending, so a divided Congress limits you. Federal and state governments share power.',
    history:
      'The world’s largest economy and issuer of the reserve currency, with a deeply polarised electorate, a very high deficit and the world’s largest military. Voters swing hard against whoever holds the White House.',
    challenges: ['Deep polarisation – approval is volatile', 'Deficit ~7.5% of GDP at full employment', 'Interest bill ~4% of GDP', 'Gridlock: shutdown and debt-ceiling standoffs', 'Strict two-term limit'],
    strengths: ['Reserve currency – cheap borrowing', 'Technology and innovation leader', 'Energy self-sufficiency', 'Deep capital markets'],
    resources: ['Technology', 'Shale oil & gas', 'Agriculture', 'Finance'],
    devLevel: 'High income',
    difficultyStars: 3,
    partyName: 'Your party', opposition: 'The opposing party, which usually controls at least one chamber of Congress',
    relationships: 'NATO and Indo-Pacific allies, China (strategic rival and major trade partner), Canada/Mexico (USMCA).',
    population: 340, gdp: 29000, potentialGrowth: 2.0, popGrowth: 0.5,
    inflationTarget: 2, inflation0: 2.9, unemployment0: 4.2, naturalUnemployment: 4.2,
    debtPct0: 122, deficitPct0: 7.5, rev0: 31,
    tax0: { incomeTax: 24, corpTax: 21, vat: 7 },
    revShare: { incomeTax: 0.50, corpTax: 0.10, vat: 0.12, other: 0.28 },
    spend0: { education: 5.0, health: 8.5, infrastructure: 3.2, defence: 3.4, welfare: 9.5 },
    stock0: { education: 80, health: 66, infrastructure: 70, security: 92, efficiency: 70 },
    policyRate0: 4.25, neutralRate: 3.25, rateFloor: 0.1, premium0: 0.6, avgCost0: 3.3, debtTolerance: 0.8,
    openness: 0.25, commodityExports: 0.3, fuelImports: 0.1, remittances: 0, aid: 0, disasterRisk: 1.0,
    catchUp: 1.0, infraMult: 1.0, agingDrag: 0.2,
    approval0: 43, stability0: 55, fragmentation: 0.15, polarisation: 0.85,
    termYears: 4, monthsToElection0: 36, maxTerms: 2, turnout: 62, deficitCap: null, reserveCurrency: 0.8,
  },
  germany: {
    id: 'germany', name: 'Germany', flag: '🇩🇪', title: 'Chancellor',
    government: 'Federal parliamentary republic',
    constitution:
      'Basic Law of 1949. The Chancellor is elected by the Bundestag (mixed-member proportional) and can only be removed by a constructive vote of no confidence. The constitutional "debt brake" plus EU fiscal rules effectively cap the deficit at ~3% of GDP unless an emergency is declared. Coalitions are always required.',
    history:
      'Europe’s industrial powerhouse, hit by the loss of cheap Russian gas, Chinese competition in cars and machinery, ageing demographics and years of under-investment in infrastructure.',
    challenges: ['Debt brake + EU rules: deficits above ~3% of GDP trigger a constitutional crisis', 'Industry exposed to energy prices and China', 'Rapidly ageing workforce', 'Crumbling infrastructure and slow digitalisation', 'Eurozone: interest rates are set in Frankfurt, not by you'],
    strengths: ['Export machine', 'Low debt and top credit', 'Skilled workforce and apprenticeships', 'Stable politics'],
    resources: ['Manufacturing', 'Engineering', 'Chemicals', 'Renewables'],
    devLevel: 'High income',
    difficultyStars: 2,
    partyName: 'Your party', opposition: 'Opposition parties across the spectrum, including a strong populist right',
    relationships: 'EU partners (France above all), US (security), China (trade), Ukraine support.',
    population: 84, gdp: 4700, potentialGrowth: 0.7, popGrowth: 0.1,
    inflationTarget: 2, inflation0: 2.3, unemployment0: 3.4, naturalUnemployment: 3.3,
    debtPct0: 63, deficitPct0: 2.5, rev0: 47,
    tax0: { incomeTax: 32, corpTax: 30, vat: 19 },
    revShare: { incomeTax: 0.40, corpTax: 0.06, vat: 0.20, other: 0.34 },
    spend0: { education: 4.6, health: 8.5, infrastructure: 2.6, defence: 2.1, welfare: 20 },
    stock0: { education: 82, health: 82, infrastructure: 72, security: 70, efficiency: 80 },
    policyRate0: 2.0, neutralRate: 2.0, rateFloor: 0, premium0: 0.3, avgCost0: 1.4, debtTolerance: 0.8,
    openness: 0.75, commodityExports: 0.0, fuelImports: 0.7, remittances: 0, aid: 0, disasterRisk: 0.3,
    catchUp: 1.0, infraMult: 1.1, agingDrag: 0.4,
    approval0: 40, stability0: 70, fragmentation: 0.55, polarisation: 0.45,
    termYears: 4, monthsToElection0: 30, maxTerms: null, turnout: 76, deficitCap: 3.0, reserveCurrency: 0.5,
  },
  japan: {
    id: 'japan', name: 'Japan', flag: '🇯🇵', title: 'Prime Minister',
    government: 'Unitary parliamentary constitutional monarchy',
    constitution:
      'Constitution of 1947. The Diet chooses the Prime Minister; the 465-seat House of Representatives (mixed system) can be dissolved at any time, with elections at least every four years. One party has dominated for decades, so factions matter more than opposition parties.',
    history:
      'A rich, ageing, shrinking society that spent decades fighting deflation. Public debt is the highest in the developed world but is held almost entirely by Japanese savers. Earthquakes and typhoons are a constant risk.',
    challenges: ['Population shrinking ~0.5% a year', 'Debt ~235% of GDP – interest rate rises are dangerous', 'Chronic low-inflation / deflation tendency', 'Earthquake, tsunami and typhoon risk', 'Social-security costs keep climbing'],
    strengths: ['Very stable politics', 'Deep domestic savings fund the debt', 'Advanced industry and technology', 'High-quality health and education'],
    resources: ['Advanced manufacturing', 'Robotics', 'Electronics', 'Automotive'],
    devLevel: 'High income',
    difficultyStars: 3,
    partyName: 'Your party', opposition: 'A divided opposition, but your own party’s factions are the real threat',
    relationships: 'US (security alliance), China (largest trade partner, rival), South Korea, Taiwan, ASEAN.',
    population: 123, gdp: 4200, potentialGrowth: 0.4, popGrowth: -0.5,
    inflationTarget: 2, inflation0: 2.5, unemployment0: 2.5, naturalUnemployment: 2.5,
    debtPct0: 235, deficitPct0: 3.5, rev0: 37,
    tax0: { incomeTax: 25, corpTax: 30, vat: 10 },
    revShare: { incomeTax: 0.34, corpTax: 0.14, vat: 0.22, other: 0.30 },
    spend0: { education: 3.5, health: 8.0, infrastructure: 3.5, defence: 1.4, welfare: 13 },
    stock0: { education: 84, health: 88, infrastructure: 85, security: 65, efficiency: 78 },
    policyRate0: 0.5, neutralRate: 1.0, rateFloor: -0.1, premium0: 0.4, avgCost0: 0.9, debtTolerance: 0.9,
    openness: 0.4, commodityExports: 0.0, fuelImports: 0.9, remittances: 0, aid: 0, disasterRisk: 2.0,
    catchUp: 1.0, infraMult: 1.0, agingDrag: 0.5,
    approval0: 40, stability0: 72, fragmentation: 0.25, polarisation: 0.2,
    termYears: 4, monthsToElection0: 30, maxTerms: null, turnout: 55, deficitCap: null, reserveCurrency: 0.5,
  },
  canada: {
    id: 'canada', name: 'Canada', flag: '🇨🇦', title: 'Prime Minister',
    government: 'Federal parliamentary constitutional monarchy',
    constitution:
      'Westminster system. The Prime Minister leads the government answerable to the 338-seat House of Commons (first-past-the-post). Terms are fixed at up to four years in practice, but minority governments depend on smaller parties. Provinces control health, education and natural resources.',
    history:
      'A resource-rich, stable, trade-dependent economy tied closely to the US. Housing affordability, immigration levels and provincial/federal tensions (Quebec, Alberta) shape politics.',
    challenges: ['Housing affordability crisis', 'Over-dependence on the US market', 'Immigration-driven growth strains services', 'Provincial/federal tensions', 'Wildfires and climate exposure'],
    strengths: ['Energy and minerals', 'Stable institutions', 'Educated, diverse workforce', 'Solid public finances'],
    resources: ['Oil & gas', 'Minerals', 'Forestry', 'Agriculture'],
    devLevel: 'High income',
    difficultyStars: 2,
    partyName: 'Your party', opposition: 'Main opposition party plus regional and left parties',
    relationships: 'US (dominant trade partner), NATO, Commonwealth, Pacific trade partners.',
    population: 40, gdp: 2200, potentialGrowth: 1.5, popGrowth: 1.0,
    inflationTarget: 2, inflation0: 2.2, unemployment0: 6.7, naturalUnemployment: 6.0,
    debtPct0: 105, deficitPct0: 1.5, rev0: 41,
    tax0: { incomeTax: 27, corpTax: 26, vat: 12 },
    revShare: { incomeTax: 0.38, corpTax: 0.10, vat: 0.14, other: 0.38 },
    spend0: { education: 5.5, health: 8.0, infrastructure: 3.8, defence: 1.4, welfare: 9 },
    stock0: { education: 80, health: 78, infrastructure: 72, security: 60, efficiency: 78 },
    policyRate0: 2.75, neutralRate: 2.5, rateFloor: 0.25, premium0: 0.6, avgCost0: 2.7, debtTolerance: 0.6,
    openness: 0.65, commodityExports: 0.45, fuelImports: 0.1, remittances: 0, aid: 0, disasterRisk: 0.8,
    catchUp: 1.0, infraMult: 1.0, agingDrag: 0.2,
    approval0: 45, stability0: 72, fragmentation: 0.35, polarisation: 0.45,
    termYears: 4, monthsToElection0: 30, maxTerms: null, turnout: 66, deficitCap: null, reserveCurrency: 0.3,
  },
  australia: {
    id: 'australia', name: 'Australia', flag: '🇦🇺', title: 'Prime Minister',
    government: 'Federal parliamentary constitutional monarchy',
    constitution:
      'Westminster-style system with a powerful elected Senate. The Prime Minister leads the party that commands the 151-seat House of Representatives (preferential voting). Voting is compulsory and terms are only three years, so you are always close to an election.',
    history:
      'A wealthy commodity exporter whose fortunes follow iron ore, coal and LNG prices and its trade with China. Housing costs, an ageing population and climate-driven disasters dominate debate.',
    challenges: ['Only three years between elections', 'Boom-bust commodity cycle and dependence on China', 'Housing affordability', 'Bushfire, flood and drought risk', 'Senate can block your agenda'],
    strengths: ['Mining wealth', 'Low debt', 'Compulsory voting reduces volatile turnout', 'Strong institutions'],
    resources: ['Iron ore', 'Coal & LNG', 'Agriculture', 'Education exports'],
    devLevel: 'High income',
    difficultyStars: 2,
    partyName: 'Your party', opposition: 'The main opposition party plus Greens and independents',
    relationships: 'China (largest trade partner), US (AUKUS security), Japan, India, Pacific neighbours.',
    population: 27, gdp: 1800, potentialGrowth: 2.1, popGrowth: 1.4,
    inflationTarget: 2.5, inflation0: 3.0, unemployment0: 4.1, naturalUnemployment: 4.2,
    debtPct0: 50, deficitPct0: 2.0, rev0: 36,
    tax0: { incomeTax: 27, corpTax: 30, vat: 10 },
    revShare: { incomeTax: 0.42, corpTax: 0.16, vat: 0.12, other: 0.30 },
    spend0: { education: 5.0, health: 7.0, infrastructure: 3.0, defence: 2.0, welfare: 10 },
    stock0: { education: 80, health: 82, infrastructure: 72, security: 62, efficiency: 78 },
    policyRate0: 3.85, neutralRate: 3.5, rateFloor: 0.1, premium0: 0.5, avgCost0: 2.8, debtTolerance: 0.6,
    openness: 0.5, commodityExports: 0.6, fuelImports: 0.3, remittances: 0, aid: 0, disasterRisk: 1.2,
    catchUp: 1.0, infraMult: 1.0, agingDrag: 0.2,
    approval0: 45, stability0: 70, fragmentation: 0.3, polarisation: 0.4,
    termYears: 3, monthsToElection0: 24, maxTerms: null, turnout: 90, deficitCap: null, reserveCurrency: 0.3,
  },
};


export const SPEND_LABELS: Record<string, string> = {
  education: 'Education',
  health: 'Healthcare',
  infrastructure: 'Infrastructure & energy',
  defence: 'Defence & security',
  welfare: 'Welfare & pensions',
  administration: 'Administration & public services',
};

export const TAX_LABELS: Record<string, string> = {
  incomeTax: 'Income tax (average rate)',
  corpTax: 'Corporate tax',
  vat: 'VAT / sales tax',
};

/** Administration is whatever is left after the five programme categories, given the starting deficit. */
export function administration0(c: CountryDef): number {
  const interest = (c.debtPct0 * c.avgCost0) / 100;
  const total = c.rev0 + c.deficitPct0 - interest;
  const five = Object.values(c.spend0).reduce((a, b) => a + b, 0);
  return Math.round((total - five) * 10) / 10;
}

// Stage 4 additions
Object.assign(COUNTRIES, X1_COUNTRIES);
export const COUNTRY_LIST: CountryDef[] = Object.values(COUNTRIES);
