// Research & technology: a national R&D budget funds one technology at a time; each unlocks lasting benefits.
import { applyAsset } from './economy';
import type { SectorId } from './econdata';
import type { CountryDef, GameState, Modifier, ResearchState, StockKey } from './types';

export type Branch = 'Agriculture' | 'Industry' | 'Digital' | 'Energy' | 'Health';
export const BRANCHES: Branch[] = ['Agriculture', 'Industry', 'Digital', 'Energy', 'Health'];
export interface TechDef {
  id: string; name: string; icon: string; branch: Branch; desc: string;
  costPct: number; // total research cost, % of annual GDP
  edu: number; // min education quality
  prereq?: string;
  asset?: Partial<Record<StockKey, number>>;
  mod?: Partial<Pick<Modifier, 'growth' | 'unemployment' | 'confidence' | 'approval' | 'stability' | 'revenuePct' | 'inflation'>>;
  sector?: Partial<Record<SectorId, number>>;
  exportBoost?: number;
}
export const TECHS: TechDef[] = [
  { id: 'seeds', name: 'High-yield crops', icon: '🌾', branch: 'Agriculture', desc: 'Better seeds and fertiliser use.', costPct: 0.4, edu: 0, mod: { growth: 0.03, inflation: -0.05 }, sector: { agriculture: 0.8 } },
  { id: 'precision', name: 'Precision farming', icon: '🚜', branch: 'Agriculture', desc: 'Sensors, drones and data on the farm.', costPct: 0.8, edu: 35, prereq: 'seeds', mod: { growth: 0.05 }, sector: { agriculture: 1.0 }, exportBoost: 0.3 },
  { id: 'agbio', name: 'Climate-resilient biotech', icon: '🧬', branch: 'Agriculture', desc: 'Drought- and flood-resistant varieties.', costPct: 1.4, edu: 55, prereq: 'precision', mod: { growth: 0.06, stability: 0.5 }, sector: { agriculture: 1.2 }, exportBoost: 0.4 },
  { id: 'automation', name: 'Factory automation', icon: '🤖', branch: 'Industry', desc: 'Modern robotics for manufacturers.', costPct: 0.7, edu: 30, mod: { growth: 0.07, unemployment: 0.05 }, sector: { manufacturing: 1.0 } },
  { id: 'materials', name: 'Advanced materials', icon: '🔩', branch: 'Industry', desc: 'Lighter, stronger and cheaper materials.', costPct: 1.1, edu: 45, prereq: 'automation', mod: { growth: 0.06 }, sector: { manufacturing: 0.9 }, exportBoost: 0.6 },
  { id: 'industry4', name: 'Smart industry', icon: '🏭', branch: 'Industry', desc: 'Connected, AI-run production lines.', costPct: 1.8, edu: 60, prereq: 'materials', mod: { growth: 0.1, confidence: 1 }, sector: { manufacturing: 1.2, technology: 0.4 }, exportBoost: 0.8 },
  { id: 'egov', name: 'Digital government', icon: '🖥️', branch: 'Digital', desc: 'Online services and digital ID.', costPct: 0.5, edu: 30, asset: { efficiency: 5 }, mod: { revenuePct: 0.05, approval: 1 } },
  { id: 'cloud', name: 'Cloud & data centres', icon: '☁️', branch: 'Digital', desc: 'Domestic cloud capacity and data-centre hubs.', costPct: 0.9, edu: 40, prereq: 'egov', mod: { growth: 0.07, confidence: 1.5 }, sector: { technology: 1.0, services: 0.3 } },
  { id: 'ai', name: 'National AI programme', icon: '🧠', branch: 'Digital', desc: 'AI research, talent and compute for firms and government.', costPct: 2.0, edu: 60, prereq: 'cloud', asset: { efficiency: 3 }, mod: { growth: 0.14, unemployment: 0.05 }, sector: { technology: 1.5 }, exportBoost: 0.6 },
  { id: 'solar', name: 'Cheap solar & storage', icon: '🔋', branch: 'Energy', desc: 'Efficient panels and grid batteries.', costPct: 0.8, edu: 35, mod: { inflation: -0.06, growth: 0.04 }, sector: { energy: 0.8 } },
  { id: 'grid2', name: 'Smart grid & demand response', icon: '🔌', branch: 'Energy', desc: 'Grid software that cuts waste and outages.', costPct: 1.0, edu: 45, prereq: 'solar', asset: { infrastructure: 4 }, mod: { confidence: 1.5 } },
  { id: 'fusion', name: 'Next-generation nuclear', icon: '⚛️', branch: 'Energy', desc: 'Safer, smaller reactors.', costPct: 2.4, edu: 65, prereq: 'grid2', asset: { infrastructure: 4 }, mod: { growth: 0.1, inflation: -0.1 }, sector: { energy: 1.4 } },
  { id: 'telemed', name: 'Telemedicine', icon: '📱', branch: 'Health', desc: 'Remote care reaching rural patients.', costPct: 0.5, edu: 30, asset: { health: 5 }, mod: { approval: 1 } },
  { id: 'vaccines', name: 'Domestic vaccine & drug capacity', icon: '💉', branch: 'Health', desc: 'Pharmaceutical research and production.', costPct: 1.2, edu: 50, prereq: 'telemed', asset: { health: 5 }, mod: { stability: 0.8 }, sector: { technology: 0.4 }, exportBoost: 0.3 },
  { id: 'genomics', name: 'Genomic medicine', icon: '🔬', branch: 'Health', desc: 'Personalised treatment and early detection.', costPct: 1.8, edu: 65, prereq: 'vaccines', asset: { health: 6 }, mod: { growth: 0.05 }, sector: { technology: 0.6 } },
];
export const getTech = (id: string) => TECHS.find((t) => t.id === id);
export const initResearch = (): ResearchState => ({ budgetPct: 0.3, progress: {}, current: null, queue: null, done: [] });
export const researchCostPct = (s: GameState) => (s.res ? s.res.budgetPct - 0.3 : 0); // the default 0.3% is already inside baseline spending

