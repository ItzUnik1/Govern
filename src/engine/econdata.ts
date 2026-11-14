// Extra economic starting data (approximate, circa 2024-25) for the trade / sector / living-standards model.
export type SectorId = 'agriculture' | 'manufacturing' | 'services' | 'tourism' | 'technology' | 'energy' | 'construction';
export const SECTOR_IDS: SectorId[] = ['agriculture', 'manufacturing', 'services', 'tourism', 'technology', 'energy', 'construction'];
export const SECTOR_LABELS: Record<SectorId, { label: string; icon: string; color: string }> = {
  agriculture: { label: 'Agriculture', icon: '🌾', color: '#7ad7c9' },
  manufacturing: { label: 'Manufacturing', icon: '🏭', color: '#f5b84b' },
  services: { label: 'Services & finance', icon: '🏦', color: '#4f8cff' },
  tourism: { label: 'Tourism', icon: '🏝️', color: '#e0a3ff' },
  technology: { label: 'Technology', icon: '💻', color: '#34c88a' },
  energy: { label: 'Energy & mining', icon: '⚡', color: '#ff7b7b' },
  construction: { label: 'Construction', icon: '🏗️', color: '#b48cff' },
};

export interface EcoDef {
  exports: number; // % of GDP
  imports: number; // % of GDP
  ca0: number; // current account % GDP at start
  fdi0: number; // FDI inflow % GDP
  reservesMonths: number; // months of imports
  gini0: number;
  // starting GDP shares (%): agriculture, manufacturing, tourism, technology, energy, construction (services = remainder)
  sectors: [number, number, number, number, number, number];
}

export const ECODATA: Record<string, EcoDef> = {
  nepal: { exports: 6, imports: 32, ca0: 1.0, fdi0: 0.4, reservesMonths: 10, gini0: 33, sectors: [24, 5, 4, 2, 3, 10] },
  india: { exports: 21, imports: 24, ca0: -1.0, fdi0: 1.2, reservesMonths: 10, gini0: 35, sectors: [16, 14, 5, 8, 4, 8] },
  uk: { exports: 30, imports: 32, ca0: -3.0, fdi0: 2.0, reservesMonths: 3, gini0: 35, sectors: [1, 8, 4, 8, 2, 6] },
  usa: { exports: 11, imports: 14, ca0: -3.5, fdi0: 1.2, reservesMonths: 2, gini0: 41, sectors: [1, 10, 3, 10, 4, 4] },
  germany: { exports: 47, imports: 42, ca0: 5.5, fdi0: 0.8, reservesMonths: 2, gini0: 31, sectors: [1, 19, 3, 6, 3, 6] },
  japan: { exports: 21, imports: 22, ca0: 4.0, fdi0: 0.3, reservesMonths: 14, gini0: 33, sectors: [1, 20, 2, 7, 2, 6] },
  canada: { exports: 33, imports: 33, ca0: -1.0, fdi0: 2.0, reservesMonths: 3, gini0: 33, sectors: [2, 10, 2, 5, 8, 7] },
  australia: { exports: 24, imports: 22, ca0: -1.0, fdi0: 2.5, reservesMonths: 3, gini0: 34, sectors: [3, 6, 3, 4, 9, 7] },
};
