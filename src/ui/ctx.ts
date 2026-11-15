import type { GameState } from '../engine/types';
import type { Updater } from './Update';

export type Tab = 'overview' | 'economy' | 'government' | 'politics' | 'world' | 'build' | 'more' | 'menu';

export interface Ctx {
  s: GameState;
  /** Apply a mutation to a copy of the state (immutably) and autosave. */
  update: (fn: (s: GameState) => void) => void;
  toast: (msg: string) => void;
  go: (t: Tab, sub?: string) => void;
  /** Optional sub-page requested by the Menu hub (e.g. a Politics segment). */
  sub?: string;
  advance: () => void;
  upd: Updater;
  openUpdate: () => void;
  openEvent: () => void;
  openBriefing: () => void;
}
