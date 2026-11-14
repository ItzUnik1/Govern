// Core type definitions for GOVERN. Everything in GameState is plain JSON (saveable).

export type TaxKey = 'incomeTax' | 'corpTax' | 'vat';
export type SpendKey = 'education' | 'health' | 'infrastructure' | 'defence' | 'welfare' | 'administration';
export type StockKey = 'education' | 'health' | 'infrastructure' | 'security' | 'efficiency';

export interface Difficulty {
  preset: 'relaxed' | 'standard' | 'hard' | 'custom';
  economy: number; // 0.5..1.5  shock size & economic volatility
  stability: number; // 0.5..1.5  how fragile politics is
  election: number; // 0.5..1.5  how competitive the opposition is
  crisis: number; // 0.5..1.5  how often events fire
}

export interface Modifier {
  id: string;
  label: string;
  monthsLeft: number;
  // values are *target shifts* while active
  growth?: number; // pp annual real growth
  inflation?: number; // pp annual inflation pressure
  unemployment?: number; // pp unemployment target shift
  approval?: number; // approval target shift
  stability?: number; // stability target shift
  confidence?: number; // investment-confidence target shift
  revenuePct?: number; // pp of GDP (annual) revenue (negative = cost)
}

export interface CountryDef {
  id: string;
  name: string;
  flag: string;
  title: string; // head of government title
  government: string; // short constitutional description
  constitution: string;
  history: string;
  challenges: string[];
  strengths: string[];
  resources: string[];
  devLevel: string;
  difficultyStars: number; // 1..5
  partyName: string;
  opposition: string;
  relationships: string;

  population: number; // millions
  gdp: number; // USD bn nominal
  potentialGrowth: number;
  popGrowth: number;
  inflationTarget: number;
  inflation0: number;
  unemployment0: number;
  naturalUnemployment: number;
  debtPct0: number;
  deficitPct0: number;
  rev0: number; // revenue % GDP
  tax0: Record<TaxKey, number>;
  revShare: { incomeTax: number; corpTax: number; vat: number; other: number };
  spend0: Record<Exclude<SpendKey, 'administration'>, number>; // administration is the residual
  stock0: Record<StockKey, number>;
  policyRate0: number;
  neutralRate: number;
  rateFloor: number;
  premium0: number;
  avgCost0: number;
  debtTolerance: number; // 0..1 domestic/reserve demand for the debt
  openness: number;
  commodityExports: number;
  fuelImports: number;
  remittances: number; // % GDP
  aid: number; // % GDP (included in rev0 'other')
  disasterRisk: number;
  catchUp: number; // returns multiplier on productive spending
  infraMult: number;
  agingDrag: number; // pp growth drag already in potential; also welfare creep
  approval0: number;
  stability0: number;
  fragmentation: number; // 0..1
  polarisation: number; // 0..1
  termYears: number;
  monthsToElection0: number;
  maxTerms: number | null;
  turnout: number;
  deficitCap: number | null; // constitutional structural deficit cap % GDP
  reserveCurrency: number; // 0..1
}

export interface HistoryPoint {
  y: number;
  m: number;
  gdp: number;
  growth: number;
  inflation: number;
  unemployment: number;
  debtPct: number;
  balancePct: number;
  approval: number;
  stability: number;
  confidence: number;
  currency: number;
  rate: number;
  livingStd: number;
}

export interface ReportDelta {
  label: string;
  from: number;
  to: number;
  unit: string;
  goodWhenUp: boolean | null;
  digits: number;
}

export interface MonthReport {
  y: number;
  m: number;
  deltas: ReportDelta[];
  notes: string[];
}

export interface EventRecord {
  y: number;
  m: number;
  id: string;
  title: string;
  choice: string;
  outcome: string;
}

export interface ElectionRecord {
  y: number;
  m: number;
  term: number;
  approval: number;
  voteShare: number;
  turnout: number;
  won: boolean;
  note: string;
}

export interface GameOver {
  kind: 'lost' | 'retired' | 'resigned';
  title: string;
  text: string;
}

export interface GameState {
  v: number;
  countryId: string;
  leader: string;
  y: number;
  m: number; // 0..11
  turn: number;
  seed: number;
  difficulty: Difficulty;

  population: number;
  gdp: number;
  realIdx: number;
  growth: number;
  inflation: number;
  unemployment: number;
  debt: number;
  policyRate: number;
  avgCost: number;
  currency: number;
  confidence: number;
  livingStd: number;
  defAvg: number;
  commodity: number;
  globalCycle: number;

  revenueM: number; // last month, USD bn
  spendingM: number;
  interestM: number;

  stocks: Record<StockKey, number>;
  tax: Record<TaxKey, number>;
  spend: Record<SpendKey, number>;
  programs: Record<string, boolean>;
  prevPolicy: number[];
  lastVat: number;
  pendingCosts: number;

  approval: number;
  stability: number;
  monthsInOffice: number;
  monthsToElection: number;
  term: number;
  electionsWon: number;
  brakeBreachMonths: number;

  modifiers: Modifier[];
  cooldowns: Record<string, number>;
  eventCounts: Record<string, number>;
  flags: Record<string, number>;
  pendingEvent: string | null;
  lastEventOutcome: string | null;
  lastElection: ElectionRecord | null;
  gameOver: GameOver | null;

  history: HistoryPoint[];
  lastReport: MonthReport | null;
  reports: MonthReport[];
  eventHistory: EventRecord[];
  electionHistory: ElectionRecord[];
}

export interface Fiscal {
  revenuePct: number;
  taxLines: { key: string; label: string; pct: number }[];
  spendPct: number; // program spending + running costs of standing policies
  programCostPct: number;
  interestPct: number;
  deficitPct: number;
  revenueM: number;
  spendingM: number;
  interestM: number;
  balanceM: number;
  capBreach: boolean;
}
