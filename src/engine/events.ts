// Event definitions. Events are chosen by context-sensitive weights (your economy, politics and
// country), offer 2-3 choices each, and every choice has an immediate effect plus lingering
// consequences via modifiers/flags. Cash amounts are % of annual GDP so they scale per country.
import type { CountryDef, GameState, Modifier, SpendKey, StockKey, TaxKey } from './types';
import { coalSeats, confidenceVote, fallOfGovernment, genMinister, pdef, sysOf, totalSeats } from './politics';
import { POSTS } from './parties';
import { startEventProject, type EventProjectSpec } from './projects';
import { OPPORTUNITY_EVENTS } from './opportunities';
import { SOCIETY_EVENTS, socDisasterFactor } from './society';
import { FACTION_EVENTS } from './factions';
import { REGION_EVENTS } from './regions';
import { getNation, rivalNation, topPartner } from './diplomacy';

export interface Fx {
  s: GameState;
  c: CountryDef;
  rnd: () => number;
  approval(d: number): void;
  stability(d: number): void;
  confidence(d: number): void;
  unemployment(d: number): void;
  inflation(d: number): void;
  currency(d: number): void;
  /** one-off spending, % of annual GDP (negative = windfall) */
  cost(pctGdp: number): void;
  mod(label: string, months: number, e: Partial<Modifier>): void;
  spend(k: SpendKey, d: number): void;
  tax(k: TaxKey, d: number): void;
  stock(k: StockKey, d: number): void;
  flag(k: string, v: number): void;
  /** Start a construction project that occupies one of the country's construction slots. */
  project(spec: EventProjectSpec): void;
}

export interface ChoiceDef {
  label: string;
  hint: string;
  available?: (s: GameState, c: CountryDef) => boolean;
  run: (fx: Fx) => string;
}

export interface EventDef {
  id: string;
  title: string;
  icon: string;
  category: string;
  cooldown: number;
  weight: (s: GameState, c: CountryDef) => number;
  text: (s: GameState, c: CountryDef) => string;
  onShow?: (fx: Fx) => void;
  choices: ChoiceDef[];
}

const debtPct = (s: GameState) => (s.debt / s.gdp) * 100;
const rich = (c: CountryDef) => c.devLevel === 'High income';
const isC = (c: CountryDef, ...ids: string[]) => ids.includes(c.id);
const inflHigh = (s: GameState, c: CountryDef) => s.inflation - c.inflationTarget;

const DISASTER: Record<string, string> = {
  nepal: 'A powerful earthquake has struck the hills, collapsing homes and cutting roads to remote districts.',
  india: 'Severe floods and a cyclone have displaced hundreds of thousands across several states.',
  uk: 'Storms and record flooding have swamped towns across the north and Midlands.',
  usa: 'A major hurricane has made landfall, flooding cities and knocking out power for millions.',
  germany: 'Catastrophic river floods have devastated towns in the west of the country.',
  japan: 'A strong earthquake and tsunami warning has hit the coast; factories and ports are damaged.',
  canada: 'Out-of-control wildfires are forcing mass evacuations and shutting down oil and mining operations.',
  australia: 'Bushfires and flash floods are destroying homes and farmland across several states.',
};

import { X1_DISASTER, X1_REGION } from './extra1';
const REGION: Record<string, string> = {
  nepal: 'Madhesh and Janajati groups are demanding greater provincial autonomy and fairer representation.',
  india: 'Several state governments are demanding a bigger share of tax revenue and more control over policy.',
  uk: 'Pressure is growing for another vote on Scottish independence and more devolved powers.',
  canada: 'Alberta and Quebec leaders are demanding more control over resources and immigration.',
  usa: 'Governors from several states are openly defying federal policy.',
  germany: 'Eastern Länder are demanding a bigger share of federal investment.',
  japan: 'Rural prefectures complain that Tokyo is draining them of people and money.',
  australia: 'State premiers are demanding a bigger share of GST revenue.',
};
Object.assign(DISASTER, X1_DISASTER);
Object.assign(REGION, X1_REGION);

