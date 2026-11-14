// Fictional political systems for the 8 playable countries.
// Parties are FICTIONAL (inspired by real ideological families) so the game makes no claims about real parties.
// econ: -1 left (state/redistribution) .. +1 right (market/low tax). social: -1 liberal .. +1 conservative.
// base = vote share (%) when the electorate is neutral. Seat systems follow each country's real electoral family.

export type BlocId = 'youth' | 'workers' | 'middle' | 'business' | 'rural' | 'seniors';

export const BLOCS: { id: BlocId; label: string; icon: string; cares: string }[] = [
  { id: 'youth', label: 'Young voters', icon: '🎓', cares: 'Jobs, education, prices' },
  { id: 'workers', label: 'Working class', icon: '🛠️', cares: 'Jobs, inflation, welfare' },
  { id: 'middle', label: 'Middle class', icon: '🏡', cares: 'Taxes, services, growth' },
  { id: 'business', label: 'Business owners', icon: '💼', cares: 'Corporate tax, confidence' },
  { id: 'rural', label: 'Rural & farmers', icon: '🌾', cares: 'Infrastructure, prices, subsidies' },
  { id: 'seniors', label: 'Older voters', icon: '👵', cares: 'Pensions, health, stability' },
];

export interface PartyDef {
  id: string; name: string; short: string; color: string;
  econ: number; social: number; base: number;
  protest?: number; // gains from discontent
  regions?: string[]; // regional party: only competes in these regions
  pariah?: boolean; // other parties refuse coalition with it
  blurb: string;
}
export interface RegionDef { id: string; name: string; seatShare: number; urban: number; cons: number }
export interface SystemDef {
  countryId: string; chamber: string; seats: number;
  kind: 'fptp' | 'pr' | 'mixed' | 'preferential';
  fptpSeats?: number; threshold: number; presidential: boolean; compulsory?: boolean;
  electionNote: string;
  parties: PartyDef[]; regions: RegionDef[]; blocs: Record<BlocId, number>;
  leadable: string[]; names: { first: string[]; last: string[] };
}

const dev: Record<BlocId, number> = { youth: 0.24, workers: 0.22, middle: 0.10, business: 0.06, rural: 0.30, seniors: 0.08 };
const rich: Record<BlocId, number> = { youth: 0.15, workers: 0.22, middle: 0.26, business: 0.10, rural: 0.10, seniors: 0.17 };

