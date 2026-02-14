export type EventHandler = (...args: unknown[]) => void;

/**
 * Simple typed event emitter for the canvas engine.
 */
export class EventEmitter {
  private listeners = new Map<string, Set<EventHandler>>();

  on(event: string, handler: EventHandler): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler);
      if (set.size === 0) this.listeners.delete(event);
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const handler of set) {
        handler(...args);
      }
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
