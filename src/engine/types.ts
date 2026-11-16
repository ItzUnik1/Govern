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
  pressure: number; // 0.5..1.5  international pressure: rivals, lenders and sanctions
  start: number; // 0.5..1.5  how bad the inherited national conditions are
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

export interface EcoState {
  sectors: Record<string, { share: number; growth: number }>;
  exportsPct: number; importsPct: number; caPct: number; otherCA: number;
  fdiPct: number; reservesMonths: number; gini: number; priceIdx: number;
  assetBonus: Record<StockKey, number>;
  exportBoost: number;
  sectorBoost: Record<string, number>;
}

export interface ProjectState {
  id: string;
  status: 'building' | 'paused' | 'complete';
  startTurn: number;
  progress: number; // 0..100
  spent: number; // USD bn so far
  budget: number; // USD bn planned
  plannedMonths: number;
  delayMonths: number;
  overrunPct: number;
  monthlySpend: number; // USD bn at the current pace
  completedTurn: number | null;
  log: string[];
  /** Set for projects created by events (e.g. foreign-built factories); not in the PROJECTS catalogue. */
  custom?: { name: string; icon: string; desc: string; maintenance: number; foreign: boolean; asset?: Partial<Record<StockKey, number>>; mod?: Record<string, number>; exportBoost?: number; sector?: Record<string, number> };
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
  gdppc?: number; xPct?: number; mPct?: number; tbPct?: number; fdi?: number; resM?: number; gini?: number; hdi?: number;
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
  kind?: 'general' | 'midterm';
  shares?: Record<string, number>;
  seats?: Record<string, number>;
  pm?: string;
  coalition?: string[];
  ev?: Record<string, number>;
}

export interface Minister { id: string; name: string; post: string; party: string; comp: number; rep: number; perf: number; months: number }
export interface PartyState { seats: number; share: number; sat: number }
export interface RegionResult { id: string; name: string; shares: Record<string, number>; seats: Record<string, number> }
export interface PromiseState { id: string; madeTurn: number; base: Record<string, number> }
export interface FormationState {
  /** parties the player may invite (id -> ask in cabinet posts) */
  ask: Record<string, number>;
  seatsTotal: number;
  note: string;
}
export interface PoliticsState {
  playerParty: string;
  inGovernment: boolean;
  pmParty: string;
  coalition: string[];
  minority: boolean;
  tenure: number; // consecutive election wins of the governing party
  defeats: number; // consecutive election defeats of the player's party
  parties: Record<string, PartyState>;
  regional: RegionResult[];
  cabinet: Record<string, Minister | null>;
  pool: Record<string, Minister[]>;
  passed: string[];
  failedAt: Record<string, number>;
  bill: { id: string; lobbied: boolean; turn: number } | null;
  billCooldown: number;
  promises: PromiseState[];
  promiseLog: { label: string; kept: boolean }[];
  campaign: number; // national campaign points (decay)
  campaignRegion: Record<string, number>;
  pending: 'formation' | null;
  formation: FormationState | null;
  lastGovernmentChange: string | null;
  midtermIn: number; // months until midterm (presidential systems), 0 = none
  houseTilt: number;
}

export interface NationState { rel: number; trade: 0 | 1 | 2; negotiating: number; sanctionedByYou: boolean; sanctionsYou: boolean; ally: boolean }
export interface LoanState { id: string; lender: string; amount: number; remaining: number; ratePct: number; monthsLeft: number }
export interface DiploState {
  nations: Record<string, NationState>;
  orgs: Record<string, boolean>;
  loans: LoanState[];
  influence: number;
  log: string[];
}
export interface Offer { id: number; nation: string; kind: 'trade' | 'alliance' | 'aid' | 'demand' | 'summit'; text: string; target?: string; turn: number; expires: number }
export interface AIState {
  nations: Record<string, { mood: number; lastAct: number }>;
  offers: Offer[];
  opp: { momentum: number; lastMove: string; lastTurn: number };
  news: string[];
  nextId: number;
}
export type NewsCat = 'national' | 'economy' | 'world' | 'opposition' | 'public' | 'message';
export interface NewsItem { id: number; turn: number; y: number; m: number; cat: NewsCat; tone: 'good' | 'bad' | 'neutral'; head: string; body?: string; from?: string; unread: boolean; link?: { tab: string; sub?: string } }
export interface NewsState {
  items: NewsItem[]; nextId: number; lastTax: Record<string, number>; lastSpend: Record<string, number>;
  seenOffers: number[]; seenAiNews: string[]; lastOppTurn: number; seenEvents: number; seenBills: number; lastAdvice: Record<string, number>; lastPartner: number;
}
export interface ResearchState { budgetPct: number; progress: Record<string, number>; current: string | null; queue: string | null; done: string[] }

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

  eco: EcoState;
  projects: ProjectState[];
  pol: PoliticsState;
  dip: DiploState;
  ai: AIState;
  news: NewsState;
  res: ResearchState;
}

export interface Fiscal {
  revenuePct: number;
  taxLines: { key: string; label: string; pct: number }[];
  spendPct: number; // program spending + running costs of standing policies
  programCostPct: number;
  interestPct: number;
  /** Automatic unemployment-related costs (% of GDP); negative when jobs are plentiful. */
  stabiliserPct: number;
  /** Pension and health costs created by an ageing population (% of GDP). */
  ageingPct: number;
  /** Balance before interest (% of GDP; positive = deficit). */
  primaryDeficitPct: number;
  deficitPct: number;
  revenueM: number;
  spendingM: number;
  interestM: number;
  balanceM: number;
  capBreach: boolean;
}
