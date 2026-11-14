// Sector, trade, foreign-investment, reserves and living-standards model (called once per month from sim.ts).
import { ECODATA, SECTOR_IDS, type SectorId } from './econdata';
import type { CountryDef, EcoState, GameState, StockKey } from './types';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function safeReserveMonths(c: CountryDef): number { return 3 * (1 - 0.8 * c.reserveCurrency); }

export function initEco(c: CountryDef): EcoState {
  const d = ECODATA[c.id];
  const [agri, manuf, tour, tech, energy, constr] = d.sectors;
  const services = 100 - (agri + manuf + tour + tech + energy + constr);
  const share: Record<SectorId, number> = { agriculture: agri, manufacturing: manuf, services, tourism: tour, technology: tech, energy, construction: constr };
  const sectors = {} as EcoState['sectors'];
  SECTOR_IDS.forEach((id) => { sectors[id] = { share: share[id], growth: c.potentialGrowth }; });
  const base = d.exports - d.imports + c.remittances + c.aid;
  return {
    sectors, exportsPct: d.exports, importsPct: d.imports, fdiPct: d.fdi0, reservesMonths: d.reservesMonths,
    gini: d.gini0, priceIdx: 100, caPct: d.ca0, otherCA: d.ca0 - base,
    assetBonus: { education: 0, health: 0, infrastructure: 0, security: 0, efficiency: 0 },
    exportBoost: 0, sectorBoost: { agriculture: 0, manufacturing: 0, services: 0, tourism: 0, technology: 0, energy: 0, construction: 0 },
  };
}

export function ensureEco(s: GameState, c: CountryDef): EcoState {
  if (!s.eco) s.eco = initEco(c);
  if (!s.projects) s.projects = [];
  return s.eco;
}

/** Steps the extended economy one month. Returns adjustments applied by sim.ts to currency / confidence. */
export function stepEco(s: GameState, c: CountryDef, projectLoadPct: number): { fairAdj: number; confAdj: number; growthAdj: number } {
  const e = ensureEco(s, c);
  const d = ECODATA[c.id];
  const st = s.stocks, st0 = c.stock0;
  const g = s.growth;
  const dTax = (k: 'incomeTax' | 'corpTax' | 'vat') => s.tax[k] - c.tax0[k];

  // ---- sectors: relative growth vs the whole economy; shares drift, always sum to 100 ----
  const sh0 = initEco(c).sectors;
  const tariff = s.modifiers.some((m) => /tariff|trade losses/i.test(m.label)) ? 1 : 0;
  const dev: Record<SectorId, number> = {
    agriculture: -0.7 * c.catchUp - 0.3 + 0.012 * (s.commodity - 100) * 0.5 + (s.programs.subsidies ? 0.25 : 0) + 0.03 * (st.infrastructure - st0.infrastructure) * 0.4 + e.sectorBoost.agriculture,
    manufacturing: 0.4 + 0.012 * (100 - s.currency) + 0.03 * (st.infrastructure - st0.infrastructure) - 0.06 * Math.max(0, dTax('corpTax')) + 0.35 * c.openness * s.globalCycle + (s.programs.exportPush ? 0.4 : 0) - 0.5 * tariff + e.sectorBoost.manufacturing,
    services: 0.1 + e.sectorBoost.services,
    tourism: 0.03 * (s.stability - c.stability0) + 0.015 * (100 - s.currency) + 0.02 * (st.infrastructure - st0.infrastructure) + 0.5 * s.globalCycle + e.sectorBoost.tourism,
    technology: 1.0 + 0.04 * (st.education - st0.education) + 0.03 * (s.confidence - 50) + e.sectorBoost.technology,
    energy: 0.03 * (s.commodity - 100) * Math.max(0.3, c.commodityExports) + 0.035 * (st.infrastructure - st0.infrastructure) + e.sectorBoost.energy,
    construction: 0.7 * projectLoadPct + 0.25 * (s.spend.infrastructure - c.spend0.infrastructure) * 2 - 0.4 * (s.policyRate - c.neutralRate) * 0.3 + e.sectorBoost.construction,
  };
  let wMean = 0;
  SECTOR_IDS.forEach((id) => { wMean += (e.sectors[id].share / 100) * dev[id]; });
  let total = 0;
  SECTOR_IDS.forEach((id) => {
    const rel = dev[id] - wMean; // zero-sum: sector deviations average out at the national growth rate
    e.sectors[id].growth += 0.25 * ((g + rel) - e.sectors[id].growth);
    e.sectors[id].share = Math.max(0.3, e.sectors[id].share * (1 + rel / 1200));
    total += e.sectors[id].share;
  });
  SECTOR_IDS.forEach((id) => { e.sectors[id].share = (e.sectors[id].share / total) * 100; });
  void sh0;

  // ---- trade ----
  const manufRel = (e.sectors.manufacturing.share - ECODATA[c.id].sectors[1]) / Math.max(1, ECODATA[c.id].sectors[1]);
  const xT = d.exports * (1 + 0.010 * (100 - s.currency) + 0.025 * c.openness * s.globalCycle + 0.45 * c.commodityExports * (s.commodity / 100 - 1) + 0.25 * manufRel + (s.programs.exportPush ? 0.05 : 0) - 0.04 * tariff) + e.exportBoost;
  const mT = d.imports * (1 + 0.006 * (s.currency - 100) + 0.03 * (g - c.potentialGrowth) + 0.15 * c.fuelImports * (s.commodity / 100 - 1) - 0.03 * tariff);
  e.exportsPct += 0.08 * (xT - e.exportsPct);
  e.importsPct += 0.08 * (mT - e.importsPct);

  const base = e.exportsPct - e.importsPct + c.remittances + c.aid + e.otherCA;
  e.caPct = base;

  // ---- foreign direct investment ----
  const fdiT = clamp(d.fdi0 * (1 + 0.05 * (s.confidence - 50) + 0.02 * (s.stability - c.stability0) - 0.04 * Math.max(0, dTax('corpTax')) + (s.programs.investHoliday ? 0.2 : 0)), 0, d.fdi0 * 3 + 0.5);
  e.fdiPct += 0.1 * (fdiT - e.fdiPct);

  // ---- reserves (months of imports): changes follow deviations of external balance from their starting values ----
  const net = (e.caPct - d.ca0) + (e.fdiPct - d.fdi0);
  e.reservesMonths = clamp(e.reservesMonths + net / Math.max(3, e.importsPct) + 0.01 * (d.reservesMonths - e.reservesMonths), 0, 40);
  const safe = safeReserveMonths(c);
  const short = Math.max(0, safe - e.reservesMonths);

  // ---- prices & inequality ----
  e.priceIdx *= Math.exp(Math.log(1 + s.inflation / 100) / 12);
  const giniT = d.gini0 + 0.6 * (s.unemployment - c.unemployment0) - 0.8 * (s.spend.welfare - c.spend0.welfare) - 0.15 * dTax('incomeTax') + 0.2 * dTax('vat') - 0.03 * (st.education - st0.education) + 0.3 * Math.max(0, s.inflation - c.inflationTarget);
  e.gini = clamp(e.gini + 0.012 * (giniT - e.gini), 20, 65);

  return {
    fairAdj: 0.4 * (e.caPct - d.ca0) + 0.6 * (e.fdiPct - d.fdi0) - 2.5 * short,
    confAdj: -2 * short,
    growthAdj: 0.15 * (e.fdiPct - d.fdi0),
  };
}

