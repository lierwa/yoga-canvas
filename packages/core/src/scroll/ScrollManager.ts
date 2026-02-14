/**
 * Per-node scroll state.
 */
export interface ScrollState {
  offsetX: number;
  offsetY: number;
  contentWidth: number;
  contentHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  scrollBarOpacity: number;
}

/**
 * Manages scroll state for all ScrollView nodes.
 * Kept separate from the node tree to keep tree pure/serializable.
 */
export class ScrollManager {
  private states = new Map<string, ScrollState>();

  /** Get scroll state for a node (creates default if not exists). */
  getState(nodeId: string): ScrollState {
    let state = this.states.get(nodeId);
    if (!state) {
      state = {
        offsetX: 0,
        offsetY: 0,
        contentWidth: 0,
        contentHeight: 0,
        viewportWidth: 0,
        viewportHeight: 0,
        scrollBarOpacity: 0,
      };
      this.states.set(nodeId, state);
    }
    return state;
  }

  /** Get scroll offset for a node. Returns { x: 0, y: 0 } if not a ScrollView. */
  getOffset(nodeId: string): { x: number; y: number } {
    const state = this.states.get(nodeId);
    if (!state) return { x: 0, y: 0 };
    return { x: state.offsetX, y: state.offsetY };
  }

  /** Apply a scroll delta and clamp within bounds. Returns true if offset changed. */
  scroll(nodeId: string, deltaX: number, deltaY: number): boolean {
    const state = this.getState(nodeId);
    const prevX = state.offsetX;
    const prevY = state.offsetY;

    const maxX = Math.max(0, state.contentWidth - state.viewportWidth);
    const maxY = Math.max(0, state.contentHeight - state.viewportHeight);

    state.offsetX = clamp(state.offsetX + deltaX, 0, maxX);
    state.offsetY = clamp(state.offsetY + deltaY, 0, maxY);

    return state.offsetX !== prevX || state.offsetY !== prevY;
  }

  /** Set scroll offset directly (clamped). */
  setOffset(nodeId: string, x: number, y: number): void {
    const state = this.getState(nodeId);
    const maxX = Math.max(0, state.contentWidth - state.viewportWidth);
    const maxY = Math.max(0, state.contentHeight - state.viewportHeight);
    state.offsetX = clamp(x, 0, maxX);
    state.offsetY = clamp(y, 0, maxY);
  }

  /** Update content and viewport sizes (called after layout computation). */
  setContentSize(
    nodeId: string,
    contentWidth: number,
    contentHeight: number,
    viewportWidth: number,
    viewportHeight: number,
  ): void {
    const state = this.getState(nodeId);
    state.contentWidth = contentWidth;
    state.contentHeight = contentHeight;
    state.viewportWidth = viewportWidth;
    state.viewportHeight = viewportHeight;

    // Re-clamp offset after resize
    const maxX = Math.max(0, contentWidth - viewportWidth);
    const maxY = Math.max(0, contentHeight - viewportHeight);
    state.offsetX = clamp(state.offsetX, 0, maxX);
    state.offsetY = clamp(state.offsetY, 0, maxY);
  }

  /** Set scrollbar opacity to 1 (fully visible). */
  showScrollBar(nodeId: string): void {
    const state = this.getState(nodeId);
    state.scrollBarOpacity = 1;
  }

  /** Get current scrollbar opacity (0–1). */
  getScrollBarOpacity(nodeId: string): number {
    return this.states.get(nodeId)?.scrollBarOpacity ?? 0;
  }

  /** Set scrollbar opacity directly. */
  setScrollBarOpacity(nodeId: string, opacity: number): void {
    const state = this.getState(nodeId);
    state.scrollBarOpacity = Math.max(0, Math.min(1, opacity));
  }

  /** Check if a node has scroll state. */
  has(nodeId: string): boolean {
    return this.states.has(nodeId);
  }

  /** Remove scroll state for a node. */
  remove(nodeId: string): void {
    this.states.delete(nodeId);
  }

  /** Clear all scroll states. */
  reset(): void {
    this.states.clear();
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
