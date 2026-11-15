// Stage 4, batch 1: France, Italy, Pakistan, Bangladesh, South Africa, New Zealand.
// All figures are APPROXIMATE (circa 2024-25), rounded for gameplay; see docs/SIMULATION.md.
// Parties are real; positions, vote shares and all leaders are in-game approximations.
import type { CountryDef } from './types';
import type { EcoDef } from './econdata';
import type { SystemDef, BlocId } from './parties';
import type { Org } from './diplomacy';

const dev: Record<BlocId, number> = { youth: 0.24, workers: 0.22, middle: 0.10, business: 0.06, rural: 0.30, seniors: 0.08 };
const mid: Record<BlocId, number> = { youth: 0.20, workers: 0.24, middle: 0.18, business: 0.08, rural: 0.20, seniors: 0.10 };
const rich: Record<BlocId, number> = { youth: 0.15, workers: 0.22, middle: 0.26, business: 0.10, rural: 0.10, seniors: 0.17 };

export const X1_COUNTRIES: Record<string, CountryDef> = {
  france: {
    id: 'france', name: 'France', flag: '🇫🇷', title: 'Prime Minister',
    government: 'Semi-presidential republic',
    constitution:
      'Fifth Republic (1958). A directly elected President sets the tone, but the Prime Minister runs the government and needs a working majority in the 577-seat National Assembly, elected in two rounds by constituency. Governments can fall to a motion of censure, and hung parliaments have made that common.',
    history:
      'A rich, centralised state with a generous welfare model and a famously combative street politics. Budget deficits are among the highest in the eurozone, pensions and taxes are the great fault lines, and the far right and far left have both grown at the centre’s expense.',
    challenges: ['Deficit above 5% of GDP and debt above 110%: bond markets are watching', 'A hung Assembly makes every budget a crisis', 'Pension and tax reform trigger strikes and protests', 'Eurozone: interest rates are set in Frankfurt', 'Strong far-right and far-left oppositions'],
    strengths: ['Large, diversified economy', 'Strong public services and infrastructure', 'Nuclear power and aerospace', 'Powerful EU influence'],
    resources: ['Nuclear energy', 'Aerospace', 'Luxury goods', 'Agriculture', 'Tourism'],
    devLevel: 'High income',
    difficultyStars: 4,
    partyName: 'Your party', opposition: 'A far right and a far left that both refuse to cooperate',
    relationships: 'Germany (the EU partnership), the US (NATO), Africa (historic ties), China and the Gulf (trade and investment).',
    population: 68, gdp: 3200, potentialGrowth: 1.0, popGrowth: 0.2,
    inflationTarget: 2, inflation0: 1.8, unemployment0: 7.5, naturalUnemployment: 7.0,
    debtPct0: 114, deficitPct0: 5.4, rev0: 52,
    tax0: { incomeTax: 30, corpTax: 25, vat: 20 },
    revShare: { incomeTax: 0.24, corpTax: 0.05, vat: 0.16, other: 0.55 },
    spend0: { education: 5.2, health: 9.0, infrastructure: 2.5, defence: 2.1, welfare: 24 },
    stock0: { education: 76, health: 82, infrastructure: 78, security: 70, efficiency: 68 },
    policyRate0: 2.0, neutralRate: 2.0, rateFloor: 0, premium0: 0.7, avgCost0: 2.0, debtTolerance: 0.45,
    openness: 0.6, commodityExports: 0.0, fuelImports: 0.5, remittances: 0, aid: 0, disasterRisk: 0.4,
    catchUp: 1.0, infraMult: 1.0, agingDrag: 0.4,
    approval0: 36, stability0: 50, fragmentation: 0.75, polarisation: 0.7,
    termYears: 5, monthsToElection0: 24, maxTerms: null, turnout: 66, deficitCap: null, reserveCurrency: 0.2,
  },
  italy: {
    id: 'italy', name: 'Italy', flag: '🇮🇹', title: 'Prime Minister',
    government: 'Parliamentary republic',
    constitution:
      'Constitution of 1948. The Prime Minister (President of the Council) needs the confidence of both chambers; the 400-seat Chamber of Deputies is elected by a mixed system of constituencies and proportional lists. The head of state has real influence in picking governments, and Italy has had dozens of governments since 1946.',
    history:
      'A wealthy manufacturing country with near-zero growth for two decades, a huge public debt, an ageing population and a deep north–south divide. Governments are famously short-lived, though recent coalitions have lasted longer.',
    challenges: ['Debt above 130% of GDP: any rise in borrowing costs hurts badly', 'Stagnant productivity and a shrinking workforce', 'North–south economic divide', 'A history of short-lived governments', 'Eurozone: interest rates are set in Frankfurt'],
    strengths: ['Strong manufacturing and export niches', 'Tourism and cultural heritage', 'High household savings', 'Stable bond demand while reforms continue'],
    resources: ['Manufacturing', 'Tourism', 'Fashion & food', 'Agriculture'],
    devLevel: 'High income',
    difficultyStars: 4,
    partyName: 'Your party', opposition: 'A fractured opposition of centre-left, populists and the right',
    relationships: 'The EU (Brussels and Frankfurt), the US (NATO), Mediterranean and Libyan energy partners, China (trade).',
    population: 59, gdp: 2300, potentialGrowth: 0.5, popGrowth: -0.2,
    inflationTarget: 2, inflation0: 1.6, unemployment0: 6.2, naturalUnemployment: 6.5,
    debtPct0: 136, deficitPct0: 3.4, rev0: 48,
    tax0: { incomeTax: 33, corpTax: 24, vat: 22 },
    revShare: { incomeTax: 0.26, corpTax: 0.04, vat: 0.15, other: 0.55 },
    spend0: { education: 4.1, health: 6.2, infrastructure: 2.3, defence: 1.6, welfare: 25 },
    stock0: { education: 70, health: 80, infrastructure: 66, security: 65, efficiency: 58 },
    policyRate0: 2.0, neutralRate: 2.0, rateFloor: 0, premium0: 1.3, avgCost0: 2.6, debtTolerance: 0.2,
    openness: 0.55, commodityExports: 0.0, fuelImports: 0.7, remittances: 0, aid: 0, disasterRisk: 0.5,
    catchUp: 1.0, infraMult: 1.0, agingDrag: 0.7,
    approval0: 42, stability0: 55, fragmentation: 0.7, polarisation: 0.5,
    termYears: 5, monthsToElection0: 30, maxTerms: null, turnout: 64, deficitCap: null, reserveCurrency: 0.2,
  },
  pakistan: {
    id: 'pakistan', name: 'Pakistan', flag: '🇵🇰', title: 'Prime Minister',
    government: 'Federal parliamentary republic',
    constitution:
      'Constitution of 1973. The Prime Minister leads a cabinet answerable to the 336-seat National Assembly (mostly first-past-the-post). Four provinces hold real power, the army and courts are major political actors, and elected governments have rarely finished a full term.',
    history:
      'A nuclear-armed country of nearly 250 million people with a young population, recurring balance-of-payments crises, IMF programmes, devastating floods and a tense relationship with India. Military and civilian power have long been entangled.',
    challenges: ['Chronic balance-of-payments crises; IMF conditions shape your budget', 'Tax revenue is only ~10-12% of GDP and interest eats most of it', 'Powerful army and courts limit civilian authority', 'Floods and heat waves', 'Hostile border with India and instability on the Afghan frontier'],
    strengths: ['Huge young workforce', 'Remittances from the Gulf and the West', 'Chinese investment through the economic corridor', 'Large domestic market and agriculture'],
    resources: ['Agriculture', 'Textiles', 'Remittances', 'Gas & coal'],
    devLevel: 'Lower-middle income',
    difficultyStars: 5,
    partyName: 'Your party', opposition: 'Powerful rival parties and a popular protest movement',
    relationships: 'China (CPEC investment and arms), Gulf states (oil and migrant workers), the US (aid and security), India (rivalry).',
    population: 245, gdp: 375, potentialGrowth: 3.5, popGrowth: 2.0,
    inflationTarget: 6, inflation0: 6.0, unemployment0: 8, naturalUnemployment: 7,
    debtPct0: 70, deficitPct0: 5.5, rev0: 14,
    tax0: { incomeTax: 15, corpTax: 29, vat: 18 },
    revShare: { incomeTax: 0.15, corpTax: 0.18, vat: 0.33, other: 0.34 },
    spend0: { education: 1.7, health: 1.0, infrastructure: 2.0, defence: 2.2, welfare: 2.5 },
    stock0: { education: 32, health: 33, infrastructure: 38, security: 45, efficiency: 33 },
    policyRate0: 11, neutralRate: 9, rateFloor: 2, premium0: 5.0, avgCost0: 8.0, debtTolerance: 0.02,
    openness: 0.25, commodityExports: 0.05, fuelImports: 1.4, remittances: 8, aid: 1.0, disasterRisk: 2.0,
    catchUp: 1.2, infraMult: 1.3, agingDrag: 0,
    approval0: 40, stability0: 35, fragmentation: 0.7, polarisation: 0.8,
    termYears: 5, monthsToElection0: 30, maxTerms: null, turnout: 48, deficitCap: null, reserveCurrency: 0,
  },
  bangladesh: {
    id: 'bangladesh', name: 'Bangladesh', flag: '🇧🇩', title: 'Prime Minister',
    government: 'Unitary parliamentary republic',
    constitution:
      'Constitution of 1972. The Prime Minister leads a cabinet answerable to the 300-seat Jatiya Sangsad, elected by first-past-the-post. Elections have been bitterly contested, and politics since the 2024 uprising is in a fragile reset with new parties and unsettled rules.',
    history:
      'One of the world’s most densely populated countries, a garment-export success story with fast growth and big gains in health and girls’ education, now squeezed by inflation, weak banks, a dollar shortage and political turmoil.',
    challenges: ['Garments are over 80% of exports', 'Very low tax collection and fragile banks', 'Inflation and dollar shortages', 'Cyclones, floods and sea-level rise', 'Deeply polarised, unsettled party politics'],
    strengths: ['Fast catch-up growth', 'Large garment industry', 'Remittances', 'Strong gains in health and schooling'],
    resources: ['Garments', 'Agriculture', 'Natural gas', 'Remittances'],
    devLevel: 'Lower-middle income',
    difficultyStars: 5,
    partyName: 'Your party', opposition: 'Bitterly polarised rival parties and new protest-born movements',
    relationships: 'India (vital neighbour), China (infrastructure), the EU and US (garment markets), Japan (development finance), Gulf states (migrant labour).',
    population: 174, gdp: 450, potentialGrowth: 5.0, popGrowth: 1.1,
    inflationTarget: 6.5, inflation0: 8.5, unemployment0: 5, naturalUnemployment: 4.5,
    debtPct0: 40, deficitPct0: 4, rev0: 10,
    tax0: { incomeTax: 15, corpTax: 25, vat: 15 },
    revShare: { incomeTax: 0.22, corpTax: 0.20, vat: 0.38, other: 0.20 },
    spend0: { education: 1.8, health: 0.9, infrastructure: 3.0, defence: 1.2, welfare: 2.2 },
    stock0: { education: 38, health: 36, infrastructure: 38, security: 42, efficiency: 36 },
    policyRate0: 10, neutralRate: 7, rateFloor: 2, premium0: 3.5, avgCost0: 4.5, debtTolerance: 0.03,
    openness: 0.3, commodityExports: 0.0, fuelImports: 1.1, remittances: 6, aid: 1.5, disasterRisk: 2.0,
    catchUp: 1.6, infraMult: 1.4, agingDrag: 0,
    approval0: 45, stability0: 38, fragmentation: 0.55, polarisation: 0.85,
    termYears: 5, monthsToElection0: 18, maxTerms: null, turnout: 70, deficitCap: null, reserveCurrency: 0,
  },
  southafrica: {
    id: 'southafrica', name: 'South Africa', flag: '🇿🇦', title: 'President',
    government: 'Parliamentary republic (President elected by parliament)',
    constitution:
      'Constitution of 1996. The 400-seat National Assembly is elected by proportional representation, and it elects the President, who is both head of state and head of government and who must keep the Assembly’s confidence. Since 2024 no party has a majority, so a coalition “Government of National Unity” is the norm.',
    history:
      'Africa’s most industrialised economy, thirty years after apartheid. The long dominance of the ANC has ended. Unemployment around a third of the workforce, rolling power cuts, failing rail and ports, crime and deep inequality dominate politics.',
    challenges: ['Unemployment near 30% and among the world’s highest inequality', 'Power cuts and failing rail and ports', 'Coalition politics with ideological opponents', 'Corruption scandals and weak state capacity', 'Very high borrowing costs'],
    strengths: ['Most advanced economy in Africa', 'Rich mineral resources', 'Strong institutions and courts', 'Deep financial markets'],
    resources: ['Gold & platinum', 'Coal', 'Manufacturing', 'Agriculture', 'Tourism'],
    devLevel: 'Upper-middle income',
    difficultyStars: 5,
    partyName: 'Your party', opposition: 'Rival parties from left populists to liberals',
    relationships: 'BRICS partners (China, India, Brazil, Russia), the EU and US (trade), the UK (history), African neighbours.',
    population: 64, gdp: 400, potentialGrowth: 1.8, popGrowth: 1.0,
    inflationTarget: 4.5, inflation0: 3.2, unemployment0: 32, naturalUnemployment: 28,
    debtPct0: 76, deficitPct0: 4.8, rev0: 27,
    tax0: { incomeTax: 26, corpTax: 27, vat: 15 },
    revShare: { incomeTax: 0.38, corpTax: 0.18, vat: 0.25, other: 0.19 },
    spend0: { education: 6.0, health: 4.5, infrastructure: 3.0, defence: 0.9, welfare: 8 },
    stock0: { education: 50, health: 48, infrastructure: 52, security: 42, efficiency: 42 },
    policyRate0: 7.25, neutralRate: 7, rateFloor: 2, premium0: 3.0, avgCost0: 6.8, debtTolerance: 0.06,
    openness: 0.6, commodityExports: 0.35, fuelImports: 0.5, remittances: 0, aid: 0.2, disasterRisk: 0.8,
    catchUp: 1.2, infraMult: 1.3, agingDrag: 0,
    approval0: 45, stability0: 48, fragmentation: 0.8, polarisation: 0.6,
    termYears: 5, monthsToElection0: 30, maxTerms: null, turnout: 58, deficitCap: null, reserveCurrency: 0,
  },
  newzealand: {
    id: 'newzealand', name: 'New Zealand', flag: '🇳🇿', title: 'Prime Minister',
    government: 'Unitary parliamentary monarchy',
    constitution:
      'Uncodified constitution. The Prime Minister leads a cabinet answerable to the single-chamber 120-seat House of Representatives, elected by proportional representation (MMP, 5% threshold). Three-year terms mean the campaign never really stops, and coalitions or support deals are normal.',
    history:
      'A small, open, trade-dependent country at the edge of the world: dairy, meat, tourism and education exports, a high cost of living, housing pressure and a steady drain of young people to Australia.',
    challenges: ['Three-year terms: little time for long-term reform', 'Housing costs and weak productivity', 'Exposed to dairy prices and Chinese demand', 'Earthquake and storm risk', 'Young people leaving for Australia'],
    strengths: ['Stable, low-corruption institutions', 'Strong export brands', 'Flexible labour market', 'Low government debt'],
    resources: ['Dairy & meat', 'Tourism', 'Education exports', 'Forestry'],
    devLevel: 'High income',
    difficultyStars: 2,
    partyName: 'Your party', opposition: 'A competitive centre-left or centre-right opposition',
    relationships: 'Australia (closest partner), China (largest trade partner), the US and UK, Pacific neighbours.',
    population: 5.3, gdp: 250, potentialGrowth: 2.0, popGrowth: 0.8,
    inflationTarget: 2, inflation0: 2.7, unemployment0: 5.0, naturalUnemployment: 4.4,
    debtPct0: 44, deficitPct0: 3.5, rev0: 31,
    tax0: { incomeTax: 33, corpTax: 28, vat: 15 },
    revShare: { incomeTax: 0.45, corpTax: 0.12, vat: 0.25, other: 0.18 },
    spend0: { education: 5.5, health: 7.0, infrastructure: 3.0, defence: 1.2, welfare: 9 },
    stock0: { education: 80, health: 78, infrastructure: 68, security: 65, efficiency: 82 },
    policyRate0: 3.5, neutralRate: 3.0, rateFloor: 0.25, premium0: 0.5, avgCost0: 3.5, debtTolerance: 0.5,
    openness: 0.55, commodityExports: 0.35, fuelImports: 0.8, remittances: 0, aid: 0, disasterRisk: 1.2,
    catchUp: 1.0, infraMult: 1.1, agingDrag: 0.3,
    approval0: 40, stability0: 74, fragmentation: 0.5, polarisation: 0.4,
    termYears: 3, monthsToElection0: 24, maxTerms: null, turnout: 78, deficitCap: null, reserveCurrency: 0,
  },
};

