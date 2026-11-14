import type { GameState } from '../engine/types';

export type Tab = 'overview' | 'economy' | 'government' | 'politics' | 'build' | 'more';

export interface Ctx {
  s: GameState;
  /** Apply a mutation to a copy of the state (immutably) and autosave. */
  update: (fn: (s: GameState) => void) => void;
  toast: (msg: string) => void;
  go: (t: Tab) => void;
  advance: () => void;
  openEvent: () => void;
  openBriefing: () => void;
}
