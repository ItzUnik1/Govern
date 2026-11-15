import type { GameState } from '../engine/types';

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
  openEvent: () => void;
  openBriefing: () => void;
}