export const EVENTS: EventDef[] = [
  {
    id: 'energySpike', title: 'Energy prices surge', icon: '⛽', category: 'Economy', cooldown: 18,
    weight: (s, c) => (s.commodity > 118 ? (0.6 + 1.5 * c.fuelImports) * (s.commodity > 140 ? 2 : 1) : 0),
    text: (s, c) => `Global oil and gas prices have jumped to ${Math.round(s.commodity)}% of normal. Fuel queues are forming and transport firms are warning of fare rises in ${c.name}.`,
    choices: [
      { label: 'Expand fuel subsidies', hint: 'Costly; holds prices down', run: (fx) => { fx.cost(0.6); fx.mod('Emergency fuel subsidies', 8, { inflation: -0.8 }); fx.approval(1); return 'Pump prices are capped, but the subsidy bill is climbing.'; } },
      { label: 'Let prices pass through', hint: 'Cheap for the budget, painful for households', run: (fx) => { fx.mod('Energy price pass-through', 8, { inflation: 0.9, growth: -0.3 }); fx.approval(-2); return 'Households feel the pinch; the opposition blames you.'; } },
      { label: 'Targeted payments to the poorest', hint: 'Efficient only if the state can actually deliver', run: (fx) => {
          fx.cost(0.3); fx.mod('Targeted energy payments', 6, { inflation: 0.3 });
          if (fx.s.stocks.efficiency > 55) { fx.approval(2); return 'Payments reach those who need them; praise for competent delivery.'; }
          fx.cost(0.2); fx.approval(-0.5); return 'Payments are delayed and leak to the wrong people. Extra spending is needed to fix it.';
        } },
    ],
  },
  {
    id: 'strike', title: 'Public-sector strike', icon: '🪧', category: 'Politics', cooldown: 20,
    weight: (s, c) => 0.9 + (inflHigh(s, c) > 1.5 ? 0.8 : 0),
    text: (s) => `Teachers, nurses and civil servants have walked out demanding pay rises to keep up with ${s.inflation > 4 ? 'soaring' : 'rising'} prices. Services are disrupted.`,
    choices: [
      { label: 'Concede to demands', hint: 'Buys peace; permanently higher wage bill', run: (fx) => { fx.cost(0.4); fx.mod('Higher public wage bill', 36, { revenuePct: -0.15 }); fx.approval(2); fx.stability(1); return 'The strike ends. Unions are pleased; the finance ministry less so.'; } },
      { label: 'Negotiate a compromise', hint: 'Might work – might drag on', run: (fx) => {
          if (fx.rnd() < 0.55) { fx.cost(0.15); fx.approval(0.5); return 'A deal is struck after tense talks.'; }
          fx.mod('Prolonged strike', 3, { growth: -0.3 }); fx.approval(-2); return 'Talks collapse and the strike drags on for weeks before a lukewarm deal.';
        } },
      { label: 'Hold firm', hint: 'Saves money, risks unrest', run: (fx) => { fx.mod('Strike disruption', 4, { growth: -0.4, inflation: -0.2 }); fx.stability(-3); fx.approval(-2); return 'The strike is broken but bitterness lingers; public services suffer.'; } },
    ],
  },
  {
    id: 'scandal', title: 'Minister embroiled in scandal', icon: '📰', category: 'Politics', cooldown: 22,
    weight: (s, c) => 0.9 * (s.programs.anticorruption ? 0.45 : 1) * (1.3 - s.stocks.efficiency / 120) * (1 + 0.2 * (c.id === 'nepal' || c.id === 'india' ? 1 : 0)),
    text: () => 'Newspapers have exposed a senior minister for taking favours from a contractor. Calls for resignation are growing.',
    choices: [
      { label: 'Sack him and open an independent probe', hint: 'Short-term pain, builds credibility', run: (fx) => { fx.approval(-1); fx.mod('Clean-up credibility', 12, { stability: 1.2 }); fx.stock('efficiency', 2); return 'The minister goes. The probe wins grudging respect.'; } },
      { label: 'Stand by him', hint: 'A gamble', run: (fx) => {
          if (fx.rnd() < 0.5) { fx.approval(-0.5); return 'The story fades after a few news cycles.'; }
          fx.approval(-5); fx.stability(-4); return 'More evidence emerges and you look complicit. A bruising fortnight.';
        } },
      { label: 'Quiet reshuffle', hint: 'Dodge the question; leaves doubts', run: (fx) => { fx.approval(-1.5); fx.flag('scandalDebt', 1); return 'He moves sideways to another post. Critics call it a cover-up.'; } },
    ],
  },
  {
    id: 'disaster', title: 'Natural disaster', icon: '🌪️', category: 'Crisis', cooldown: 18,
    weight: (s, c) => 0.7 * c.disasterRisk * socDisasterFactor(s),
    text: (_s, c) => DISASTER[c.id] ?? 'A major natural disaster has struck.',
    choices: [
      { label: 'Massive relief and rebuilding', hint: 'Expensive; reconstruction boosts activity later', run: (fx) => {
          const sev = 0.6 + fx.rnd() * 0.8; fx.cost(0.8 * sev); fx.approval(3); fx.stability(1);
          fx.mod('Reconstruction boom', 12, { growth: 0.3 }); return 'Relief reaches survivors quickly. Reconstruction projects start to create jobs.';
        } },
      { label: 'Minimal emergency response', hint: 'Cheap, but dangerous politically', run: (fx) => {
          const sev = 0.6 + fx.rnd() * 0.8; fx.cost(0.2 * sev); fx.approval(-6); fx.stability(-4);
          fx.mod('Disaster disruption', 6, { growth: -0.8, unemployment: 0.4 }); return 'Slow aid triggers anger. Survivors feel abandoned.';
        } },
      { label: 'Appeal for international aid', hint: 'Cuts costs; looks weak', available: (_s, c) => !rich(c), run: (fx) => {
          fx.cost(0.2); fx.cost(-0.35); fx.approval(1); fx.mod('Dependence on aid', 6, { confidence: -2 }); return 'Donor money arrives, partly offsetting your costs.';
        } },
      { label: 'Draw on insurance and reserves', hint: 'Prepared countries cope well', available: (_s, c) => rich(c), run: (fx) => {
          fx.cost(0.4); fx.approval(1.5); return 'Disaster funds and insurers cushion the blow.';
        } },
    ],
  },
  {
    id: 'bankStress', title: 'Banks under stress', icon: '🏦', category: 'Economy', cooldown: 36,
    weight: (s) => (s.confidence < 42 || s.flags.housingBoom > 0 || s.inflation > 9 ? 1.2 : 0.12),
    text: () => 'Depositors are queueing at a mid-sized bank. Regulators warn that bad loans are far larger than reported.',
    choices: [
      { label: 'Full bailout', hint: 'Calms markets; costs a lot', run: (fx) => { fx.cost(1.2); fx.mod('Banking calm', 12, { confidence: 5 }); fx.approval(-2); return 'The bank is rescued at taxpayers’ expense. Voters fume, markets calm.'; } },
      { label: 'Let it fail', hint: 'Cheap now, contagion risk', run: (fx) => { fx.mod('Credit crunch', 9, { growth: -1.2, unemployment: 0.8, confidence: -6 }); fx.approval(-3); return 'Credit dries up as other banks pull back. A sharp slowdown follows.'; } },
      { label: 'Guarantee deposits only', hint: 'Middle path', run: (fx) => { fx.cost(0.4); fx.mod('Credit tightening', 6, { growth: -0.3 }); fx.approval(-1); return 'Savers are protected, shareholders wiped out. The scare passes.'; } },
    ],
  },
  {
    id: 'studentProtest', title: 'Student protests', icon: '🎓', category: 'Politics', cooldown: 30,
    weight: (s, c) => 0.5 + (s.stocks.education < c.stock0.education ? 0.6 : 0),
    text: () => 'Thousands of students are marching over fees, overcrowded classrooms and graduate unemployment.',
    choices: [
      { label: 'Increase education funding', hint: 'Permanent budget increase', run: (fx) => { fx.spend('education', 0.3); fx.approval(2); return 'You commit to a permanent education funding boost.'; } },
      { label: 'Hold the line', hint: 'Risk of escalation', run: (fx) => { fx.approval(-1); fx.stability(-2.5); return 'Demonstrations grow before dying down; the issue won’t go away.'; } },
      { label: 'Convene a commission', hint: 'Buys time', run: (fx) => { fx.stability(1); fx.flag('eduCommission', 1); return 'A commission is formed. Students are sceptical but the heat goes out.'; } },
    ],
  },
  {
    id: 'investmentDeal', title: 'Multinational offers a factory', icon: '🏭', category: 'Economy', cooldown: 24,
    weight: (s) => (s.confidence > 45 ? 0.7 : 0.2),
    text: (_s, c) => `A global manufacturer is ready to build a major plant in ${c.name} – if you grant sweeping tax breaks.`,
    choices: [
      { label: 'Accept generous breaks', hint: 'Jobs now, revenue later', run: (fx) => { fx.project({ key: 'factory', name: 'Foreign-owned factory complex', icon: '🏭', desc: 'A multinational builds a major plant under sweeping tax breaks.', months: 30, foreign: true, mod: { growth: 0.22, unemployment: -0.1, revenuePct: -0.05 }, exportBoost: 0.4, sector: { manufacturing: 0.5 } }); fx.mod('Investor signal', 24, { confidence: 2 }); fx.approval(1); return 'Construction starts (it takes a construction slot). Local leaders celebrate; the treasury grumbles.'; } },
      { label: 'Demand local-content rules', hint: 'They might walk away', run: (fx) => {
          if (fx.rnd() < 0.5) { fx.project({ key: 'factory', name: 'Local-content factory', icon: '🏭', desc: 'A multinational builds a plant sourcing parts from local suppliers.', months: 36, foreign: true, mod: { growth: 0.18, unemployment: -0.1 }, exportBoost: 0.3, sector: { manufacturing: 0.4 } }); fx.approval(1); return 'They agree to tougher terms and construction starts. Good deal.'; }
          fx.approval(-0.5); return 'The firm walks away and builds in a neighbouring country.';
        } },
      { label: 'Decline', hint: 'Protects revenue and pride', run: (fx) => { fx.stability(0.5); fx.confidence(-1); return 'You decline. Nationalists applaud; business groups are unimpressed.'; } },
    ],
  },
  {
    id: 'farmers', title: 'Farmers’ protest', icon: '🚜', category: 'Politics', cooldown: 24,
    weight: (_s, c) => (isC(c, 'india', 'nepal') ? 0.9 : isC(c, 'canada', 'australia', 'germany') ? 0.5 : 0.2),
    text: () => 'Farmers are blockading highways, demanding guaranteed prices and relief from rising input costs.',
    choices: [
      { label: 'Guaranteed minimum prices', hint: 'Popular; costly and inflationary', run: (fx) => { fx.cost(0.4); fx.mod('Price guarantees', 12, { inflation: 0.3 }); fx.approval(2); return 'Farmers go home satisfied. Consumers will pay somewhat more.'; } },
      { label: 'Reform with dialogue', hint: 'Better for efficiency, risky', run: (fx) => {
          fx.mod('Agricultural reform', 24, { growth: 0.1 }); fx.approval(-1);
          if (fx.rnd() < 0.4) { fx.stability(-3); return 'Talks falter and protests escalate before a compromise.'; }
          return 'A phased reform is agreed after long talks.';
        } },
      { label: 'Clear the roads', hint: 'Authority over popularity', run: (fx) => { fx.approval(-3); fx.stability(-3); return 'The blockade is cleared. Resentment simmers.'; } },
    ],
  },
  {
    id: 'housingBoom', title: 'Housing bubble warning', icon: '🏠', category: 'Economy', cooldown: 60,
    weight: (s, c) => (s.flags.housingBoom > 0 ? 0 : isC(c, 'uk', 'canada', 'australia') ? 1.0 : isC(c, 'germany', 'usa', 'japan') ? 0.25 : 0.1),
    text: () => 'House prices are soaring far faster than incomes. Economists warn of a bubble; first-time buyers are priced out.',
    choices: [
      { label: 'Cool the market', hint: 'Prick the bubble gently', run: (fx) => { fx.mod('Cooling measures', 12, { growth: -0.3 }); fx.confidence(-2); fx.approval(-1); return 'Lending rules tighten and prices level off.'; } },
      { label: 'Ignore it – prosperity feels good', hint: 'Short-term boost; bust risk', run: (fx) => { fx.approval(1); fx.flag('housingBoom', fx.s.turn); return 'Homeowners feel rich. You are storing up trouble.'; } },
      { label: 'Subsidise first-time buyers', hint: 'Popular but fuels prices', run: (fx) => { fx.cost(0.3); fx.mod('Housing subsidy demand', 12, { inflation: 0.2 }); fx.approval(3); fx.flag('housingBoom', fx.s.turn); return 'Young voters cheer; prices climb faster.'; } },
    ],
  },
  {
    id: 'housingBust', title: 'Housing market crashes', icon: '📉', category: 'Crisis', cooldown: 60,
    weight: (s) => (s.flags.housingBoom > 0 && s.turn - s.flags.housingBoom >= 20 ? 3 : 0),
    onShow: (fx) => { fx.mod('Housing bust', 18, { growth: -0.9, unemployment: 0.6, confidence: -4 }); fx.flag('housingBoom', 0); fx.flag('housingBust', 1); },
    text: () => 'The bubble has burst. Prices are tumbling, construction has stalled and mortgage defaults are rising.',
    choices: [
      { label: 'Stimulate the economy', hint: 'Cushions the fall; adds to debt', run: (fx) => { fx.cost(1.0); fx.mod('Stimulus', 9, { growth: 0.7 }); fx.approval(1); return 'Spending props up demand while the market resets.'; } },
      { label: 'Support mortgage holders', hint: 'Targeted help', run: (fx) => { fx.cost(0.5); fx.stability(2); fx.approval(2); return 'Struggling borrowers get relief; banks avoid the worst.'; } },
      { label: 'Let the market clear', hint: 'Painful but cheap', run: (fx) => { fx.approval(-3); fx.mod('Deeper downturn', 12, { unemployment: 0.5 }); return 'Pain is real, but public finances are intact.'; } },
    ],
  },
  {
    id: 'pandemic', title: 'Health emergency', icon: '🦠', category: 'Crisis', cooldown: 60,
    weight: (s) => 0.25 * (1.6 - s.stocks.health / 100),
    text: () => 'A fast-spreading infectious disease has appeared. Hospitals are warning of overload within weeks.',
    choices: [
      { label: 'Strict lockdown', hint: 'Saves lives, hurts the economy', run: (fx) => { fx.cost(0.5); fx.mod('Lockdown', 4, { growth: -1.5, unemployment: 0.7 }); fx.approval(fx.s.stocks.health < 50 ? 1 : -2); return 'The curve is flattened at a steep economic cost.'; } },
      { label: 'Targeted measures', hint: 'Needs a capable health system', run: (fx) => {
          fx.cost(0.6); fx.mod('Targeted measures', 6, { growth: -0.5 });
          if (fx.s.stocks.health > 60) { fx.approval(1); return 'Testing and tracing keep things under control.'; }
          fx.approval(-3); fx.stability(-2); return 'Your health system cannot cope with a targeted approach; cases surge.';
        } },
      { label: 'Minimal intervention', hint: 'Keeps the economy open', run: (fx) => { fx.mod('Uncontrolled outbreak', 8, { growth: -0.8 }); fx.approval(-4); fx.stability(-3); return 'Hospitals are overwhelmed; public trust plummets.'; } },
    ],
  },
  {
    id: 'drought', title: 'Drought and failed harvests', icon: '🌾', category: 'Crisis', cooldown: 30,
    weight: (_s, c) => (isC(c, 'india', 'nepal') ? 0.7 : isC(c, 'australia', 'canada') ? 0.5 : 0.1),
    text: () => 'Rains have failed. Crop yields are collapsing and food prices are rising.',
    choices: [
      { label: 'Farmer relief package', hint: 'Cushions rural incomes', run: (fx) => { fx.cost(0.5); fx.approval(2); fx.mod('Crop shortfall', 6, { inflation: 0.3 }); return 'Aid reaches farmers; food prices still creep up.'; } },
      { label: 'Import food', hint: 'Keeps prices down; weakens currency', run: (fx) => { fx.cost(0.2); fx.currency(-2); fx.mod('Food imports', 6, { inflation: -0.1 }); return 'Shipments arrive, shelves stay stocked.'; } },
      { label: 'Do nothing', hint: 'Let the market adjust', run: (fx) => { fx.mod('Food price spike', 8, { inflation: 0.8, unemployment: 0.3 }); fx.approval(-3); return 'Food inflation hits poor households hardest.'; } },
    ],
  },
  {
    id: 'tradeDispute', title: 'Trade dispute', icon: '🚢', category: 'Diplomacy', cooldown: 24,
    weight: (_s, c) => 0.9 * c.openness,
    text: (_s, c) => `A major trading partner has slapped tariffs on ${c.name}'s exports, claiming unfair subsidies.`,
    choices: [
      { label: 'Retaliate with tariffs', hint: 'Popular but costly', run: (fx) => { fx.mod('Tariff war', 12, { inflation: 0.5, growth: -0.4 }); fx.approval(2); return 'Nationalists cheer; importers and consumers pay.'; } },
      { label: 'Negotiate concessions', hint: 'Avoids a trade war', run: (fx) => { fx.cost(0.1); fx.mod('Concession costs', 12, { growth: -0.1 }); fx.approval(-1); return 'A deal is struck that critics call a surrender.'; } },
      { label: 'File a complaint at the WTO', hint: 'Slow and uncertain', run: (fx) => {
          if (fx.rnd() < 0.6) { fx.approval(0.5); return 'The ruling eventually backs you and tariffs ease.'; }
          fx.mod('Trade losses', 8, { growth: -0.4 }); return 'The process drags on while exporters suffer.';
        } },
    ],
  },
  {
    id: 'currencyPressure', title: 'Currency under pressure', icon: '💱', category: 'Economy', cooldown: 24,
    weight: (s) => (s.currency < 88 ? 3 : 0),
    text: (s) => `Your currency has lost ${Math.round(100 - s.currency)}% of its value. Importers are struggling and speculators are circling.`,
    choices: [
      { label: 'Intervene with reserves', hint: 'Expensive; temporary', run: (fx) => { fx.cost(0.5); fx.currency(6); return 'Reserves are burned to support the currency.'; } },
      { label: 'Lean on the central bank to hike', hint: 'Strengthens currency; hurts growth', run: (fx) => { fx.mod('Tighter money', 6, { growth: -0.3, inflation: -0.2 }); fx.currency(4); fx.stability(-1); return 'Rates rise. The currency steadies, borrowers wince.'; } },
      { label: 'Let it float', hint: 'Boosts exports but imports inflation', run: (fx) => { fx.mod('Depreciation passthrough', 6, { inflation: 0.5, growth: 0.2 }); fx.confidence(-1); return 'The currency finds a new level; prices rise.'; } },
    ],
  },
  {
    id: 'security', title: 'Security incident', icon: '🛡️', category: 'Security', cooldown: 30,
    weight: (s) => 0.5 * (1.3 - s.stocks.security / 100),
    text: (_s, c) => (isC(c, 'nepal', 'india') ? 'A border clash has left soldiers dead, and the public is demanding a firm response.' : 'A violent attack has shaken the public and raised fears about national security.'),
    choices: [
      { label: 'Boost defence spending', hint: 'Permanent budget increase', run: (fx) => { fx.spend('defence', 0.2); fx.approval(2); return 'You announce a permanent increase in security funding.'; } },
      { label: 'Measured response', hint: 'Show strength without escalation', run: (fx) => { fx.stability(-1); fx.approval(0.5); fx.stock('security', 1); return 'Security forces step up. Critics say it is not enough.'; } },
      { label: 'Diplomacy and restraint', hint: 'Avoids escalation; some will call you soft', run: (fx) => { fx.approval(-1); fx.stability(1); return 'Back-channel talks calm tensions.'; } },
    ],
  },
  {
    id: 'techBoom', title: 'Technology boom', icon: '💡', category: 'Economy', cooldown: 36,
    weight: (_s, c) => (isC(c, 'usa', 'india', 'uk', 'germany', 'japan', 'canada') ? 0.5 : 0.15),
    text: () => 'A wave of start-ups and AI investment is sweeping in. Industry asks how the government will respond.',
    choices: [
      { label: 'Build a national tech hub', hint: 'Investment pays off over years', run: (fx) => { fx.project({ key: 'techhub', name: 'National tech hub', icon: '💡', desc: 'A flagship campus for start-ups and AI labs.', months: 24, foreign: false, costPct: 0.6, maintenance: 0.04, asset: { education: 1 }, mod: { growth: 0.2 }, sector: { technology: 0.6 } }); fx.mod('Tech confidence', 24, { confidence: 3 }); fx.approval(1); return 'Work starts on a flagship campus to draw talent and capital.'; } },
      { label: 'Light-touch approach', hint: 'Let the market lead', run: (fx) => { fx.mod('Tech tailwind', 24, { growth: 0.15 }); return 'The sector grows organically.'; } },
      { label: 'Strict regulation', hint: 'Public trust vs. innovation', run: (fx) => { fx.mod('Regulatory drag', 12, { growth: -0.1 }); fx.stability(1); fx.approval(1); return 'The public likes the safeguards; start-ups grumble.'; } },
    ],
  },
  {
    id: 'pension', title: 'Pension funding gap', icon: '👴', category: 'Economy', cooldown: 48,
    weight: (_s, c) => c.agingDrag * 1.6,
    text: () => 'Actuaries warn that pensions are heading for a deficit as the population ages. Something has to give.',
    choices: [
      { label: 'Raise the retirement age', hint: 'Fixes the books; hugely unpopular', run: (fx) => { fx.approval(-4); fx.stability(-2); fx.mod('Pension savings', 120, { revenuePct: 0.5 }); return 'Savings build over time, but pensioners and unions are furious.'; } },
      { label: 'Raise contributions (income tax +1)', hint: 'Shared burden', run: (fx) => { fx.tax('incomeTax', 1); fx.approval(-2); return 'Workers pay more, quietly.'; } },
      { label: 'Cut benefit growth', hint: 'Permanent cut to welfare budget', run: (fx) => { fx.spend('welfare', -0.5); fx.approval(-3); fx.stability(-2); return 'Welfare is trimmed. Protest groups form.'; } },
      { label: 'Borrow and delay', hint: 'Kick the can', run: (fx) => { fx.mod('Pension deficit', 60, { revenuePct: -0.2 }); return 'The gap widens quietly. Future governments will deal with it.'; } },
    ],
  },
  {
    id: 'blackout', title: 'Power blackouts', icon: '🔌', category: 'Crisis', cooldown: 24,
    weight: (s) => (s.stocks.infrastructure < 45 ? 1.8 : 0.15),
    text: () => 'Grid failures have plunged cities into darkness for days. Factories are idle and tempers are short.',
    choices: [
      { label: 'Emergency power imports', hint: 'Quick fix; uses foreign exchange', run: (fx) => { fx.cost(0.5); fx.currency(-2); return 'Imported power keeps the lights on for now.'; } },
      { label: 'Rationing', hint: 'Cheap; hurts output', run: (fx) => { fx.mod('Power rationing', 4, { growth: -0.6 }); fx.approval(-4); return 'Scheduled outages keep the grid alive but anger citizens.'; } },
      { label: 'Crash infrastructure programme', hint: 'Permanent budget increase', run: (fx) => { fx.cost(0.3); fx.spend('infrastructure', 0.3); fx.approval(1); return 'A major grid investment programme begins.'; } },
    ],
  },
  {
    id: 'labour', title: 'Labour shortages', icon: '👷', category: 'Economy', cooldown: 36,
    weight: (_s, c) => (isC(c, 'germany', 'japan') ? 0.7 : isC(c, 'canada', 'uk', 'australia') ? 0.4 : 0.05),
    text: () => 'Employers say they cannot find enough workers. Vacancies are at record highs.',
    choices: [
      { label: 'Open the doors to migrants', hint: 'Growth now, tension later', run: (fx) => { fx.mod('Migrant workforce', 24, { growth: 0.3 }); fx.approval(-2); fx.stability(-1); return 'Visas ease and businesses expand; the debate turns heated.'; } },
      { label: 'Fund automation and training', hint: 'Slower but lasting', run: (fx) => { fx.cost(0.3); fx.mod('Automation drive', 36, { growth: 0.1 }); fx.stock('education', 1); return 'Productivity inches up as firms adopt technology.'; } },
      { label: 'Do nothing', hint: 'Let the labour market sort it out', run: (fx) => { fx.mod('Labour bottleneck', 24, { growth: -0.3 }); return 'Firms struggle to expand; output suffers.'; } },
    ],
  },
  {
    id: 'rebellion', title: 'Party rebellion', icon: '⚔️', category: 'Politics', cooldown: 20,
    weight: (s, c) => 0.45 + c.fragmentation + c.polarisation * 0.4 + (s.approval < 35 ? 0.6 : 0),
    text: () => 'Backbenchers and coalition partners are threatening to withhold support unless their demands are met.',
    choices: [
      { label: 'Concede to the rebels', hint: 'Purchases peace with policy', run: (fx) => { fx.spend('welfare', 0.2); fx.stability(3); return 'Welfare spending is raised to buy loyalty.'; } },
      { label: 'Purge the ringleaders', hint: 'Authority but risk', run: (fx) => { fx.stability(-3); fx.approval(-1); fx.mod('Discipline restored', 12, { stability: 2 }); return 'The rebels are expelled. The rest fall into line, eventually.'; } },
      { label: 'Offer cabinet posts', hint: 'Cheap, but dilutes competence', run: (fx) => { fx.cost(0.05); fx.stability(2); fx.stock('efficiency', -2); return 'Ministerial jobs are handed out. Efficiency suffers.'; } },
    ],
  },
  {
    id: 'inflationCrisis', title: 'Inflation crisis', icon: '🔥', category: 'Crisis', cooldown: 18,
    weight: (s, c) => (inflHigh(s, c) > 3.5 ? 5 : 0),
    text: (s) => `Inflation has hit ${s.inflation.toFixed(1)}%. Wages are being eaten away and the opposition is hammering you.`,
    choices: [
      { label: 'Austerity package', hint: 'Real cure; real pain', run: (fx) => { fx.spend('administration', -0.3); fx.mod('Austerity', 10, { inflation: -0.9, growth: -0.6 }); fx.approval(-3); return 'Spending is cut hard. Prices ease, but so does growth.'; } },
      { label: 'Price controls', hint: 'Feels good now, bites later', run: (fx) => { fx.mod('Price controls', 6, { inflation: -1.2 }); fx.mod('Shortages after price controls', 12, { inflation: 1.4, growth: -0.2 }); fx.approval(2); return 'Prices are frozen. Shortages are likely to follow.'; } },
      { label: 'Support the central bank', hint: 'Higher rates; stability risk', run: (fx) => { fx.mod('Monetary squeeze', 10, { inflation: -0.6, growth: -0.3 }); fx.stability(-2); fx.approval(-2); return 'You back tough monetary action.'; } },
    ],
  },
  {
    id: 'recession', title: 'Recession alarm', icon: '📉', category: 'Crisis', cooldown: 24,
    weight: (s) => (s.growth < -0.5 ? 4 : 0),
    text: (s) => `The economy is shrinking (${s.growth.toFixed(1)}%). Unemployment is rising and business confidence has collapsed.`,
    choices: [
      { label: 'Stimulus package', hint: 'Props up demand; adds to debt', run: (fx) => { fx.cost(1.0); fx.mod('Stimulus', 9, { growth: 1.0 }); fx.approval(2); return 'Spending kicks in, the downturn softens.'; } },
      { label: 'Light austerity to reassure markets', hint: 'Pro-cyclical risk', run: (fx) => { fx.spend('administration', -0.2); fx.confidence(2); fx.mod('Fiscal squeeze', 9, { growth: -0.3 }); fx.approval(-2); return 'Markets are reassured; the real economy is not.'; } },
      { label: 'Wait it out', hint: 'Passive, but costs nothing', run: (fx) => { fx.approval(-2); return 'You are criticised as passive while the downturn runs its course.'; } },
    ],
  },
  {
    id: 'debtJitters', title: 'Bond markets jittery', icon: '📊', category: 'Economy', cooldown: 24,
    weight: (s, c) => (debtPct(s) > 90 ? ((debtPct(s) - 80) / 30) * (1 - c.debtTolerance) : 0),
    text: (s) => `Debt has reached ${debtPct(s).toFixed(0)}% of GDP and investors are demanding higher yields.`,
    choices: [
      { label: 'Announce a consolidation plan', hint: 'Credibility vs. popularity', run: (fx) => { fx.tax('vat', 1); fx.spend('administration', -0.3); fx.approval(-3); fx.mod('Credible plan', 12, { confidence: 4 }); return 'The plan is unpopular, but yields ease.'; } },
      { label: 'Ignore the warnings', hint: 'Higher borrowing costs', run: (fx) => { fx.mod('Market jitters', 12, { confidence: -3, revenuePct: -0.3 }); return 'Yields drift higher and so does the interest bill.'; } },
      { label: 'Seek IMF / lender support', hint: 'Cash now; conditions attached', available: (_s, c) => !rich(c), run: (fx) => { fx.cost(-1.0); fx.stability(-2); fx.mod('Lender conditions', 18, { approval: -1.5, growth: -0.2, confidence: 3 }); return 'A programme is agreed with strings attached.'; } },
      { label: 'Issue long-dated bonds', hint: 'Lock in funding', available: (_s, c) => rich(c), run: (fx) => { fx.cost(0.1); fx.mod('Long-dated debt', 24, { confidence: 2, revenuePct: -0.15 }); return 'Borrowing is termed out at a modest premium.'; } },
    ],
  },
  {
    id: 'sovereignCrisis', title: 'Sovereign debt crisis', icon: '🚨', category: 'Economy', cooldown: 84,
    weight: (s, c) => {
      const d = debtPct(s);
      const limit = c.debtTolerance > 0.7 ? 170 : c.debtTolerance > 0.3 ? 130 : 95;
      const interestPct = (s.debt * s.avgCost) / s.gdp;
      return d > limit && interestPct > 3.5 ? 2.5 + (d - limit) / 40 : 0;
    },
    text: (s) => `Investors have stopped lending at affordable rates. Debt is ${debtPct(s).toFixed(0)}% of GDP, the interest bill is swallowing the budget and the next bond auction may fail.`,
    choices: [
      { label: 'Negotiate a rescue programme', hint: 'Cheap loans and relief; strict conditions', run: (fx) => { fx.cost(-6); fx.tax('vat', 1.5); fx.spend('administration', -0.3); fx.spend('welfare', -0.4); fx.approval(-9); fx.stability(-4); fx.mod('Rescue programme', 36, { growth: -0.5, confidence: 6, approval: -0.5 }); return 'Lenders step in. Borrowing costs fall, but the conditions bite for years.'; } },
      { label: 'Restructure the debt', hint: 'Cuts debt by a fifth; markets will not forget', run: (fx) => { const d = debtPct(fx.s); fx.cost(-0.2 * d); fx.confidence(-15); fx.currency(-12); fx.approval(-4); fx.mod('Default stigma', 60, { confidence: -4, growth: -0.3, revenuePct: -0.3 }); return 'Creditors take losses. Debt falls sharply, but access to cheap credit is gone for years.'; } },
      { label: 'Self-imposed austerity', hint: 'Big cuts and tax rises; protects your independence', run: (fx) => { fx.tax('vat', 2); fx.tax('incomeTax', 1); fx.spend('welfare', -0.6); fx.spend('administration', -0.4); fx.spend('infrastructure', -0.3); fx.approval(-12); fx.stability(-5); fx.mod('Austerity drag', 30, { growth: -0.7, unemployment: 0.5, confidence: 4 }); return 'A harsh budget calms markets, at a heavy political and social price.'; } },
      { label: 'Let the central bank finance it', hint: 'Fast relief; inflation and a weaker currency', available: (_s, c) => !['germany', 'france', 'italy'].includes(c.id), run: (fx) => { const d = debtPct(fx.s); fx.cost(-0.1 * d); fx.inflation(5); fx.currency(-10); fx.confidence(-6); fx.mod('Monetary financing', 36, { inflation: 2 }); return 'The money presses roll. The debt eases, but prices and the currency pay for it.'; } },
    ],
  },
  {
    id: 'aidOffer', title: 'Foreign aid offer', icon: '🤝', category: 'Diplomacy', cooldown: 30,
    weight: (_s, c) => (rich(c) ? 0 : 0.6),
    text: () => 'Donors are offering a substantial development package, with conditions on governance reforms.',
    choices: [
      { label: 'Accept with conditions', hint: 'Money now; political cost', run: (fx) => { fx.cost(-0.8); fx.mod('Donor conditions', 12, { approval: -1 }); fx.stability(-1); return 'Funds flow, but critics accuse you of selling sovereignty.'; } },
      { label: 'Decline', hint: 'Pride over cash', run: (fx) => { fx.approval(1); fx.stability(1); return 'Nationalists applaud your independence.'; } },
      { label: 'Negotiate better terms', hint: 'May pay off – or not', run: (fx) => {
          if (fx.rnd() < 0.5) { fx.cost(-0.5); return 'A leaner package without strings is agreed.'; }
          fx.approval(-0.5); return 'Donors withdraw the offer.';
        } },
    ],
  },
  {
    id: 'remitSlump', title: 'Remittance slump', icon: '✈️', category: 'Economy', cooldown: 36,
    weight: (_s, c) => (c.remittances >= 10 ? 0.9 : 0),
    onShow: (fx) => { fx.mod('Remittance slump', 12, { growth: -0.7 }); fx.currency(-3); },
    text: () => 'A downturn in the Gulf and Malaysia has cost thousands of migrant workers their jobs. Remittances are falling fast.',
    choices: [
      { label: 'Emergency support for returnees', hint: 'Cushions the blow', run: (fx) => { fx.cost(0.4); fx.approval(1); return 'Returning workers receive grants and retraining.'; } },
      { label: 'Seek new labour markets abroad', hint: 'Diplomatic effort', run: (fx) => { fx.mod('New labour deals', 18, { growth: 0.3 }); return 'New labour agreements are signed in other countries.'; } },
      { label: 'Build domestic jobs', hint: 'Slow but sovereign', run: (fx) => { fx.cost(0.2); fx.mod('Domestic jobs push', 12, { unemployment: -0.3 }); return 'Small enterprises are subsidised.'; } },
    ],
  },
  {
    id: 'megaProject', title: 'Landmark project proposed', icon: '🏗️', category: 'Development', cooldown: 36,
    weight: (s) => (s.confidence > 45 ? 0.5 : 0.1),
    text: (_s, c) => (c.id === 'nepal' ? 'Engineers propose a major hydropower dam and export transmission line.' : 'Planners propose a landmark high-speed rail and bridge project.'),
    choices: [
      { label: 'Fund it fully', hint: 'Big cost; big payoff over time', run: (fx) => { fx.project({ key: 'landmark', name: fx.c.id === 'nepal' ? 'Landmark dam & transmission line' : 'Landmark rail & bridge project', icon: '🏗️', desc: 'A flagship national project proposed by planners.', months: 36, foreign: false, costPct: 1.2, maintenance: 0.06, asset: { infrastructure: 4 }, mod: { growth: 0.1 } }); fx.approval(2); return 'Construction begins to fanfare.'; } },
      { label: 'Foreign-financed partnership', hint: 'Cheaper, but you share the profits', run: (fx) => { fx.project({ key: 'landmarkPpp', name: fx.c.id === 'nepal' ? 'Foreign-built dam & transmission line' : 'Foreign-built rail & bridge project', icon: '🏗️', desc: 'Built and operated by a foreign partner who shares the profits.', months: 48, foreign: true, costPct: 0.3, asset: { infrastructure: 2.5 }, mod: { revenuePct: -0.1, growth: 0.06 } }); fx.approval(1); return 'A foreign partner will build and operate it (it takes a construction slot).'; } },
      { label: 'Shelve it', hint: 'Keep the money', run: () => 'The proposal is filed away.' },
    ],
  },
  {
    id: 'sportsBid', title: 'Major sporting event bid', icon: '🏟️', category: 'Politics', cooldown: 60,
    weight: () => 0.25,
    text: () => 'The national federation urges you to bid to host a major international sporting event.',
    choices: [
      { label: 'Back the bid', hint: 'Prestige now, overruns later', run: (fx) => { fx.cost(0.5); fx.approval(3); fx.mod('Event tourism', 36, { growth: 0.15 }); fx.mod('Cost overruns', 36, { revenuePct: -0.1 }); return 'The nation celebrates. Budget overruns follow.'; } },
      { label: 'Decline', hint: 'Fiscal prudence', run: (fx) => { fx.approval(-1); return 'Fans are disappointed; accountants are not.'; } },
    ],
  },
  {
    id: 'preElection', title: 'Pre-election budget temptation', icon: '🗳️', category: 'Politics', cooldown: 40,
    weight: (s) => (s.monthsToElection >= 4 && s.monthsToElection <= 9 ? 4 : 0),
    text: () => 'With the election approaching, your advisers urge a "voter-friendly" budget. Others warn of a hangover.',
    choices: [
      { label: 'Giveaway budget', hint: 'Votes now, bills later', run: (fx) => { fx.cost(0.8); fx.approval(5); fx.mod('Spending hangover', 8, { inflation: 0.4 }); fx.mod('Fiscal concerns', 12, { confidence: -2 }); return 'Cash flows to voters; economists wince.'; } },
      { label: 'Permanent income-tax cut', hint: 'Popular; permanent revenue loss', run: (fx) => { fx.tax('incomeTax', -1.5); fx.approval(3); return 'You cut income tax by 1.5 points.'; } },
      { label: 'Stay prudent', hint: 'Boring and responsible', run: (fx) => { fx.confidence(2); fx.stability(1); return 'Markets approve. Pundits call you dull.'; } },
    ],
  },
  {
    id: 'green', title: 'Green transition opportunity', icon: '🌱', category: 'Development', cooldown: 48,
    weight: (_s, c) => (isC(c, 'germany', 'uk', 'canada', 'australia', 'japan') ? 0.5 : 0.15),
    text: () => 'Investors and activists are pressing for a bold energy transition programme.',
    choices: [
      { label: 'Ambitious green subsidies', hint: 'Costly, future-oriented', run: (fx) => { fx.cost(0.7); fx.mod('Green investment', 36, { growth: 0.2 }); fx.mod('Green premium', 12, { inflation: 0.2 }); fx.stock('infrastructure', 1.5); return 'Renewable projects launch across the country.'; } },
      { label: 'Carbon tax', hint: 'Raises revenue; unpopular', run: (fx) => { fx.mod('Carbon revenue', 60, { revenuePct: 0.3, growth: -0.15 }); fx.approval(-2); return 'A carbon price raises money and tempers.'; } },
      { label: 'Delay', hint: 'Avoid the cost', run: (fx) => { fx.approval(1); fx.confidence(-1); return 'Industry shrugs; activists protest.'; } },
    ],
  },
  {
    id: 'region', title: 'Regional demands', icon: '🗺️', category: 'Politics', cooldown: 36,
    weight: (_s, c) => (isC(c, 'nepal') ? 0.8 : isC(c, 'india', 'canada', 'uk') ? 0.5 : 0.15),
    text: (_s, c) => REGION[c.id] ?? 'Regional leaders are demanding more autonomy.',
    choices: [
      { label: 'Devolve more power', hint: 'Calms tension; costs coordination', run: (fx) => { fx.stability(3); fx.spend('administration', 0.2); fx.approval(-1); return 'Regions get more control and funding.'; } },
      { label: 'Refuse', hint: 'Central authority', run: (fx) => { fx.stability(-3); fx.approval(1); return 'The centre stands firm; tension rises.'; } },
      { label: 'Commission or referendum', hint: 'Roll the dice', run: (fx) => {
          if (fx.rnd() < 0.5) { fx.stability(2); return 'A negotiated settlement calms tempers.'; }
          fx.stability(-3); fx.approval(-1); return 'The process inflames divisions.';
        } },
    ],
  },
  {
    id: 'shutdown', title: 'Budget standoff in Congress', icon: '🏛️', category: 'Politics', cooldown: 24,
    weight: (_s, c) => (c.id === 'usa' ? 1.6 : 0),
    text: () => 'Congress is deadlocked on funding. Federal agencies will shut down unless a deal is reached.',
    choices: [
      { label: 'Cut a compromise deal', hint: 'Concessions required', run: (fx) => { fx.spend('defence', 0.2); fx.approval(-1); fx.stability(1); return 'A deal is struck, with extra defence funding as the price.'; } },
      { label: 'Hold firm', hint: 'Gamble on public blame', run: (fx) => {
          fx.mod('Shutdown', 2, { growth: -0.4 }); fx.confidence(-3); fx.stability(-3);
          if (fx.rnd() < 0.5) { fx.approval(2); return 'The other side blinks and you claim victory.'; }
          fx.approval(-3); return 'The public blames you for the shutdown.';
        } },
      { label: 'Executive orders', hint: 'Bypass Congress; legally shaky', run: (fx) => { fx.approval(-2); fx.stability(-2); fx.mod('Executive action', 6, { growth: 0.1 }); return 'Courts challenge your orders.'; } },
    ],
  },
  {
    id: 'autoJobs', title: 'Industrial job cuts', icon: '🚗', category: 'Economy', cooldown: 36,
    weight: (_s, c) => (c.id === 'germany' ? 1.2 : c.id === 'japan' ? 0.3 : 0.15),
    text: () => 'Leading carmakers and suppliers announce thousands of job cuts, citing energy costs and foreign competition.',
    choices: [
      { label: 'Rescue package', hint: 'Short-term jobs', run: (fx) => { fx.cost(0.5); fx.mod('Job protection', 12, { unemployment: -0.3 }); fx.approval(2); return 'Jobs are saved for now.'; } },
      { label: 'Retraining fund', hint: 'Invest in people', run: (fx) => { fx.cost(0.4); fx.stock('education', 2); fx.mod('Skills boost', 36, { growth: 0.1 }); return 'Workers are retrained for new sectors.'; } },
      { label: 'Let the market adjust', hint: 'Painful, but efficient', run: (fx) => { fx.mod('Industrial layoffs', 12, { unemployment: 0.5 }); fx.approval(-3); fx.stability(-1); return 'Layoffs proceed; regions affected are angry.'; } },
    ],
  },
  {
    id: 'globalDownturn', title: 'Global downturn', icon: '🌍', category: 'Economy', cooldown: 60,
    weight: () => 0.3,
    onShow: (fx) => { fx.s.globalCycle -= 1.8; },
    text: () => 'A worldwide slowdown is hitting trade and investment. Export orders are drying up.',
    choices: [
      { label: 'Coordinated stimulus', hint: 'Cushion at fiscal cost', run: (fx) => { fx.cost(0.7); fx.mod('Stimulus', 9, { growth: 0.6 }); return 'You join other governments in boosting demand.'; } },
      { label: 'Protect the budget', hint: 'Fiscal prudence', run: (fx) => { fx.confidence(2); fx.approval(-1); return 'You hold the line on spending.'; } },
    ],
  },
  {
    id: 'resources', title: 'Resource discovery', icon: '⛏️', category: 'Economy', cooldown: 72,
    weight: () => 0.25,
    text: () => 'Geologists report a large mineral and energy deposit. Who should develop it?',
    choices: [
      { label: 'State-owned development', hint: 'High cost; long-term revenue', run: (fx) => { fx.cost(0.8); fx.mod('State resource revenue', 120, { revenuePct: 0.3 }); fx.approval(1); return 'The state company will take years to deliver.'; } },
      { label: 'License to foreign firms', hint: 'Cash now; smaller share', run: (fx) => { fx.cost(-0.3); fx.mod('Royalties', 120, { revenuePct: 0.1 }); fx.confidence(3); return 'Foreign firms pay for the licence.'; } },
      { label: 'Conserve the site', hint: 'Protect nature, forgo revenue', run: (fx) => { fx.approval(1); return 'Environmentalists applaud.'; } },
    ],
  },
  {
    id: 'cyber', title: 'Cyberattack on government', icon: '💻', category: 'Security', cooldown: 36,
    weight: (_s, c) => (rich(c) ? 0.5 : 0.25),
    text: () => 'Hackers have crippled key government systems and leaked sensitive records.',
    choices: [
      { label: 'Create a national cyber agency', hint: 'Lasting protection', run: (fx) => { fx.cost(0.2); fx.stock('security', 3); fx.approval(1); return 'A new cyber agency is stood up.'; } },
      { label: 'Patch quietly', hint: 'Cheap; leaves exposure', run: (fx) => { fx.approval(-1); fx.stability(-1); return 'Fixes are rushed. Experts warn it will happen again.'; } },
      { label: 'Pay the ransom', hint: 'Fastest; encourages more attacks', run: (fx) => { fx.cost(0.05); fx.stability(-1); fx.flag('ransomPaid', 1); return 'The systems are released. Attackers are emboldened.'; } },
    ],
  },
];

