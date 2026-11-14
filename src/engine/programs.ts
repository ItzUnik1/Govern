// Standing policies (toggle on/off, ongoing cost) and one-off executive actions.
export interface ProgramDef {
  id: string;
  name: string;
  desc: string;
  costPct: number; // % of GDP per year while enacted
  upside: string;
  downside: string;
}

export const PROGRAMS: ProgramDef[] = [
  {
    id: 'subsidies', name: 'Fuel & food subsidies',
    desc: 'Cap the price of fuel, cooking gas and staple foods.',
    costPct: 0.8,
    upside: 'Holds down inflation, popular with voters',
    downside: 'Costs more when commodity prices spike; distorts markets (-0.1 growth)',
  },
  {
    id: 'investHoliday', name: 'Investment tax holiday',
    desc: 'Exempt new investment from taxes for a few years.',
    costPct: 0.3,
    upside: 'Investor confidence +6, growth +0.15',
    downside: 'Lost revenue; no direct benefit to voters',
  },
  {
    id: 'jobsGuarantee', name: 'Public works jobs scheme',
    desc: 'Guarantee paid work on local projects for the unemployed.',
    costPct: 0.7,
    upside: 'Lowers unemployment ~0.8 pts, builds local goodwill',
    downside: 'Adds some inflation pressure; low-productivity work',
  },
  {
    id: 'exportPush', name: 'Export promotion agency',
    desc: 'Trade missions, export credit and market-access support.',
    costPct: 0.3,
    upside: 'More growth in open economies, firmer currency',
    downside: 'Little effect in closed economies',
  },
  {
    id: 'anticorruption', name: 'Anti-corruption commission',
    desc: 'Independent body with powers to investigate officials.',
    costPct: 0.2,
    upside: 'Government efficiency rises, stability +1.5, fewer scandals',
    downside: 'Annoys entrenched interests (approval -0.3); slow to bite',
  },
];

export interface ActionDef {
  id: string;
  name: string;
  desc: string;
  costPct: number; // one-off, % of annual GDP
  cooldown: number; // months
  effect: string;
  onlyBeforeElection?: number; // available only within N months of an election
}

export const ACTIONS: ActionDef[] = [
  {
    id: 'address', name: 'Address the nation',
    desc: 'A televised address making your case to the public.',
    costPct: 0.02, cooldown: 4, effect: 'Approval +3, less each time you repeat it',
  },
  {
    id: 'stimulus', name: 'Stimulus payments',
    desc: 'One-off cash payments to households to boost spending.',
    costPct: 0.8, cooldown: 12,
    effect: 'Growth +0.9 and inflation +0.5 for 6 months, approval +2',
  },
  {
    id: 'roadshow', name: 'Investor roadshow',
    desc: 'Tour financial centres promoting your country.',
    costPct: 0.05, cooldown: 12, effect: 'Investor confidence +6 for a year',
  },
  {
    id: 'campaign', name: 'Campaign tour',
    desc: 'Barnstorm the country ahead of the election.',
    costPct: 0.05, cooldown: 2, effect: 'Approval +4, less each time you repeat it',
    onlyBeforeElection: 8,
  },
];