export const X1_ECO: Record<string, EcoDef> = {
  france: { exports: 33, imports: 34, ca0: -1.0, fdi0: 1.5, reservesMonths: 2, gini0: 32, sectors: [2, 10, 6, 6, 2, 6] },
  italy: { exports: 33, imports: 30, ca0: 1.0, fdi0: 1.0, reservesMonths: 3, gini0: 33, sectors: [2, 15, 6, 4, 2, 5] },
  pakistan: { exports: 10, imports: 17, ca0: -0.5, fdi0: 0.4, reservesMonths: 3, gini0: 30, sectors: [23, 12, 1, 2, 3, 3] },
  bangladesh: { exports: 12, imports: 15, ca0: -1.0, fdi0: 0.5, reservesMonths: 4, gini0: 34, sectors: [11, 22, 1, 2, 2, 8] },
  southafrica: { exports: 30, imports: 28, ca0: -1.5, fdi0: 1.2, reservesMonths: 5, gini0: 63, sectors: [3, 12, 3, 3, 8, 4] },
  newzealand: { exports: 27, imports: 27, ca0: -4.0, fdi0: 2.5, reservesMonths: 4, gini0: 32, sectors: [6, 8, 5, 5, 2, 6] },
};

const names = (first: string[], last: string[]) => ({ first, last });