const weakPartner = (s: GameState) => s.pol.coalition.filter((id) => id !== s.pol.pmParty).map((id) => ({ id, sat: s.pol.parties[id].sat })).sort((a, b) => a.sat - b.sat)[0] ?? { id: s.pol.pmParty, sat: 100 };
function worstMinister(s: GameState) {
  return Object.values(s.pol.cabinet).filter((m): m is NonNullable<typeof m> => !!m).sort((a, b) => a.comp - b.comp)[0];
}
const bumpPartners = (s: GameState, d: number) => s.pol.coalition.forEach((id) => { if (id !== s.pol.pmParty) s.pol.parties[id].sat = Math.min(100, s.pol.parties[id].sat + d); });
EVENTS.push(
  {
    id: 'noConfidence', title: 'No-confidence motion', icon: '🗳️', category: 'Parliament', cooldown: 10,
    weight: () => 0,
    text: (s) => `The opposition has tabled a motion of no confidence. Your coalition commands ${coalSeats(s)} of ${totalSeats(s)} seats${s.pol.minority ? ' (a minority government)' : ''}, and ${s.pol.coalition.length > 1 ? 'your partners are wavering' : 'your own MPs are restless'}. The vote is tomorrow.`,
    choices: [
      { label: 'Whip your MPs and woo partners', hint: 'Costs a little approval; partners calm down', run: (fx) => { fx.approval(-1); bumpPartners(fx.s, 12); const v = confidenceVote(fx.s, fx.rnd); if (v.won) { fx.stability(3); return `You survive the vote ${v.yes} to ${v.no}.`; } fallOfGovernment(fx.s); return `The government falls ${v.no} to ${v.yes}. A snap election is called.`; } },
      { label: 'Buy support with concessions', hint: 'Costs 0.3% of GDP; partners are happier', run: (fx) => { fx.cost(0.3); bumpPartners(fx.s, 22); fx.approval(-0.5); const v = confidenceVote(fx.s, fx.rnd); if (v.won) { fx.stability(2); return `Concessions win the day, ${v.yes} to ${v.no}.`; } fallOfGovernment(fx.s); return `Even concessions were not enough: ${v.no} to ${v.yes}. A snap election follows.`; } },
      { label: 'Call a snap election', hint: 'Go to the voters now', run: (fx) => { fx.s.monthsToElection = 1; fx.s.flags.snap = 1; fx.stability(-1); return 'You ask for dissolution. Voters will decide next month.'; } },
      { label: 'Face the vote', hint: 'No deals, no drama', run: (fx) => { const v = confidenceVote(fx.s, fx.rnd); if (v.won) { fx.stability(2); fx.approval(1); return `Confidence is carried ${v.yes} to ${v.no}.`; } fallOfGovernment(fx.s); return `You lose ${v.no} to ${v.yes}. Parliament is dissolved.`; } },
    ],
  },
  {
    id: 'coalitionCrisis', title: 'Coalition partner ultimatum', icon: '🤝', category: 'Parliament', cooldown: 14,
    weight: (s) => (s.pol.inGovernment && s.pol.coalition.length > 1 && (weakPartner(s)?.sat ?? 100) < 32 ? 6 : 0),
    text: (s) => { const w = weakPartner(s); return `${pdef(s, w.id).name} (${pdef(s, w.id).short}) is furious with the government's direction and threatens to walk out of the coalition unless something changes.`; },
    choices: [
      { label: 'Give them a policy win', hint: 'Shifts policy toward their agenda (cost 0.2% GDP)', run: (fx) => { const w = weakPartner(fx.s); const left = pdef(fx.s, w.id).econ < 0; fx.cost(0.2); if (left) fx.spend('welfare', 0.3); else fx.tax('incomeTax', -0.5); fx.s.pol.parties[w.id].sat = Math.min(100, w.sat + 28); fx.approval(-0.5); return 'A package is agreed. The partner stays - for now.'; } },
      { label: 'Offer an extra ministry', hint: 'Hands them influence', run: (fx) => { const w = weakPartner(fx.s); const post = Object.keys(fx.s.pol.cabinet).find((p) => fx.s.pol.cabinet[p]?.party === fx.s.pol.playerParty && p !== 'finance'); if (post) fx.s.pol.cabinet[post] = genMinister(sysOf(fx.s), post, w.id, fx.rnd); fx.s.pol.parties[w.id].sat = Math.min(100, w.sat + 24); return 'Another ministry goes to your partner. They stop shouting.'; } },
      { label: 'Call their bluff', hint: 'Risky: they may leave', run: (fx) => { const w = weakPartner(fx.s); if (fx.rnd() < 0.55) { fx.s.pol.parties[w.id].sat = Math.min(100, w.sat + 15); fx.stability(1); return 'They blink. Your authority grows.'; } fx.s.pol.parties[w.id].sat = 4; fx.stability(-2); return 'They storm out of the coalition. You must manage without them.'; } },
    ],
  },
  {
    id: 'ministerScandal', title: 'Minister in trouble', icon: '📰', category: 'Cabinet', cooldown: 18,
    weight: (s) => (s.pol.inGovernment ? 0.35 + 0.8 * Object.values(s.pol.cabinet).filter((m) => m && m.comp < 40).length : 0),
    text: (s) => { const m = worstMinister(s); return m ? `Newspapers allege that ${m.name}, your ${POSTS.find((p) => p.id === m.post)?.label} minister, misused public funds. The opposition demands a resignation.` : 'A minister is in the headlines for the wrong reasons.'; },
    choices: [
      { label: 'Demand their resignation', hint: 'Clean, but you lose a minister', run: (fx) => { const m = worstMinister(fx.s); if (m) { fx.s.pol.cabinet[m.post] = { ...genMinister(sysOf(fx.s), m.post, m.party, fx.rnd), comp: 45, rep: 45, perf: 45 }; if (m.party !== fx.s.pol.playerParty) fx.s.pol.parties[m.party].sat -= 8; } fx.approval(1); fx.stability(1); return 'The minister quits; a caretaker takes over.'; } },
      { label: 'Stand by the minister', hint: 'Might blow over - or blow up', run: (fx) => { if (fx.rnd() < 0.45) { fx.approval(-1); return 'The story dies down.'; } fx.approval(-4); fx.stability(-2); fx.mod('Scandal fallout', 5, { approval: -1.5 }); return 'New revelations emerge. Voters are not amused.'; } },
      { label: 'Order an independent inquiry', hint: 'Slow but credible', run: (fx) => { fx.approval(0.5); fx.confidence(1); fx.cost(0.02); return 'An inquiry is launched. The story moves on.'; } },
    ],
  },
  {
    id: 'leadershipChallenge', title: 'Rebellion in your own party', icon: '⚔️', category: 'Parliament', cooldown: 30,
    weight: (s) => (s.pol.inGovernment && s.approval < 36 && s.monthsInOffice > 12 ? 3 : 0),
    text: () => 'Poor polls have convinced a faction of your own MPs that you should be replaced. Rumours of a leadership challenge swirl.',
    choices: [
      { label: 'Confront the rebels', hint: 'Win and you are strengthened', run: (fx) => { if (fx.rnd() < 0.6) { fx.stability(3); fx.approval(2); return 'You crush the challenge and tighten your grip.'; } fx.stability(-5); fx.approval(-3); fx.mod('Party civil war', 8, { stability: -2 }); return 'The challenge is narrowly survived, but your party is split.'; } },
      { label: 'Offer rebels cabinet posts', hint: 'Expensive peace', run: (fx) => { fx.approval(-1); fx.stability(2); fx.cost(0.05); return 'Ambitious MPs are appointed ministers; the plotting stops.'; } },
      { label: 'Ignore it', hint: 'Hope it fades', run: (fx) => { fx.stability(-2); fx.approval(-1); return 'The briefing against you continues.'; } },
    ],
  },
);