export const SYSTEMS: Record<string, SystemDef> = {
  nepal: {
    countryId: 'nepal', chamber: 'House of Representatives', seats: 275, kind: 'mixed', fptpSeats: 165, threshold: 3, presidential: false,
    electionNote: '165 seats by first-past-the-post, 110 by proportional list (3% threshold).',
    blocs: dev, leadable: ['nep_dem', 'nep_com'],
    names: { first: ['Ram', 'Sita', 'Hari', 'Gita', 'Bishnu', 'Maya', 'Prakash', 'Kamala', 'Suresh', 'Anita'], last: ['Sharma', 'Thapa', 'Gurung', 'Rai', 'Karki', 'Adhikari', 'Shrestha', 'Poudel', 'Yadav', 'Tamang'] },
    regions: [
      { id: 'valley', name: 'Kathmandu Valley', seatShare: 0.08, urban: 0.9, cons: 0.35 },
      { id: 'east', name: 'Eastern Hills', seatShare: 0.22, urban: 0.35, cons: 0.5 },
      { id: 'madhesh', name: 'Madhesh Plains', seatShare: 0.25, urban: 0.4, cons: 0.55 },
      { id: 'west', name: 'Western Hills', seatShare: 0.25, urban: 0.3, cons: 0.6 },
      { id: 'farwest', name: 'Far-West & Karnali', seatShare: 0.20, urban: 0.2, cons: 0.65 },
    ],
    parties: [
      { id: 'nep_dem', name: 'Himali Democratic Party', short: 'HDP', color: '#4f8cff', econ: -0.1, social: 0.0, base: 24, blurb: 'Centrist social democrats; the old establishment of the republic.' },
      { id: 'nep_com', name: 'United Communist Front', short: 'UCF', color: '#ff6b6b', econ: -0.7, social: 0.2, base: 26, blurb: 'Left-wing party with strong rural organisation.' },
      { id: 'nep_mao', name: 'People’s Revolutionary Front', short: 'PRF', color: '#c0392b', econ: -0.85, social: 0.0, base: 10, blurb: 'Former insurgents turned radical-left party.' },
      { id: 'nep_nat', name: 'Nepal Heritage Party', short: 'NHP', color: '#f5b84b', econ: 0.5, social: 0.8, base: 8, blurb: 'Traditionalist, nationalist and religious right.' },
      { id: 'nep_new', name: 'Civic Renewal Movement', short: 'CRM', color: '#34c88a', econ: 0.1, social: -0.6, base: 14, protest: 1.0, blurb: 'Young anti-establishment reformers.' },
      { id: 'nep_mad', name: 'Madhesh People’s Alliance', short: 'MPA', color: '#b48cff', econ: -0.2, social: -0.1, base: 10, regions: ['madhesh'], blurb: 'Regional party of the southern plains.' },
      { id: 'nep_oth', name: 'Independents & Minor Parties', short: 'OTH', color: '#8d9bb8', econ: 0, social: 0, base: 8, protest: 0.6, blurb: 'A scatter of small parties.' },
    ],
  },
  india: {
    countryId: 'india', chamber: 'Lok Sabha', seats: 543, kind: 'fptp', threshold: 0, presidential: false,
    electionNote: '543 single-member constituencies, first-past-the-post.',
    blocs: dev, leadable: ['ind_nat', 'ind_con'],
    names: { first: ['Arjun', 'Priya', 'Rohan', 'Anita', 'Vikram', 'Meera', 'Sanjay', 'Kavita', 'Amit', 'Neha'], last: ['Sharma', 'Patel', 'Reddy', 'Singh', 'Iyer', 'Das', 'Khan', 'Nair', 'Gupta', 'Mehta'] },
    regions: [
      { id: 'north', name: 'Northern Heartland', seatShare: 0.29, urban: 0.3, cons: 0.7 },
      { id: 'south', name: 'Southern States', seatShare: 0.25, urban: 0.45, cons: 0.4 },
      { id: 'west', name: 'Western States', seatShare: 0.17, urban: 0.5, cons: 0.5 },
      { id: 'east', name: 'East & Northeast', seatShare: 0.20, urban: 0.3, cons: 0.5 },
      { id: 'metro', name: 'Metro Cities', seatShare: 0.09, urban: 0.92, cons: 0.3 },
    ],
    parties: [
      { id: 'ind_nat', name: 'National Unity Party', short: 'NUP', color: '#f59e0b', econ: 0.4, social: 0.8, base: 36, blurb: 'Dominant nationalist-conservative party.' },
      { id: 'ind_con', name: 'People’s Congress League', short: 'PCL', color: '#4f8cff', econ: -0.3, social: -0.2, base: 22, blurb: 'Historic centre-left party of the independence era.' },
      { id: 'ind_reg', name: 'Regional Federation Front', short: 'RFF', color: '#34c88a', econ: -0.2, social: 0.0, base: 16, blurb: 'Alliance of powerful state parties.' },
      { id: 'ind_soc', name: 'Workers’ Socialist Party', short: 'WSP', color: '#ff6b6b', econ: -0.8, social: -0.3, base: 6, blurb: 'Left party of unions and labour.' },
      { id: 'ind_aap', name: 'Common Citizens’ Party', short: 'CCP', color: '#7ad7c9', econ: -0.2, social: -0.4, base: 8, protest: 1.0, blurb: 'Anti-corruption populists, strongest in the cities.' },
      { id: 'ind_sth', name: 'Southern Regional Alliance', short: 'SRA', color: '#b48cff', econ: -0.3, social: -0.5, base: 7, regions: ['south'], blurb: 'Regional parties of the south.' },
      { id: 'ind_oth', name: 'Independents & Others', short: 'OTH', color: '#8d9bb8', econ: 0, social: 0, base: 5, protest: 0.5, blurb: 'Small parties and independents.' },
    ],
  },
  uk: {
    countryId: 'uk', chamber: 'House of Commons', seats: 650, kind: 'fptp', threshold: 0, presidential: false,
    electionNote: '650 single-member constituencies, first-past-the-post.',
    blocs: rich, leadable: ['uk_con', 'uk_lab'],
    names: { first: ['James', 'Emily', 'Oliver', 'Charlotte', 'Harry', 'Amelia', 'George', 'Olivia', 'Thomas', 'Grace'], last: ['Smith', 'Taylor', 'Williams', 'Brown', 'Davies', 'Evans', 'Wilson', 'Thomas', 'Roberts', 'Walker'] },
    regions: [
      { id: 'london', name: 'London', seatShare: 0.13, urban: 0.95, cons: 0.3 },
      { id: 'southeast', name: 'South East & East', seatShare: 0.25, urban: 0.5, cons: 0.5 },
      { id: 'southwest', name: 'South West', seatShare: 0.12, urban: 0.35, cons: 0.55 },
      { id: 'midnorth', name: 'Midlands & North', seatShare: 0.38, urban: 0.55, cons: 0.55 },
      { id: 'celtic', name: 'Scotland & Wales', seatShare: 0.12, urban: 0.5, cons: 0.4 },
    ],
    parties: [
      { id: 'uk_con', name: 'Union Conservative Party', short: 'UCP', color: '#3b82f6', econ: 0.5, social: 0.6, base: 28, blurb: 'Traditional centre-right party of business and the shires.' },
      { id: 'uk_lab', name: 'Labour Democratic Party', short: 'LDP', color: '#ef4444', econ: -0.5, social: -0.3, base: 31, blurb: 'Centre-left party of unions and public services.' },
      { id: 'uk_lib', name: 'Liberal Centre', short: 'LC', color: '#f59e0b', econ: 0.0, social: -0.6, base: 12, blurb: 'Socially liberal centrists.' },
      { id: 'uk_ref', name: 'Reform Insurgents', short: 'RI', color: '#22d3ee', econ: 0.3, social: 0.9, base: 14, protest: 1.2, blurb: 'Populist right insurgents.' },
      { id: 'uk_grn', name: 'Green Alliance', short: 'GA', color: '#34c88a', econ: -0.8, social: -0.8, base: 7, blurb: 'Environmentalist left.' },
      { id: 'uk_nat', name: 'Celtic Nationalists', short: 'CN', color: '#eab308', econ: -0.4, social: -0.4, base: 4, regions: ['celtic'], blurb: 'Nationalists of Scotland and Wales.' },
      { id: 'uk_oth', name: 'Others', short: 'OTH', color: '#8d9bb8', econ: 0, social: 0, base: 4, protest: 0.5, blurb: 'Independents and minor parties.' },
    ],
  },
  usa: {
    countryId: 'usa', chamber: 'House of Representatives', seats: 435, kind: 'fptp', threshold: 0, presidential: true,
    electionNote: 'President chosen by electoral votes; 435 House districts by first-past-the-post. The Senate is approximated by the House result.',
    blocs: { ...rich, rural: 0.14, middle: 0.22 }, leadable: ['us_dem', 'us_rep'],
    names: { first: ['Michael', 'Jennifer', 'David', 'Sarah', 'Robert', 'Linda', 'Daniel', 'Karen', 'Marcus', 'Elena'], last: ['Johnson', 'Miller', 'Davis', 'Garcia', 'Wilson', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore'] },
    regions: [
      { id: 'northeast', name: 'Northeast', seatShare: 0.18, urban: 0.8, cons: 0.35 },
      { id: 'south', name: 'South', seatShare: 0.35, urban: 0.5, cons: 0.7 },
      { id: 'midwest', name: 'Midwest', seatShare: 0.22, urban: 0.5, cons: 0.55 },
      { id: 'west', name: 'West Coast & Mountain', seatShare: 0.25, urban: 0.65, cons: 0.4 },
    ],
    parties: [
      { id: 'us_dem', name: 'Federal Democratic Party', short: 'FDP', color: '#3b82f6', econ: -0.4, social: -0.5, base: 48, blurb: 'Centre-left coalition of cities, minorities and unions.' },
      { id: 'us_rep', name: 'Constitutional Republican Party', short: 'CRP', color: '#ef4444', econ: 0.6, social: 0.6, base: 48, blurb: 'Centre-right party of business, rural and religious voters.' },
      { id: 'us_ind', name: 'Independents & Third Parties', short: 'IND', color: '#8d9bb8', econ: 0, social: 0, base: 4, protest: 1.0, blurb: 'Independents and minor parties.' },
    ],
  },
  germany: {
    countryId: 'germany', chamber: 'Bundestag', seats: 630, kind: 'pr', threshold: 5, presidential: false,
    electionNote: 'Mixed-member proportional: overall seats follow each party’s national vote (5% threshold).',
    blocs: { ...rich, seniors: 0.22, youth: 0.12, rural: 0.08 }, leadable: ['de_cdu', 'de_spd'],
    names: { first: ['Lukas', 'Anna', 'Felix', 'Julia', 'Jonas', 'Laura', 'Stefan', 'Katrin', 'Markus', 'Sabine'], last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Becker', 'Hoffmann', 'Wagner', 'Koch', 'Richter'] },
    regions: [
      { id: 'west', name: 'West (Rhine-Ruhr)', seatShare: 0.45, urban: 0.7, cons: 0.45 },
      { id: 'south', name: 'South (Bavaria & Baden)', seatShare: 0.20, urban: 0.5, cons: 0.6 },
      { id: 'east', name: 'East', seatShare: 0.18, urban: 0.45, cons: 0.55 },
      { id: 'north', name: 'North & City-states', seatShare: 0.17, urban: 0.65, cons: 0.4 },
    ],
    parties: [
      { id: 'de_cdu', name: 'Christian Union', short: 'CU', color: '#1f2937', econ: 0.4, social: 0.5, base: 28, blurb: 'Large centre-right people’s party.' },
      { id: 'de_spd', name: 'Social Democratic Alliance', short: 'SDA', color: '#ef4444', econ: -0.4, social: -0.2, base: 17, blurb: 'Centre-left party of unions and pensioners.' },
      { id: 'de_grn', name: 'Green Future', short: 'GF', color: '#34c88a', econ: -0.5, social: -0.8, base: 12, blurb: 'Environmentalist, socially liberal.' },
      { id: 'de_fdp', name: 'Liberal Freedom Party', short: 'LFP', color: '#f5b84b', econ: 0.8, social: -0.3, base: 6, blurb: 'Pro-market liberals; often the kingmaker.' },
      { id: 'de_afd', name: 'National Alternative', short: 'NA', color: '#3b82f6', econ: 0.4, social: 0.95, base: 19, protest: 1.0, pariah: true, blurb: 'Far-right populists; other parties refuse to govern with them.' },
      { id: 'de_lnk', name: 'Left Alliance', short: 'LA', color: '#b83a8f', econ: -0.9, social: -0.5, base: 7, blurb: 'Democratic socialists.' },
      { id: 'de_oth', name: 'Others', short: 'OTH', color: '#8d9bb8', econ: 0, social: 0, base: 11, protest: 0.6, blurb: 'Small parties.' },
    ],
  },
  japan: {
    countryId: 'japan', chamber: 'House of Representatives', seats: 465, kind: 'mixed', fptpSeats: 289, threshold: 0, presidential: false,
    electionNote: '289 single-member districts plus 176 proportional seats.',
    blocs: { ...rich, seniors: 0.26, youth: 0.10, rural: 0.12 }, leadable: ['jp_ldp', 'jp_cdp'],
    names: { first: ['Hiroshi', 'Yuki', 'Kenji', 'Akiko', 'Takeshi', 'Naomi', 'Daisuke', 'Emi', 'Shota', 'Haruka'], last: ['Tanaka', 'Suzuki', 'Sato', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida'] },
    regions: [
      { id: 'kanto', name: 'Kanto (Tokyo)', seatShare: 0.34, urban: 0.9, cons: 0.4 },
      { id: 'kansai', name: 'Kansai & Chubu', seatShare: 0.28, urban: 0.7, cons: 0.5 },
      { id: 'tohoku', name: 'Tohoku & Hokkaido', seatShare: 0.18, urban: 0.35, cons: 0.65 },
      { id: 'kyushu', name: 'Kyushu & Shikoku', seatShare: 0.20, urban: 0.4, cons: 0.65 },
    ],
    parties: [
      { id: 'jp_ldp', name: 'Liberal Constitutional Party', short: 'LCP', color: '#ef4444', econ: 0.4, social: 0.5, base: 32, blurb: 'Long-dominant conservative governing party.' },
      { id: 'jp_cdp', name: 'Democratic Reform Party', short: 'DRP', color: '#4f8cff', econ: -0.3, social: -0.4, base: 16, blurb: 'Centre-left main opposition.' },
      { id: 'jp_kmt', name: 'Clean Politics Party', short: 'CPP', color: '#34c88a', econ: -0.1, social: 0.1, base: 9, blurb: 'Centrist party, a loyal coalition partner.' },
      { id: 'jp_ish', name: 'Restoration Party', short: 'RP', color: '#f5b84b', econ: 0.7, social: 0.3, base: 11, blurb: 'Market-reform party strong in Kansai.' },
      { id: 'jp_new', name: 'New Citizens’ Party', short: 'NCP', color: '#b48cff', econ: -0.6, social: -0.2, base: 9, protest: 1.0, blurb: 'Left-populist newcomers.' },
      { id: 'jp_jcp', name: 'Communist Party', short: 'JCP', color: '#c0392b', econ: -0.95, social: -0.6, base: 5, blurb: 'Long-standing far-left party.' },
      { id: 'jp_san', name: 'Nationalist Voice Party', short: 'NVP', color: '#7a5c3a', econ: 0.3, social: 0.9, base: 8, protest: 1.0, blurb: 'Nationalist right populists.' },
      { id: 'jp_oth', name: 'Independents & Others', short: 'OTH', color: '#8d9bb8', econ: 0, social: 0, base: 10, protest: 0.5, blurb: 'Independents and small parties.' },
    ],
  },
  canada: {
    countryId: 'canada', chamber: 'House of Commons', seats: 338, kind: 'fptp', threshold: 0, presidential: false,
    electionNote: '338 single-member constituencies, first-past-the-post.',
    blocs: { ...rich, rural: 0.12 }, leadable: ['ca_lib', 'ca_con'],
    names: { first: ['Liam', 'Emma', 'Noah', 'Chloe', 'Ethan', 'Sophie', 'Lucas', 'Claire', 'Mathieu', 'Aisha'], last: ['Tremblay', 'Roy', 'Campbell', 'MacDonald', 'Singh', 'Chen', 'Gagnon', 'Wilson', 'Bouchard', 'Martin'] },
    regions: [
      { id: 'ontario', name: 'Ontario', seatShare: 0.38, urban: 0.75, cons: 0.45 },
      { id: 'quebec', name: 'Quebec', seatShare: 0.23, urban: 0.65, cons: 0.4 },
      { id: 'prairies', name: 'Prairies', seatShare: 0.17, urban: 0.5, cons: 0.7 },
      { id: 'bc', name: 'British Columbia', seatShare: 0.11, urban: 0.7, cons: 0.4 },
      { id: 'atlantic', name: 'Atlantic Canada', seatShare: 0.11, urban: 0.4, cons: 0.5 },
    ],
    parties: [
      { id: 'ca_lib', name: 'Liberal Federalists', short: 'LF', color: '#ef4444', econ: -0.2, social: -0.4, base: 33, blurb: 'Centrist-left “natural governing party”.' },
      { id: 'ca_con', name: 'Conservative Reform Party', short: 'CRP', color: '#3b82f6', econ: 0.5, social: 0.5, base: 36, blurb: 'Conservative party strong in the west.' },
      { id: 'ca_ndp', name: 'New Democratic Alliance', short: 'NDA', color: '#f59e0b', econ: -0.7, social: -0.5, base: 12, blurb: 'Social-democratic left.' },
      { id: 'ca_bq', name: 'Quebec Sovereignty Bloc', short: 'QSB', color: '#22d3ee', econ: -0.4, social: -0.3, base: 7, regions: ['quebec'], blurb: 'Quebec nationalists.' },
      { id: 'ca_grn', name: 'Green Party', short: 'GP', color: '#34c88a', econ: -0.7, social: -0.8, base: 3, blurb: 'Small environmentalist party.' },
      { id: 'ca_ppc', name: 'Peoples’ Populist Party', short: 'PPP', color: '#8b5cf6', econ: 0.6, social: 0.8, base: 4, protest: 1.0, blurb: 'Right-populist protest party.' },
      { id: 'ca_oth', name: 'Others', short: 'OTH', color: '#8d9bb8', econ: 0, social: 0, base: 5, protest: 0.5, blurb: 'Independents and minor parties.' },
    ],
  },
  australia: {
    countryId: 'australia', chamber: 'House of Representatives', seats: 151, kind: 'preferential', threshold: 0, presidential: false, compulsory: true,
    electionNote: '151 single-member seats with preferential (ranked) voting; voting is compulsory.',
    blocs: { ...rich, rural: 0.12 }, leadable: ['au_alp', 'au_lnp'],
    names: { first: ['Jack', 'Chloe', 'Lachlan', 'Olivia', 'Mitchell', 'Zoe', 'Ben', 'Sienna', 'Nathan', 'Mia'], last: ['Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Nguyen', 'Kelly', 'Ryan', 'Murphy'] },
    regions: [
      { id: 'nsw', name: 'New South Wales', seatShare: 0.30, urban: 0.75, cons: 0.5 },
      { id: 'vic', name: 'Victoria', seatShare: 0.25, urban: 0.75, cons: 0.4 },
      { id: 'qld', name: 'Queensland', seatShare: 0.20, urban: 0.55, cons: 0.65 },
      { id: 'other', name: 'WA, SA, Tas & NT', seatShare: 0.25, urban: 0.55, cons: 0.5 },
    ],
    parties: [
      { id: 'au_alp', name: 'Workers’ Labour Party', short: 'WLP', color: '#ef4444', econ: -0.4, social: -0.3, base: 34, blurb: 'Centre-left party of unions and Medicare-style services.' },
      { id: 'au_lnp', name: 'Liberal-National Coalition', short: 'LNC', color: '#3b82f6', econ: 0.5, social: 0.5, base: 35, blurb: 'Centre-right coalition of business and regional voters.' },
      { id: 'au_grn', name: 'Greens', short: 'GRN', color: '#34c88a', econ: -0.8, social: -0.8, base: 12, blurb: 'Environmentalist left.' },
      { id: 'au_one', name: 'Outback Populists', short: 'OP', color: '#f59e0b', econ: 0.2, social: 0.9, base: 6, protest: 1.0, blurb: 'Right-populist regional party.' },
      { id: 'au_ind', name: 'Teal Independents', short: 'TI', color: '#7ad7c9', econ: 0.2, social: -0.6, base: 8, protest: 0.7, blurb: 'Liberal-minded independents in wealthy urban seats.' },
      { id: 'au_oth', name: 'Others', short: 'OTH', color: '#8d9bb8', econ: 0, social: 0, base: 5, protest: 0.5, blurb: 'Minor parties.' },
    ],
  },
};

export const POSTS: { id: string; label: string; icon: string }[] = [
  { id: 'finance', label: 'Finance', icon: '💰' },
  { id: 'health', label: 'Health', icon: '🏥' },
  { id: 'education', label: 'Education', icon: '🎓' },
  { id: 'infrastructure', label: 'Infrastructure & Energy', icon: '🏗️' },
  { id: 'defence', label: 'Defence', icon: '🛡️' },
  { id: 'interior', label: 'Home Affairs', icon: '🏛️' },
  { id: 'welfare', label: 'Labour & Welfare', icon: '🤝' },
  { id: 'foreign', label: 'Foreign Affairs', icon: '🌐' },
];