export const X1_SYSTEMS: Record<string, SystemDef> = {
  france: {
    countryId: 'france', chamber: 'National Assembly', seats: 577, kind: 'fptp', threshold: 0, presidential: false,
    electionNote: '577 single-member constituencies decided in two rounds. Far-right candidates are often blocked by tactical voting in the second round.',
    blocs: { ...rich, workers: 0.24, rural: 0.14, middle: 0.22, seniors: 0.20, youth: 0.12, business: 0.08 }, leadable: ['fr_ren', 'fr_ps', 'fr_lr'],
    names: names(['Jean', 'Marie', 'Pierre', 'Camille', 'Julien', 'Claire', 'Antoine', 'Élodie', 'Nicolas', 'Léa'], ['Martin', 'Bernard', 'Dubois', 'Laurent', 'Moreau', 'Lefèvre', 'Girard', 'Roux', 'Fontaine', 'Mercier']),
    regions: [
      { id: 'paris', name: 'Paris & Île-de-France', seatShare: 0.19, urban: 0.95, cons: 0.3 },
      { id: 'north', name: 'North & East', seatShare: 0.20, urban: 0.5, cons: 0.62 },
      { id: 'west', name: 'West & Brittany', seatShare: 0.15, urban: 0.5, cons: 0.45 },
      { id: 'south', name: 'South & Mediterranean', seatShare: 0.25, urban: 0.6, cons: 0.6 },
      { id: 'centre', name: 'Centre & rural France', seatShare: 0.21, urban: 0.3, cons: 0.65 },
    ],
    parties: [
      { id: 'fr_ren', name: 'Renaissance (Ensemble)', short: 'REN', color: '#f5b84b', econ: 0.4, social: -0.2, base: 22, blurb: 'Pro-business, pro-EU centrists.' },
      { id: 'fr_rn', name: 'Rassemblement National', short: 'RN', color: '#2c3e8f', econ: -0.1, social: 0.9, base: 28, pariah: true, protest: 0.7, blurb: 'Far-right populists; other parties usually refuse to govern with them.' },
      { id: 'fr_lfi', rivals: ['fr_ren', 'fr_lr'], name: 'La France Insoumise', short: 'LFI', color: '#e84a4a', econ: -0.9, social: -0.7, base: 12, protest: 0.8, blurb: 'Radical left populists.' },
      { id: 'fr_ps', name: 'Parti Socialiste', short: 'PS', color: '#ff7b9c', econ: -0.45, social: -0.4, base: 12, blurb: 'Traditional centre-left.' },
      { id: 'fr_lr', name: 'Les Républicains', short: 'LR', color: '#4f8cff', econ: 0.6, social: 0.6, base: 10, blurb: 'Traditional centre-right.' },
      { id: 'fr_eco', name: 'Les Écologistes', short: 'ÉCO', color: '#34c88a', econ: -0.6, social: -0.8, base: 6, blurb: 'Green party.' },
      { id: 'fr_oth', name: 'Others & Independents', short: 'OTH', color: '#8d9bb8', econ: 0, social: 0, base: 10, protest: 0.5, blurb: 'Small parties and independents.' },
    ],
  },
  italy: {
    countryId: 'italy', chamber: 'Chamber of Deputies', seats: 400, kind: 'mixed', fptpSeats: 147, threshold: 3, presidential: false,
    electionNote: '147 seats by first-past-the-post, 253 by proportional lists (3% threshold).',
    blocs: { ...rich, rural: 0.14, seniors: 0.22, youth: 0.12, middle: 0.24 }, leadable: ['it_fdi', 'it_pd', 'it_m5s'],
    names: names(['Marco', 'Giulia', 'Luca', 'Francesca', 'Matteo', 'Chiara', 'Giorgio', 'Elena', 'Alessandro', 'Sofia'], ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco']),
    regions: [
      { id: 'nw', name: 'North-West', seatShare: 0.22, urban: 0.65, cons: 0.5 },
      { id: 'ne', name: 'North-East', seatShare: 0.17, urban: 0.5, cons: 0.58 },
      { id: 'centre', name: 'Central Italy', seatShare: 0.19, urban: 0.6, cons: 0.4 },
      { id: 'south', name: 'South', seatShare: 0.30, urban: 0.5, cons: 0.52 },
      { id: 'islands', name: 'Sicily & Sardinia', seatShare: 0.12, urban: 0.5, cons: 0.5 },
    ],
    parties: [
      { id: 'it_fdi', rivals: ['it_pd'], name: 'Brothers of Italy', short: 'FdI', color: '#2c3e8f', econ: 0.3, social: 0.8, base: 28, blurb: 'National-conservative right.' },
      { id: 'it_pd', name: 'Democratic Party', short: 'PD', color: '#e84a4a', econ: -0.4, social: -0.5, base: 22, blurb: 'Main centre-left party.' },
      { id: 'it_m5s', name: 'Five Star Movement', short: 'M5S', color: '#f5b84b', econ: -0.5, social: -0.1, base: 12, protest: 0.9, blurb: 'Populist anti-establishment movement.' },
      { id: 'it_lega', name: 'Lega', short: 'LEGA', color: '#34c88a', econ: 0.5, social: 0.8, base: 9, blurb: 'Northern right-wing populists.' },
      { id: 'it_fi', name: 'Forza Italia', short: 'FI', color: '#4f8cff', econ: 0.6, social: 0.3, base: 8, blurb: 'Liberal-conservative centre-right.' },
      { id: 'it_avs', name: 'Greens and Left Alliance', short: 'AVS', color: '#b48cff', econ: -0.8, social: -0.8, base: 6, blurb: 'Green and left alliance.' },
      { id: 'it_az', name: 'Azione–Italia Viva', short: 'AZ-IV', color: '#ff7b9c', econ: 0.4, social: -0.5, base: 5, blurb: 'Liberal centrists.' },
      { id: 'it_oth', name: 'Others & Independents', short: 'OTH', color: '#8d9bb8', econ: 0, social: 0, base: 10, protest: 0.5, blurb: 'Small parties and regional lists.' },
    ],
  },
  pakistan: {
    countryId: 'pakistan', chamber: 'National Assembly', seats: 336, kind: 'fptp', threshold: 0, presidential: false,
    electionNote: '336 seats (266 constituencies plus reserved seats), approximated as first-past-the-post.',
    blocs: dev, leadable: ['pk_pmln', 'pk_ppp', 'pk_pti'],
    names: names(['Ahmed', 'Ayesha', 'Imran', 'Fatima', 'Bilal', 'Sana', 'Usman', 'Zainab', 'Hamza', 'Hina'], ['Khan', 'Sheikh', 'Malik', 'Chaudhry', 'Qureshi', 'Siddiqui', 'Bhutto', 'Raza', 'Baloch', 'Abbasi']),
    regions: [
      { id: 'punjab', name: 'Punjab', seatShare: 0.53, urban: 0.45, cons: 0.6 },
      { id: 'sindh', name: 'Sindh', seatShare: 0.23, urban: 0.55, cons: 0.5 },
      { id: 'kp', name: 'Khyber Pakhtunkhwa', seatShare: 0.15, urban: 0.25, cons: 0.72 },
      { id: 'balochistan', name: 'Balochistan', seatShare: 0.05, urban: 0.2, cons: 0.65 },
      { id: 'capital', name: 'Islamabad', seatShare: 0.04, urban: 0.95, cons: 0.4 },
    ],
    parties: [
      { id: 'pk_pmln', rivals: ['pk_pti'], name: 'Pakistan Muslim League (N)', short: 'PML-N', color: '#34c88a', econ: 0.4, social: 0.4, base: 25, blurb: 'Centre-right party strongest in Punjab.' },
      { id: 'pk_ppp', rivals: ['pk_pti'], name: 'Pakistan Peoples Party', short: 'PPP', color: '#e84a4a', econ: -0.4, social: -0.1, base: 18, blurb: 'Centre-left dynasty party with a Sindh base.' },
      { id: 'pk_pti', name: 'Pakistan Tehreek-e-Insaf', short: 'PTI', color: '#c0392b', econ: -0.1, social: 0.3, base: 30, protest: 1.0, blurb: 'Populist movement with huge youth support.' },
      { id: 'pk_mqm', name: 'Muttahida Qaumi Movement', short: 'MQM', color: '#4f8cff', econ: 0.1, social: 0.0, base: 4, regions: ['sindh'], blurb: 'Urban Sindh party.' },
      { id: 'pk_jui', name: 'Jamiat Ulema-e-Islam (F)', short: 'JUI-F', color: '#b48cff', econ: -0.1, social: 1.0, base: 5, regions: ['kp', 'balochistan'], blurb: 'Religious party strong in the Pashtun belt.' },
      { id: 'pk_oth', name: 'Independents & Minor Parties', short: 'OTH', color: '#8d9bb8', econ: 0, social: 0, base: 18, protest: 0.6, blurb: 'A scatter of small parties and independents.' },
    ],
  },
  bangladesh: {
    countryId: 'bangladesh', chamber: 'Jatiya Sangsad', seats: 300, kind: 'fptp', threshold: 0, presidential: false,
    electionNote: '300 single-member constituencies, first-past-the-post.',
    blocs: dev, leadable: ['bd_bnp', 'bd_ji', 'bd_al'],
    names: names(['Rahim', 'Nasrin', 'Kamal', 'Shirin', 'Tariq', 'Farhana', 'Jahid', 'Rokeya', 'Sabbir', 'Mitu'], ['Rahman', 'Hossain', 'Ahmed', 'Islam', 'Chowdhury', 'Khan', 'Begum', 'Uddin', 'Sarkar', 'Mia']),
    regions: [
      { id: 'dhaka', name: 'Dhaka Division', seatShare: 0.22, urban: 0.8, cons: 0.5 },
      { id: 'chattogram', name: 'Chattogram', seatShare: 0.16, urban: 0.5, cons: 0.55 },
      { id: 'north', name: 'Rajshahi & Rangpur', seatShare: 0.24, urban: 0.25, cons: 0.65 },
      { id: 'southwest', name: 'Khulna & Barishal', seatShare: 0.20, urban: 0.3, cons: 0.55 },
      { id: 'northeast', name: 'Sylhet & Mymensingh', seatShare: 0.18, urban: 0.3, cons: 0.6 },
    ],
    parties: [
      { id: 'bd_al', rivals: ['bd_bnp', 'bd_ji'], name: 'Awami League', short: 'AL', color: '#34c88a', econ: -0.2, social: -0.2, base: 24, blurb: 'The independence-era party, weakened by the 2024 uprising.' },
      { id: 'bd_bnp', name: 'Bangladesh Nationalist Party', short: 'BNP', color: '#4f8cff', econ: 0.3, social: 0.4, base: 36, blurb: 'Centre-right nationalists and the largest opposition party.' },
      { id: 'bd_ji', name: 'Bangladesh Jamaat-e-Islami', short: 'JI', color: '#f5b84b', econ: -0.1, social: 0.95, base: 16, blurb: 'Islamist party with a disciplined cadre.' },
      { id: 'bd_jp', name: 'Jatiya Party', short: 'JP', color: '#b48cff', econ: 0.0, social: 0.3, base: 6, blurb: 'Old regional party and frequent coalition partner.' },
      { id: 'bd_ncp', name: 'National Citizen Party', short: 'NCP', color: '#e84a4a', econ: -0.1, social: -0.1, base: 8, protest: 0.9, blurb: 'Youth-led party born from the 2024 protests.' },
      { id: 'bd_oth', name: 'Independents & Minor Parties', short: 'OTH', color: '#8d9bb8', econ: 0, social: 0, base: 10, protest: 0.6, blurb: 'A scatter of small parties and independents.' },
    ],
  },
  southafrica: {
    countryId: 'southafrica', chamber: 'National Assembly', seats: 400, kind: 'pr', threshold: 0, presidential: false,
    electionNote: '400 seats by closed-list proportional representation (200 national, 200 regional). No threshold, so many small parties win seats.',
    blocs: { ...mid, rural: 0.22, youth: 0.28, workers: 0.26, middle: 0.10, business: 0.06, seniors: 0.08 }, leadable: ['za_anc', 'za_da'],
    names: names(['Thabo', 'Nomsa', 'Sipho', 'Lerato', 'Johan', 'Zanele', 'Pieter', 'Naledi', 'Themba', 'Annelie'], ['Nkosi', 'Dlamini', 'Naidoo', 'Botha', 'Mokoena', 'van der Merwe', 'Khumalo', 'Pillay', 'Molefe', 'Zulu']),
    regions: [
      { id: 'gauteng', name: 'Gauteng', seatShare: 0.25, urban: 0.95, cons: 0.35 },
      { id: 'kzn', name: 'KwaZulu-Natal', seatShare: 0.21, urban: 0.45, cons: 0.6 },
      { id: 'wcape', name: 'Western Cape', seatShare: 0.12, urban: 0.8, cons: 0.4 },
      { id: 'ecape', name: 'Eastern Cape', seatShare: 0.13, urban: 0.35, cons: 0.55 },
      { id: 'interior', name: 'Limpopo, Mpumalanga & interior', seatShare: 0.29, urban: 0.25, cons: 0.6 },
    ],
    parties: [
      { id: 'za_anc', name: 'African National Congress', short: 'ANC', color: '#34c88a', econ: -0.4, social: 0.1, base: 40, blurb: 'The liberation movement that has led since 1994.' },
      { id: 'za_da', rivals: ['za_mk', 'za_eff'], name: 'Democratic Alliance', short: 'DA', color: '#4f8cff', econ: 0.6, social: -0.2, base: 22, blurb: 'Liberal, pro-market main opposition.' },
      { id: 'za_mk', name: 'uMkhonto weSizwe Party', short: 'MK', color: '#f5b84b', econ: -0.5, social: 0.5, base: 14, protest: 0.9, blurb: 'Populist party strong in KwaZulu-Natal.' },
      { id: 'za_eff', name: 'Economic Freedom Fighters', short: 'EFF', color: '#e84a4a', econ: -0.95, social: 0.0, base: 9, protest: 1.0, blurb: 'Radical left populists.' },
      { id: 'za_ifp', name: 'Inkatha Freedom Party', short: 'IFP', color: '#b48cff', econ: 0.2, social: 0.5, base: 4, regions: ['kzn'], blurb: 'Zulu-rooted party in KwaZulu-Natal.' },
      { id: 'za_ff', name: 'Freedom Front Plus', short: 'FF+', color: '#ff7b9c', econ: 0.7, social: 0.8, base: 2.5, blurb: 'Afrikaner minority-rights party.' },
      { id: 'za_oth', name: 'Others & Independents', short: 'OTH', color: '#8d9bb8', econ: 0, social: 0, base: 8.5, protest: 0.6, blurb: 'Dozens of small parties.' },
    ],
  },
  newzealand: {
    countryId: 'newzealand', chamber: 'House of Representatives', seats: 120, kind: 'pr', threshold: 5, presidential: false,
    electionNote: '120 seats by mixed-member proportional representation, approximated as list PR with a 5% threshold.',
    blocs: { ...rich, rural: 0.14, middle: 0.24 }, leadable: ['nz_nat', 'nz_lab'],
    names: names(['Liam', 'Aroha', 'Jack', 'Mere', 'Oliver', 'Hana', 'Tane', 'Sophie', 'Ben', 'Emma'], ['Smith', 'Wilson', 'Taylor', 'Ngata', 'Walker', 'Anderson', 'Williams', 'Parata', 'Brown', 'Henare']),
    regions: [
      { id: 'auckland', name: 'Auckland', seatShare: 0.33, urban: 0.95, cons: 0.4 },
      { id: 'north', name: 'Northland & Waikato', seatShare: 0.17, urban: 0.5, cons: 0.58 },
      { id: 'wellington', name: 'Wellington', seatShare: 0.13, urban: 0.9, cons: 0.3 },
      { id: 'canterbury', name: 'Canterbury', seatShare: 0.22, urban: 0.7, cons: 0.5 },
      { id: 'south', name: 'Otago & Southland', seatShare: 0.15, urban: 0.5, cons: 0.5 },
    ],
    parties: [
      { id: 'nz_nat', rivals: ['nz_lab', 'nz_tpm'], name: 'National Party', short: 'NAT', color: '#4f8cff', econ: 0.5, social: 0.4, base: 38, blurb: 'Centre-right party of business and farmers.' },
      { id: 'nz_lab', name: 'Labour Party', short: 'LAB', color: '#e84a4a', econ: -0.4, social: -0.4, base: 28, blurb: 'Centre-left party of unions and public services.' },
      { id: 'nz_grn', name: 'Green Party', short: 'GRN', color: '#34c88a', econ: -0.7, social: -0.9, base: 11, blurb: 'Environmentalist left.' },
      { id: 'nz_act', rivals: ['nz_tpm'], name: 'ACT New Zealand', short: 'ACT', color: '#f5b84b', econ: 0.9, social: 0.3, base: 8, blurb: 'Free-market libertarians.' },
      { id: 'nz_nzf', name: 'New Zealand First', short: 'NZF', color: '#2c3e8f', econ: 0.0, social: 0.6, base: 7, protest: 0.5, blurb: 'Populist nationalists.' },
      { id: 'nz_tpm', name: 'Te Pāti Māori', short: 'TPM', color: '#c0392b', econ: -0.6, social: -0.4, base: 4, blurb: 'Māori-rights party.' },
      { id: 'nz_oth', name: 'Others & Independents', short: 'OTH', color: '#8d9bb8', econ: 0, social: 0, base: 4, protest: 0.5, blurb: 'Minor parties.' },
    ],
  },
};

export const X1_REL: Record<string, Record<string, number>> = {
  france: { usa: 75, uk: 70, china: 50, russia: 30, india: 66, japan: 70, canada: 74, australia: 66, gulf: 62, brazil: 62, pakistan: 44 },
  italy: { usa: 76, uk: 70, china: 50, russia: 32, india: 60, japan: 66, canada: 72, australia: 64, gulf: 62, brazil: 64, pakistan: 44 },
  pakistan: { china: 82, usa: 48, india: 14, russia: 50, gulf: 74, japan: 56, eu: 52, uk: 62, asean: 54, canada: 48, australia: 42, brazil: 50 },
  bangladesh: { india: 56, china: 62, usa: 56, eu: 58, japan: 72, uk: 60, gulf: 62, russia: 46, pakistan: 38, asean: 56, canada: 56, australia: 54 },
  southafrica: { china: 64, usa: 52, eu: 62, uk: 64, india: 64, russia: 58, brazil: 70, gulf: 52, japan: 62, australia: 62, canada: 60, asean: 54 },
  newzealand: { australia: 90, uk: 82, usa: 78, canada: 80, japan: 70, china: 58, eu: 66, india: 56, asean: 66, gulf: 52, brazil: 54 },
};
export const X1_TRADE: Record<string, Record<string, number>> = {
  france: { usa: 1.2, china: 1.2, uk: 1.3 },
  italy: { usa: 1.3, china: 1.2, uk: 1.2 },
  pakistan: { china: 3, gulf: 2.2, usa: 1.6, uk: 1.5, eu: 1.5 },
  bangladesh: { eu: 3, usa: 2.2, india: 2.5, china: 2.2, uk: 1.5 },
  southafrica: { china: 2.6, eu: 1.8, usa: 1.3, uk: 1.3, india: 1.5 },
  newzealand: { australia: 4, china: 3, usa: 1.5, japan: 1.5 },
};

const nato: Org = { id: 'nato', name: 'NATO', kind: 'security', desc: 'Collective defence.', member0: true, trade: 0, stab: 2.5, cost: 0.1 };
const eumarket: Org = { id: 'eumarket', name: 'EU single market', kind: 'bloc', desc: 'Frictionless trade across Europe.', member0: true, trade: 2.0, stab: 0.5, cost: 0.02 };
const commonwealth: Org = { id: 'commonwealth', name: 'Commonwealth', kind: 'bloc', desc: 'Historic ties and trade links.', member0: true, trade: 0.6, stab: 0, cost: 0.01 };
const cptpp: Org = { id: 'cptpp', name: 'CPTPP trade pact', kind: 'bloc', desc: 'Pacific trade partnership.', member0: true, trade: 1.2, stab: 0, cost: 0.02 };
const brics: Org = { id: 'brics', name: 'BRICS', kind: 'bloc', desc: 'Emerging-economy bloc.', member0: true, trade: 0.8, stab: 0, cost: 0.01 };
export const X1_ORGS: Record<string, Org[]> = {
  france: [nato, eumarket],
  italy: [nato, eumarket],
  pakistan: [
    { id: 'sco', name: 'Shanghai Cooperation Organisation', kind: 'bloc', desc: 'Eurasian security and economic forum led by China and Russia.', member0: true, trade: 0.6, stab: 0.5, cost: 0.01 },
    { id: 'cpec', name: 'China–Pakistan Economic Corridor', kind: 'bloc', desc: 'Roads, ports and power plants financed by China.', member0: true, trade: 1.0, stab: 0, cost: 0.02 },
  ],
  bangladesh: [
    { id: 'bimstec', name: 'BIMSTEC', kind: 'bloc', desc: 'Bay of Bengal regional cooperation.', member0: true, trade: 0.8, stab: 0, cost: 0.01 },
    commonwealth,
    { ...brics, member0: false, gate: ['china', 'india'] },
  ],
  southafrica: [brics, commonwealth, { id: 'afcfta', name: 'African Continental Free Trade Area', kind: 'bloc', desc: 'A single market across Africa.', member0: true, trade: 1.0, stab: 0, cost: 0.01 }],
  newzealand: [cptpp, commonwealth, { id: 'fiveeyes', name: 'Five Eyes intelligence alliance', kind: 'security', desc: 'Intelligence sharing with the US, UK, Canada and Australia.', member0: true, trade: 0, stab: 2.0, cost: 0.05 }],
};

export const X1_DISASTER: Record<string, string> = {
  france: 'A severe heat wave and wildfires have scorched the south, while storm floods hit the north-west.',
  italy: 'A strong earthquake and landslides have struck central Italy, destroying historic towns.',
  pakistan: 'Monsoon super-floods have submerged districts across Sindh and Punjab, displacing millions.',
  bangladesh: 'A powerful cyclone and storm surge have swept the coast, destroying homes and crops.',
  southafrica: 'Floods and mudslides have hit KwaZulu-Natal and the Eastern Cape, cutting roads and power.',
  newzealand: 'A strong earthquake and heavy storms have damaged roads, ports and homes.',
};
export const X1_REGION: Record<string, string> = {
  france: 'Overseas territories and rural regions are protesting that Paris ignores them.',
  italy: 'Northern regions are demanding more autonomy, while the south demands more investment.',
  pakistan: 'Provincial governments in Sindh and Balochistan accuse the centre of taking their resources.',
  bangladesh: 'Hill-region and northern districts complain they are left out of national development.',
  southafrica: 'Provincial governments are demanding more funding and control over service delivery.',
  newzealand: 'Māori leaders and regional councils are demanding a bigger say in resource decisions.',
};
