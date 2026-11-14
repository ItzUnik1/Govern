// Large-scale national projects: multi-year construction with costs, delays, overruns and lasting effects.
import type { CountryDef, GameState, Modifier, ProjectState, StockKey } from './types';
import { ensureEco, applyAsset } from './economy';
import type { SectorId } from './econdata';

export type ProjCat = 'Transport' | 'Energy' | 'Health & education' | 'Industry & tech' | 'Land & water';
export const PROJ_CATS: ProjCat[] = ['Transport', 'Energy', 'Health & education', 'Industry & tech', 'Land & water'];

export interface ProjectDef {
  id: string; name: string; icon: string; cat: ProjCat; desc: string;
  costPct: number; // total cost, % of GDP at start of construction
  months: number; // planned build time
  maintenance: number; // % GDP per year once complete
  req?: { confidence?: number; infra?: number; education?: number; efficiency?: number };
  asset?: Partial<Record<StockKey, number>>; // permanent shift to the long-run quality target
  mod?: { growth?: number; unemployment?: number; confidence?: number; approval?: number; stability?: number; revenuePct?: number; inflation?: number };
  exportBoost?: number; // pp of GDP exports
  sector?: Partial<Record<SectorId, number>>; // relative growth boost (pp)
  only?: string[]; // country ids; empty = everyone
}

const P = (d: ProjectDef) => d;

