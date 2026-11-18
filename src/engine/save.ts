import { initEco } from './economy';
import { initPolitics } from './politics';
import { initDiplo } from './diplomacy';
import { initResearch } from './research';
// Local save system: five manual slots + one autosave, all in localStorage (works offline in the Android WebView).
import { COUNTRIES } from './countries';
import { initAI } from './rivalai';
import { initNews } from './news';
import { initSociety } from './society';
import { initFactions } from './factions';
import { SAVE_VERSION, dateLabel } from './sim';
import type { GameState } from './types';

export const SLOT_COUNT = 5;
const slotKey = (n: number) => `govern.slot.${n}`;
const AUTO_KEY = 'govern.auto';

export interface SlotInfo {
  slot: number | 'auto';
  empty: boolean;
  flag?: string;
  country?: string;
  date?: string;
  term?: number;
  approval?: number;
  savedAt?: number;
  corrupt?: boolean;
}

interface Envelope { v: number; savedAt: number; state: GameState }

function read(key: string): Envelope | 'corrupt' | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope;
    if (!env || !env.state || !COUNTRIES[env.state.countryId]) return 'corrupt';
    return env;
  } catch { return 'corrupt'; }
}

function write(key: string, s: GameState): { ok: boolean; error?: string } {
  try {
    const env: Envelope = { v: SAVE_VERSION, savedAt: Date.now(), state: s };
    localStorage.setItem(key, JSON.stringify(env));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Storage unavailable' };
  }
}

function info(slot: number | 'auto', r: Envelope | 'corrupt' | null): SlotInfo {
  if (r === null) return { slot, empty: true };
  if (r === 'corrupt') return { slot, empty: false, corrupt: true };
  const c = COUNTRIES[r.state.countryId];
  return { slot, empty: false, flag: c.flag, country: c.name, date: dateLabel(r.state), term: r.state.term, approval: r.state.approval, savedAt: r.savedAt };
}

export const listSlots = (): SlotInfo[] => Array.from({ length: SLOT_COUNT }, (_, i) => info(i + 1, read(slotKey(i + 1))));
export const autoInfo = (): SlotInfo => info('auto', read(AUTO_KEY));
export const saveSlot = (n: number, s: GameState) => write(slotKey(n), s);
export const saveAuto = (s: GameState) => write(AUTO_KEY, s);

function migrate(s: GameState): GameState {
  // Forward-compatible defaults for fields added in later versions.
  s.flags = s.flags ?? {};
  s.difficulty.pressure = s.difficulty.pressure ?? 1; s.difficulty.start = s.difficulty.start ?? 1;
  s.defAvg = s.defAvg ?? COUNTRIES[s.countryId].deficitPct0;
  if (!s.eco) s.eco = initEco(COUNTRIES[s.countryId]);
  s.projects = s.projects ?? [];
  if (!s.pol) { s.pol = initPolitics(s, undefined, Math.random); s.pol.tenure = s.electionsWon ?? 0; }
  if (!s.dip) s.dip = initDiplo(s.countryId);
  if (!s.ai) s.ai = initAI(s);
  if (!s.news) s.news = initNews(s);
  if (!s.res) s.res = initResearch();
  if (!s.fac) s.fac = initFactions(s, Math.random);
  if (!s.soc) s.soc = initSociety(s, COUNTRIES[s.countryId]);
  s.v = SAVE_VERSION;
  return s;
}
export function loadSlot(n: number | 'auto'): GameState | null {
  const r = read(n === 'auto' ? AUTO_KEY : slotKey(n));
  return r && r !== 'corrupt' ? migrate(r.state) : null;
}
export function deleteSlot(n: number | 'auto') {
  try { localStorage.removeItem(n === 'auto' ? AUTO_KEY : slotKey(n)); } catch { /* ignore */ }
}