export function techStatus(s: GameState, t: TechDef): { ok: boolean; reason?: string } {
  if (s.res.done.includes(t.id)) return { ok: false, reason: 'Researched' };
  if (t.prereq && !s.res.done.includes(t.prereq)) return { ok: false, reason: `Needs ${getTech(t.prereq)!.name}` };
  if (s.stocks.education < t.edu) return { ok: false, reason: `Needs education quality ${t.edu}+` };
  return { ok: true };
}
export const researchSpeed = (s: GameState) => 0.6 + 0.8 * s.stocks.education / 100; // output per unit of funding
/** percentage points of progress per month on the current technology */
export function techRate(s: GameState, t: TechDef): number { return ((s.res.budgetPct / 12) / t.costPct) * 100 * researchSpeed(s); }
export function eta(s: GameState, id: string): number | null {
  const t = getTech(id)!; const r = techRate(s, t);
  if (r <= 0.001) return null;
  return Math.ceil((100 - (s.res.progress[id] ?? 0)) / r);
}
export function setBudget(s: GameState, v: number) { if (!s.pol.inGovernment) return; s.res.budgetPct = Math.round(Math.min(3, Math.max(0, v)) * 10) / 10; }
export function startTech(s: GameState, id: string): string | null {
  if (!s.pol.inGovernment) return 'Only the government can do this - you are in opposition.';
  const t = getTech(id); if (!t) return 'Unknown';
  const st = techStatus(s, t); if (!st.ok) return st.reason ?? 'Unavailable';
  if (!s.res.current) s.res.current = id; else s.res.queue = id;
  return null;
}

export function stepResearch(s: GameState, c: CountryDef, notes: string[]) {
  void c;
  const R = s.res;
  if (!R.current && R.queue) { R.current = R.queue; R.queue = null; }
  if (!R.current) return;
  const t = getTech(R.current)!;
  R.progress[t.id] = (R.progress[t.id] ?? 0) + techRate(s, t);
  if (R.progress[t.id] >= 100) {
    R.done.push(t.id); R.progress[t.id] = 100; R.current = R.queue; R.queue = null;
    (Object.keys(t.asset ?? {}) as StockKey[]).forEach((k) => applyAsset(s.eco, k, t.asset![k]!));
    if (t.mod) s.modifiers.push({ id: 'tech:' + t.id, label: `${t.name} (researched)`, monthsLeft: 9999, ...t.mod });
    s.eco.exportBoost += t.exportBoost ?? 0;
    (Object.keys(t.sector ?? {}) as SectorId[]).forEach((k) => { s.eco.sectorBoost[k] = (s.eco.sectorBoost[k] ?? 0) + t.sector![k]!; });
    notes.push(`🔬 Breakthrough: ${t.name}!`);
    s.approval = Math.min(95, s.approval + 0.8);
  }
}