export const PROJECTS: ProjectDef[] = [
  P({ id: 'highways', name: 'National highway network', icon: '🛣️', cat: 'Transport', desc: 'Expressways linking major cities and ports.', costPct: 3, months: 48, maintenance: 0.12, asset: { infrastructure: 6 }, mod: { growth: 0.12, approval: 1 }, sector: { construction: 0.3, manufacturing: 0.2 } }),
  P({ id: 'ruralRoads', name: 'Rural roads programme', icon: '🛤️', cat: 'Transport', desc: 'All-weather roads reaching remote villages and farms.', costPct: 1.2, months: 30, maintenance: 0.05, asset: { infrastructure: 3 }, mod: { growth: 0.06, approval: 1.5, unemployment: -0.1 }, sector: { agriculture: 0.4 } }),
  P({ id: 'hsr', name: 'High-speed rail', icon: '🚄', cat: 'Transport', desc: 'A flagship fast rail corridor between the biggest cities.', costPct: 5, months: 84, maintenance: 0.2, req: { infra: 40, efficiency: 35 }, asset: { infrastructure: 7 }, mod: { growth: 0.14, approval: 1.5, confidence: 1.5 }, sector: { construction: 0.4, tourism: 0.2 } }),
  P({ id: 'metro', name: 'Urban metro systems', icon: '🚇', cat: 'Transport', desc: 'Metro lines for congested capital and regional cities.', costPct: 2.5, months: 54, maintenance: 0.1, req: { efficiency: 30 }, asset: { infrastructure: 3 }, mod: { growth: 0.07, approval: 1.5 }, sector: { construction: 0.3 } }),
  P({ id: 'airports', name: 'Airport expansion', icon: '✈️', cat: 'Transport', desc: 'New terminals and runways for trade and tourism.', costPct: 1.5, months: 40, maintenance: 0.06, asset: { infrastructure: 2 }, mod: { growth: 0.05, confidence: 1 }, sector: { tourism: 0.7 }, exportBoost: 0.3 }),
  P({ id: 'ports', name: 'Deep-water ports & logistics', icon: '⚓', cat: 'Transport', desc: 'Modern ports and freight terminals that cut trade costs.', costPct: 2, months: 42, maintenance: 0.08, asset: { infrastructure: 3 }, mod: { growth: 0.07 }, exportBoost: 1.0, sector: { manufacturing: 0.3 } }),
  P({ id: 'hydro', name: 'Large hydropower dams', icon: '💧', cat: 'Energy', desc: 'Big dams giving cheap clean power - and some export revenue.', costPct: 4, months: 72, maintenance: 0.1, asset: { infrastructure: 4 }, mod: { growth: 0.1, revenuePct: 0.1, inflation: -0.05 }, exportBoost: 0.4, sector: { energy: 0.8 } }),
  P({ id: 'renewables', name: 'Solar & wind build-out', icon: '☀️', cat: 'Energy', desc: 'Utility-scale renewables lowering energy costs over time.', costPct: 2.5, months: 36, maintenance: 0.07, asset: { infrastructure: 2 }, mod: { growth: 0.05, inflation: -0.08, approval: 0.8 }, sector: { energy: 0.6 } }),
  P({ id: 'nuclear', name: 'Nuclear power plants', icon: '☢️', cat: 'Energy', desc: 'Firm low-carbon power; expensive, slow, and politically divisive.', costPct: 5, months: 96, maintenance: 0.18, req: { efficiency: 40, education: 45 }, asset: { infrastructure: 5 }, mod: { growth: 0.12, inflation: -0.1, stability: -0.3 }, sector: { energy: 0.8 } }),
  P({ id: 'grid', name: 'Smart national grid', icon: '🔌', cat: 'Energy', desc: 'Grid upgrades ending blackouts and cutting losses.', costPct: 1.8, months: 36, maintenance: 0.06, asset: { infrastructure: 4 }, mod: { growth: 0.07, confidence: 2, approval: 1 }, sector: { manufacturing: 0.25 } }),
  P({ id: 'hospitals', name: 'Hospital building programme', icon: '🏥', cat: 'Health & education', desc: 'New regional hospitals and trauma centres.', costPct: 2, months: 42, maintenance: 0.12, asset: { health: 6 }, mod: { approval: 2 }, sector: { construction: 0.3 } }),
  P({ id: 'primaryCare', name: 'Primary care network', icon: '🩺', cat: 'Health & education', desc: 'Clinics and community health workers everywhere.', costPct: 1, months: 30, maintenance: 0.08, asset: { health: 4 }, mod: { approval: 1.5, growth: 0.03 } }),
  P({ id: 'schools', name: 'School modernisation', icon: '🏫', cat: 'Health & education', desc: 'Rebuild and equip schools nationwide.', costPct: 1.5, months: 40, maintenance: 0.08, asset: { education: 5 }, mod: { approval: 1.2 }, sector: { construction: 0.3 } }),
  P({ id: 'universities', name: 'Universities & skills campuses', icon: '🎓', cat: 'Health & education', desc: 'Expand universities and technical colleges.', costPct: 2, months: 48, maintenance: 0.1, asset: { education: 6 }, mod: { growth: 0.05 }, sector: { technology: 0.5 } }),
  P({ id: 'research', name: 'National research park', icon: '🔬', cat: 'Industry & tech', desc: 'Labs, incubators and R&D funds clustered around universities.', costPct: 1.8, months: 48, maintenance: 0.09, req: { education: 45 }, mod: { growth: 0.12, confidence: 1.5 }, asset: { efficiency: 2 }, sector: { technology: 1.0 } }),
  P({ id: 'fibre', name: 'National fibre & 5G', icon: '📡', cat: 'Industry & tech', desc: 'Universal fast broadband.', costPct: 1.6, months: 36, maintenance: 0.06, mod: { growth: 0.1, confidence: 1.5 }, asset: { efficiency: 3 }, sector: { technology: 0.8, services: 0.2 } }),
  P({ id: 'chips', name: 'Semiconductor & industrial park', icon: '🔧', cat: 'Industry & tech', desc: 'Subsidised fab and advanced manufacturing cluster.', costPct: 3, months: 60, maintenance: 0.1, req: { education: 40, infra: 40 }, mod: { growth: 0.1, unemployment: -0.1 }, exportBoost: 1.2, sector: { technology: 0.8, manufacturing: 0.7 } }),
  P({ id: 'sez', name: 'Special economic zones', icon: '🏭', cat: 'Industry & tech', desc: 'Tax-advantaged zones attracting factories and foreign firms.', costPct: 1.5, months: 36, maintenance: 0.04, req: { infra: 30 }, mod: { growth: 0.07, unemployment: -0.15, confidence: 2, revenuePct: -0.05 }, exportBoost: 0.9, sector: { manufacturing: 0.8 } }),
  P({ id: 'tourismHub', name: 'Tourism flagship destinations', icon: '🏝️', cat: 'Industry & tech', desc: 'Resorts, heritage restoration and visitor infrastructure.', costPct: 1.2, months: 36, maintenance: 0.05, mod: { growth: 0.05, approval: 0.5 }, sector: { tourism: 1.2 } }),
  P({ id: 'irrigation', name: 'Irrigation & flood defences', icon: '🌊', cat: 'Land & water', desc: 'Canals, reservoirs and flood barriers protecting farms and cities.', costPct: 2, months: 48, maintenance: 0.07, asset: { infrastructure: 2 }, mod: { growth: 0.05, stability: 0.5, approval: 0.8 }, sector: { agriculture: 1.0 } }),
  P({ id: 'water', name: 'Clean water & sanitation', icon: '🚰', cat: 'Land & water', desc: 'Universal safe water and sewerage.', costPct: 1.5, months: 36, maintenance: 0.07, asset: { health: 4, infrastructure: 1 }, mod: { approval: 1.5 } }),
  P({ id: 'housing', name: 'Affordable housing drive', icon: '🏘️', cat: 'Land & water', desc: 'Mass public housing and urban renewal.', costPct: 2.2, months: 40, maintenance: 0.05, mod: { approval: 2, unemployment: -0.15, inflation: -0.05 }, sector: { construction: 0.8 } }),

  // country-specific
  P({ id: 'np_karnali', name: 'Upper Karnali hydropower', icon: '💧', cat: 'Energy', desc: 'Giant run-of-river project selling power to India.', costPct: 6, months: 72, maintenance: 0.1, only: ['nepal'], asset: { infrastructure: 5 }, mod: { growth: 0.25, revenuePct: 0.4 }, exportBoost: 1.5, sector: { energy: 1.5 } }),
  P({ id: 'np_rail', name: 'Kathmandu–Raxaul railway', icon: '🚆', cat: 'Transport', desc: 'First cross-border rail freight link.', costPct: 5, months: 80, maintenance: 0.12, only: ['nepal'], asset: { infrastructure: 5 }, mod: { growth: 0.15 }, exportBoost: 1.0, sector: { manufacturing: 0.5 } }),
  P({ id: 'in_bullet', name: 'Mumbai–Ahmedabad bullet train', icon: '🚄', cat: 'Transport', desc: 'India\'s first bullet train corridor.', costPct: 0.9, months: 72, maintenance: 0.03, only: ['india'], asset: { infrastructure: 3 }, mod: { growth: 0.08, approval: 1.5 } }),
  P({ id: 'in_freight', name: 'Dedicated freight corridors', icon: '🚂', cat: 'Transport', desc: 'Separate fast freight rail lines for industry.', costPct: 1.6, months: 60, maintenance: 0.05, only: ['india'], asset: { infrastructure: 4 }, mod: { growth: 0.12 }, exportBoost: 0.8, sector: { manufacturing: 0.6 } }),
  P({ id: 'uk_offshore', name: 'North Sea offshore wind', icon: '🌬️', cat: 'Energy', desc: 'World-leading offshore wind arrays.', costPct: 1.8, months: 54, maintenance: 0.08, only: ['uk'], mod: { growth: 0.07, inflation: -0.06 }, sector: { energy: 0.8 }, exportBoost: 0.3 }),
  P({ id: 'uk_north', name: 'Northern powerhouse rail', icon: '🚅', cat: 'Transport', desc: 'Fast rail linking northern cities.', costPct: 1.5, months: 72, maintenance: 0.07, only: ['uk'], asset: { infrastructure: 4 }, mod: { growth: 0.08, approval: 1.5, stability: 0.5 } }),
  P({ id: 'us_grid', name: 'Interstate rebuild & grid', icon: '🌉', cat: 'Transport', desc: 'Bridges, interstates and grid renewal at national scale.', costPct: 1.4, months: 60, maintenance: 0.06, only: ['usa'], asset: { infrastructure: 5 }, mod: { growth: 0.1, approval: 1 } }),
  P({ id: 'us_chips', name: 'Domestic chip fabs', icon: '🔧', cat: 'Industry & tech', desc: 'Onshore leading-edge semiconductor manufacturing.', costPct: 0.8, months: 48, maintenance: 0.04, only: ['usa'], mod: { growth: 0.1, unemployment: -0.05 }, sector: { technology: 0.8, manufacturing: 0.4 } }),
  P({ id: 'de_h2', name: 'Hydrogen & energy transition', icon: '🧪', cat: 'Energy', desc: 'Green hydrogen, pipelines and industrial decarbonisation.', costPct: 2, months: 60, maintenance: 0.08, only: ['germany'], mod: { growth: 0.08, inflation: -0.05 }, sector: { energy: 0.7, manufacturing: 0.4 } }),
  P({ id: 'de_rail', name: 'Deutsche Bahn renewal', icon: '🚆', cat: 'Transport', desc: 'Fixing the creaking rail network.', costPct: 1.2, months: 60, maintenance: 0.05, only: ['germany'], asset: { infrastructure: 4 }, mod: { growth: 0.08, approval: 1.2 } }),
  P({ id: 'jp_maglev', name: 'Chuo Shinkansen maglev', icon: '🚄', cat: 'Transport', desc: 'Tokyo–Nagoya–Osaka maglev line.', costPct: 2.5, months: 84, maintenance: 0.1, only: ['japan'], asset: { infrastructure: 4 }, mod: { growth: 0.1, approval: 1 } }),
  P({ id: 'jp_robots', name: 'Care robotics & AI for ageing', icon: '🤖', cat: 'Industry & tech', desc: 'Automation to offset a shrinking workforce.', costPct: 1.2, months: 48, maintenance: 0.05, only: ['japan'], mod: { growth: 0.14, unemployment: 0.05 }, asset: { health: 2 }, sector: { technology: 0.8 } }),
  P({ id: 'ca_pipeline', name: 'Trans-Canada energy corridor', icon: '🛢️', cat: 'Energy', desc: 'Pipelines and LNG terminals to reach Pacific markets.', costPct: 2, months: 60, maintenance: 0.06, only: ['canada'], mod: { growth: 0.1, stability: -0.3 }, exportBoost: 1.2, sector: { energy: 0.9 } }),
  P({ id: 'ca_north', name: 'Arctic & northern roads', icon: '🧊', cat: 'Land & water', desc: 'All-season links to northern communities and mines.', costPct: 1, months: 48, maintenance: 0.05, only: ['canada'], asset: { infrastructure: 3 }, mod: { growth: 0.04, approval: 0.6 }, sector: { energy: 0.3 } }),
  P({ id: 'au_rail', name: 'Inland rail freight link', icon: '🚂', cat: 'Transport', desc: 'Connects mining and farming regions to ports.', costPct: 1, months: 60, maintenance: 0.04, only: ['australia'], asset: { infrastructure: 3 }, mod: { growth: 0.07 }, exportBoost: 0.6, sector: { agriculture: 0.4, energy: 0.4 } }),
  P({ id: 'au_hydrogen', name: 'Renewable export hub', icon: '🌞', cat: 'Energy', desc: 'Giant solar and hydrogen exports to Asia.', costPct: 2.5, months: 66, maintenance: 0.07, only: ['australia'], mod: { growth: 0.1 }, exportBoost: 1.0, sector: { energy: 1.0 } }),
];