export function applyAsset(e: EcoState, k: StockKey, v: number) { e.assetBonus[k] = clamp((e.assetBonus[k] ?? 0) + v, -50, 60); }

// ---------- read-only metrics for the UI ----------
export function hdi(s: GameState, c: CountryDef): number {
  const h = 0.3 + (0.7 * s.stocks.health) / 100;
  const ed = 0.3 + (0.7 * s.stocks.education) / 100;
  const pc = (s.gdp * 1000) / s.population;
  const inc = clamp((Math.log(pc) - Math.log(100)) / (Math.log(75000) - Math.log(100)), 0.05, 1);
  void c;
  return Math.cbrt(h * ed * inc);
}

export function ecoMetrics(s: GameState, c: CountryDef) {
  const e = ensureEco(s, c);
  const gdp = s.gdp;
  const popIdx = s.population / c.population;
  return {
    gdpPc: (gdp * 1000) / s.population, // USD per person
    realIncomeIdx: (s.realIdx / popIdx),
    priceIdx: e.priceIdx,
    exportsBn: (e.exportsPct / 100) * gdp, importsBn: (e.importsPct / 100) * gdp,
    tradeBalPct: e.exportsPct - e.importsPct, tradeBalBn: ((e.exportsPct - e.importsPct) / 100) * gdp,
    caPct: e.caPct, caBn: (e.caPct / 100) * gdp,
    fdiBn: (e.fdiPct / 100) * gdp, fdiPct: e.fdiPct,
    reservesMonths: e.reservesMonths, reservesBn: (e.reservesMonths * (e.importsPct / 100) * gdp) / 12,
    safeMonths: safeReserveMonths(c),
    gini: e.gini, hdi: hdi(s, c),
    debtPerPerson: (s.debt * 1000) / s.population,
    remitBn: (c.remittances / 100) * gdp,
  };
}