const nm = (id: string) => getNation(id)?.name ?? id;
const bigPartner = (s: GameState) => topPartner(s);
EVENTS.push(
  {
    id: 'borderIncident', title: 'Border incident', icon: '🚧', category: 'Diplomacy', cooldown: 24,
    weight: (s) => (s.dip && s.pol.inGovernment && rivalNation(s) && s.dip.nations[rivalNation(s)!].rel < 42 ? 4 * (s.difficulty.pressure ?? 1) : 0),
    text: (s) => `A confrontation with ${nm(rivalNation(s)!)} on the frontier has left soldiers injured. Newspapers demand a response, while diplomats urge calm.`,
    choices: [
      { label: 'Respond firmly', hint: 'Show strength: approval up, relations down, cost 0.1% GDP', run: (fx) => { const r = rivalNation(fx.s)!; fx.s.dip.nations[r].rel = Math.max(2, fx.s.dip.nations[r].rel - 8); fx.approval(2); fx.cost(0.1); fx.stability(-1); return 'Troops are reinforced. Rhetoric hardens.'; } },
      { label: 'Negotiate quietly', hint: 'Relations recover; critics call you weak', run: (fx) => { const r = rivalNation(fx.s)!; fx.s.dip.nations[r].rel = Math.min(98, fx.s.dip.nations[r].rel + 5); fx.approval(-1.5); fx.stability(1); return 'A hotline is set up and the patrols pull back.'; } },
      { label: 'Call on allies and the UN', hint: 'Slow, but wins sympathy', available: (s) => Object.values(s.dip.nations).some((n) => n.ally), run: (fx) => { fx.approval(0.5); fx.confidence(1); return 'Allies issue a joint statement. The tension eases.'; } },
    ],
  },
  {
    id: 'tradeWar', title: 'Trade war threat', icon: '📦', category: 'Diplomacy', cooldown: 30,
    weight: (s) => (s.dip && s.dip.nations[bigPartner(s)] && s.dip.nations[bigPartner(s)].rel < 55 && s.pol.inGovernment ? 4 * (s.difficulty.pressure ?? 1) : 0),
    text: (s) => `${nm(bigPartner(s))}, your biggest trading partner, threatens heavy tariffs on your exports unless you open your markets further.`,
    choices: [
      { label: 'Retaliate with tariffs', hint: 'Exports and imports both shrink for a while', run: (fx) => { fx.s.dip.nations[bigPartner(fx.s)].rel -= 8; fx.mod('Trade war losses', 12, { growth: -0.25 }); fx.s.eco.exportsPct -= 0.5; fx.approval(1); return 'A tit-for-tat tariff spiral begins.'; } },
      { label: 'Offer concessions', hint: 'Cost 0.15% GDP; relations improve', run: (fx) => { fx.s.dip.nations[bigPartner(fx.s)].rel = Math.min(98, fx.s.dip.nations[bigPartner(fx.s)].rel + 8); fx.cost(0.15); fx.approval(-1); return 'A deal is struck; some of your industries grumble.'; } },
      { label: 'File a WTO complaint', hint: 'Slow but principled', run: (fx) => { fx.confidence(1.5); fx.mod('Tariff uncertainty', 6, { growth: -0.1 }); return 'The case drags on; markets welcome your stance.'; } },
    ],
  },
  {
    id: 'sanctionsOnYou', title: 'Sanctions threat', icon: '⛔', category: 'Diplomacy', cooldown: 36,
    weight: (s) => (s.dip && Object.keys(s.dip.nations).some((k) => s.dip.nations[k].rel < 28 && getNation(k).size > 4 && !s.dip.nations[k].sanctionsYou) && s.pol.inGovernment ? 3 * (s.difficulty.pressure ?? 1) : 0),
    text: (s) => { const k = Object.keys(s.dip.nations).filter((x) => getNation(x).size > 4).sort((a, b) => s.dip.nations[a].rel - s.dip.nations[b].rel)[0]; return `${nm(k)} warns it will impose sanctions on your country over the deteriorating relationship.`; },
    choices: [
      { label: 'Appease', hint: 'Cost 0.2% GDP; relations recover', run: (fx) => { const k = Object.keys(fx.s.dip.nations).filter((x) => getNation(x).size > 4).sort((a, b) => fx.s.dip.nations[a].rel - fx.s.dip.nations[b].rel)[0]; fx.s.dip.nations[k].rel += 14; fx.cost(0.2); fx.approval(-1.5); return 'A face-saving package heads off the sanctions.'; } },
      { label: 'Stand firm', hint: 'Sanctions may follow', run: (fx) => { const k = Object.keys(fx.s.dip.nations).filter((x) => getNation(x).size > 4).sort((a, b) => fx.s.dip.nations[a].rel - fx.s.dip.nations[b].rel)[0]; fx.approval(2); if (fx.rnd() < 0.6) { fx.s.dip.nations[k].sanctionsYou = true; fx.confidence(-3); return 'The sanctions are imposed. Exporters feel it.'; } return 'The threat fades; your defiance plays well at home.'; } },
    ],
  },
  {
    id: 'summitInvite', title: 'Summit invitation', icon: '🤝', category: 'Diplomacy', cooldown: 20,
    weight: (s) => (s.dip && Object.values(s.dip.nations).some((n) => n.rel > 66) && s.pol.inGovernment ? 3 : 0),
    text: (s) => { const k = Object.keys(s.dip.nations).sort((a, b) => s.dip.nations[b].rel - s.dip.nations[a].rel)[0]; return `${nm(k)} invites you to a state visit with business leaders in tow.`; },
    choices: [
      { label: 'Go with a business delegation', hint: 'Investment pledges; costs a little', run: (fx) => { const k = Object.keys(fx.s.dip.nations).sort((a, b) => fx.s.dip.nations[b].rel - fx.s.dip.nations[a].rel)[0]; fx.s.dip.nations[k].rel = Math.min(98, fx.s.dip.nations[k].rel + 7); fx.cost(0.03); fx.confidence(2); fx.approval(1); fx.s.eco.fdiPct += 0.2; return 'Deals worth billions are announced.'; } },
      { label: 'Send the foreign minister', hint: 'Cheap, polite', run: (fx) => { fx.confidence(0.5); return 'The visit passes without incident.'; } },
    ],
  },
  {
    id: 'globalCrisis', title: 'Distant war shakes the world', icon: '🌍', category: 'Diplomacy', cooldown: 48,
    weight: (s) => (s.dip && s.pol.inGovernment ? 1.2 : 0),
    text: () => 'A war far away disrupts energy and grain markets. Great powers demand that countries pick sides, and prices are spiking.',
    choices: [
      { label: 'Join Western sanctions', hint: 'Western ties warm; Russia and China cool', run: (fx) => { ['usa', 'eu', 'uk', 'japan', 'canada', 'australia'].forEach((k) => { if (fx.s.dip.nations[k]) fx.s.dip.nations[k].rel = Math.min(98, fx.s.dip.nations[k].rel + 4); }); if (fx.s.dip.nations.russia) fx.s.dip.nations.russia.rel -= 10; fx.inflation(0.8); fx.mod('Energy price shock', 10, { growth: -0.2 }); return 'You stand with partners; energy bills climb.'; } },
      { label: 'Stay neutral', hint: 'Keeps options open; prices still hurt', run: (fx) => { fx.inflation(0.5); fx.mod('Energy price shock', 8, { growth: -0.15 }); fx.confidence(-1); return 'Neither camp is delighted.'; } },
      { label: 'Cushion households', hint: 'Cost 0.4% GDP; approval holds', run: (fx) => { fx.cost(0.4); fx.approval(1); fx.mod('Energy price shock', 6, { growth: -0.1 }); return 'Subsidies keep bills down - at a price.'; } },
    ],
  },
);

