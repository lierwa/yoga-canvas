import { useState, useCallback } from 'react';

const MAX_HISTORY = 50;

export interface HistoryState<T> {
  present: T;
  canUndo: boolean;
  canRedo: boolean;
  set: (newPresent: T) => void;
  undo: () => T | undefined;
  redo: () => T | undefined;
}

export function useHistory<T>(initialPresent: T | (() => T)): HistoryState<T> {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialPresent);
  const [future, setFuture] = useState<T[]>([]);

  const set = useCallback((newPresent: T) => {
    setPast((prev) => {
      const next = [...prev, present];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });
    setPresent(newPresent);
    setFuture([]);
  }, [present]);

  const undo = useCallback(() => {
    if (past.length === 0) return undefined;
    const previous = past[past.length - 1];
    setPast((prev) => prev.slice(0, -1));
    setFuture((prev) => [present, ...prev]);
    setPresent(previous);
    return previous;
  }, [past, present]);

  const redo = useCallback(() => {
    if (future.length === 0) return undefined;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setPast((prev) => [...prev, present]);
    setPresent(next);
    return next;
  }, [future, present]);

  return {
    present,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    set,
    undo,
    redo,
  };
}