export const getProject = (id: string) => PROJECTS.find((p) => p.id === id);

export function availableProjects(c: CountryDef): ProjectDef[] {
  return PROJECTS.filter((p) => !p.only || p.only.includes(c.id));
}

export const projectCapacity = (s: GameState) => Math.floor(2 + s.stocks.efficiency / 30);
export const activeCount = (s: GameState) => s.projects.filter((p) => p.status === 'building').length;
export const projectBudget = (d: ProjectDef, s: GameState) => (d.costPct / 100) * s.gdp;

/** Annual cost of construction + maintenance as % of GDP (feeds fiscal()). */
export function projectCostPct(s: GameState): number {
  if (!s.projects) return 0;
  let t = 0;
  for (const p of s.projects) {
    if (p.status === 'building') t += (p.monthlySpend * 12 / s.gdp) * 100;
    else if (p.status === 'complete') t += getProject(p.id)?.maintenance ?? 0;
  }
  return t;
}

export function projectStatus(s: GameState, d: ProjectDef): { ok: boolean; reason?: string } {
  if (s.projects.some((p) => p.id === d.id)) return { ok: false, reason: 'Already started' };
  if (activeCount(s) >= projectCapacity(s)) return { ok: false, reason: `Construction capacity full (${projectCapacity(s)} at once)` };
  const r = d.req;
  if (r?.confidence && s.confidence < r.confidence) return { ok: false, reason: `Needs investor confidence ${r.confidence}+` };
  if (r?.infra && s.stocks.infrastructure < r.infra) return { ok: false, reason: `Needs infrastructure quality ${r.infra}+` };
  if (r?.education && s.stocks.education < r.education) return { ok: false, reason: `Needs education quality ${r.education}+` };
  if (r?.efficiency && s.stocks.efficiency < r.efficiency) return { ok: false, reason: `Needs state efficiency ${r.efficiency}+` };
  return { ok: true };
}

