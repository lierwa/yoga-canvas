import type { NodeTree } from '../types';

const DEFAULT_MAX_HISTORY = 50;

/**
 * Framework-agnostic undo/redo history stack for NodeTree.
 */
export class History {
  private past: NodeTree[] = [];
  private future: NodeTree[] = [];
  private maxHistory: number;

  constructor(maxHistory = DEFAULT_MAX_HISTORY) {
    this.maxHistory = maxHistory;
  }

  /** Push the current state before a mutation. */
  push(state: NodeTree): void {
    this.past = [...this.past.slice(-(this.maxHistory - 1)), state];
    this.future = [];
  }

  /** Undo: returns the previous state, or null if nothing to undo. */
  undo(current: NodeTree): NodeTree | null {
    if (this.past.length === 0) return null;
    const previous = this.past[this.past.length - 1];
    this.past = this.past.slice(0, -1);
    this.future = [current, ...this.future];
    return previous;
  }

  /** Redo: returns the next state, or null if nothing to redo. */
  redo(current: NodeTree): NodeTree | null {
    if (this.future.length === 0) return null;
    const next = this.future[0];
    this.past = [...this.past, current];
    this.future = this.future.slice(1);
    return next;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