EVENTS.push(...OPPORTUNITY_EVENTS);
EVENTS.push(...SOCIETY_EVENTS);
EVENTS.push(...FACTION_EVENTS);
EVENTS.push(...REGION_EVENTS);
const BY_ID = new Map(EVENTS.map((e) => [e.id, e]));
export const getEvent = (id: string): EventDef | undefined => BY_ID.get(id);

export function availableChoices(def: EventDef, s: GameState, c: CountryDef): ChoiceDef[] {
  return def.choices.filter((ch) => !ch.available || ch.available(s, c));
}

/** Chooses an event for this month (or none). Pure with respect to s except via rnd. */
export function drawEvent(s: GameState, c: CountryDef, rnd: () => number): string | null {
  let total = 0;
  const weights: [EventDef, number][] = [];
  for (const e of EVENTS) {
    if ((s.cooldowns[e.id] ?? 0) > 0) continue;
    // fast-forward is calmer: routine events are much rarer, crises less so (elections and decisions still stop it)
    const w = Math.max(0, e.weight(s, c)) * (s.flags.ff && e.category !== 'Crisis' ? 0.15 : 0.6);
    if (w > 0) { weights.push([e, w]); total += w; }
  }
  if (total <= 0) return null;
  const p = 1 - Math.exp(-0.05 * total * s.difficulty.crisis);
  if (rnd() > p) return null;
  let r = rnd() * total;
  for (const [e, w] of weights) { r -= w; if (r <= 0) return e.id; }
  return weights[weights.length - 1][0].id;
}