function pace(s: GameState, p: ProjectState): number {
  const eff = s.stocks.efficiency;
  const monthsPlan = p.plannedMonths + p.delayMonths;
  return (100 / monthsPlan) * (0.75 + 0.5 * eff / 100);
}

function refreshSpend(s: GameState, p: ProjectState) {
  p.monthlySpend = p.status === 'building' ? (p.budget * (1 + p.overrunPct / 100) * pace(s, p)) / 100 : 0;
}

export function startProject(s: GameState, id: string): string | null {
  const d = getProject(id);
  if (!d) return 'Unknown project';
  const st = projectStatus(s, d);
  if (!st.ok) return st.reason ?? 'Not available';
  const p: ProjectState = { id, status: 'building', startTurn: s.turn, progress: 0, spent: 0, budget: projectBudget(d, s), plannedMonths: d.months, delayMonths: 0, overrunPct: 0, monthlySpend: 0, completedTurn: null, log: [] };
  refreshSpend(s, p);
  s.projects.push(p);
  return null;
}

export function setProjectPaused(s: GameState, id: string, paused: boolean): string | null {
  const p = s.projects.find((x) => x.id === id);
  if (!p || p.status === 'complete') return 'Not available';
  if (!paused && p.status === 'paused' && activeCount(s) >= projectCapacity(s)) return 'Construction capacity full';
  p.status = paused ? 'paused' : 'building';
  refreshSpend(s, p);
  return null;
}

export function cancelProject(s: GameState, id: string): void {
  const i = s.projects.findIndex((x) => x.id === id);
  if (i < 0 || s.projects[i].status === 'complete') return;
  const p = s.projects[i];
  // Sunk costs; small confidence hit if far advanced
  if (p.progress > 40) s.confidence = Math.max(0, s.confidence - 2);
  s.approval = Math.max(3, s.approval - (p.progress > 25 ? 1 : 0));
  s.projects.splice(i, 1);
}

export function eta(s: GameState, p: ProjectState): number {
  if (p.status !== 'building' && p.status !== 'paused') return 0;
  const per = pace(s, p);
  return Math.ceil((100 - p.progress) / Math.max(0.1, per));
}

/** Monthly construction step. Returns construction load (% of GDP, annualised) for the construction sector. */
export function stepProjects(s: GameState, c: CountryDef, rnd: () => number, notes: string[]): number {
  const e = ensureEco(s, c);
  let load = 0;
  for (const p of s.projects) {
    if (p.status !== 'building') continue;
    const d = getProject(p.id);
    if (!d) continue;
    const eff = s.stocks.efficiency;
    // random setbacks
    if (rnd() < 0.03 * (1.25 - eff / 100) * s.difficulty.economy) {
      if (rnd() < 0.5) { const dl = 2 + Math.floor(rnd() * 4); p.delayMonths += dl; p.log.push(`${dl}-month delay (${s.y})`); notes.push(`${d.name}: delayed by ${dl} months (permits and contractor problems).`); }
      else { const ov = 4 + Math.floor(rnd() * 9); p.overrunPct += ov; p.log.push(`+${ov}% cost overrun (${s.y})`); notes.push(`${d.name}: costs overrun by ${ov}%.`); }
    }
    refreshSpend(s, p);
    p.spent += p.monthlySpend;
    load += (p.monthlySpend * 12 / s.gdp) * 100;
    p.progress = Math.min(100, p.progress + pace(s, p));
    if (p.progress >= 100) {
      p.status = 'complete'; p.completedTurn = s.turn; p.monthlySpend = 0;
      (Object.keys(d.asset ?? {}) as StockKey[]).forEach((k) => applyAsset(e, k, d.asset![k]!));
      const m = d.mod;
      if (m) {
        const mod: Modifier = { id: 'proj:' + d.id, label: `${d.name} (completed)`, monthsLeft: 9999, ...m };
        s.modifiers.push(mod);
      }
      e.exportBoost += d.exportBoost ?? 0;
      (Object.keys(d.sector ?? {}) as SectorId[]).forEach((k) => { e.sectorBoost[k] = (e.sectorBoost[k] ?? 0) + d.sector![k]!; });
      notes.push(`🏗️ ${d.name} is complete!`);
      s.approval = Math.min(95, s.approval + 1.5);
    }
  }
  return load;
}
