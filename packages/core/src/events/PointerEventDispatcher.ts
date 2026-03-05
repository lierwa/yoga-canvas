import type { NodeTree } from '../types';
import type { ScrollManager } from '../scroll/ScrollManager';
import { hitTestAll } from './HitTest';

export const CANVAS_EVENT_TARGET_ID = '__canvas__' as const;

export type CanvasEventPhase = 'capture' | 'target' | 'bubble';

export type CanvasPointerEventType =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointercancel'
  | 'click'
  | 'wheel';

export type CanvasPointerEventHandler = (e: CanvasPointerEvent) => void;

export type CanvasPointerEventListenerOptions = {
  capture?: boolean;
  once?: boolean;
};

export type CanvasPointerEventInput = {
  type: CanvasPointerEventType;
  x: number;
  y: number;
  pointerId?: number;
  button?: number;
  buttons?: number;
  deltaX?: number;
  deltaY?: number;
  timeStamp?: number;
  targetId?: string;
};

export type CanvasPointerEventDispatchResult = {
  targetId: string | null;
  path: string[];
  defaultPrevented: boolean;
};

export type CanvasPointerEvent = {
  type: CanvasPointerEventType;
  x: number;
  y: number;
  pointerId: number;
  button: number;
  buttons: number;
  deltaX: number;
  deltaY: number;
  timeStamp: number;
  targetId: string | null;
  currentTargetId: string;
  phase: CanvasEventPhase;
  path: string[];
  defaultPrevented: boolean;
  propagationStopped: boolean;
  immediatePropagationStopped: boolean;
  preventDefault(): void;
  stopPropagation(): void;
  stopImmediatePropagation(): void;
};

type ListenerEntry = {
  handler: CanvasPointerEventHandler;
  capture: boolean;
  once: boolean;
};

type PointerDownState = {
  targetId: string | null;
  x: number;
  y: number;
  timeStamp: number;
  button: number;
};

export class PointerEventDispatcher {
  private listeners = new Map<string, Map<CanvasPointerEventType, ListenerEntry[]>>();
  private getTree: () => NodeTree;
  private scrollManager?: ScrollManager;
  private pointerDown = new Map<number, PointerDownState>();

  constructor(getTree: () => NodeTree, options?: { scrollManager?: ScrollManager }) {
    this.getTree = getTree;
    this.scrollManager = options?.scrollManager;
  }

  setScrollManager(scrollManager?: ScrollManager): void {
    this.scrollManager = scrollManager;
  }

  addEventListener(
    nodeId: string,
    type: CanvasPointerEventType,
    handler: CanvasPointerEventHandler,
    options: CanvasPointerEventListenerOptions = {},
  ): void {
    const capture = !!options.capture;
    const once = !!options.once;
    let byType = this.listeners.get(nodeId);
    if (!byType) {
      byType = new Map();
      this.listeners.set(nodeId, byType);
    }
    const list = byType.get(type) ?? [];
    list.push({ handler, capture, once });
    byType.set(type, list);
  }

  removeEventListener(nodeId: string, type: CanvasPointerEventType, handler: CanvasPointerEventHandler): void {
    const byType = this.listeners.get(nodeId);
    if (!byType) return;
    const list = byType.get(type);
    if (!list) return;
    const next = list.filter((l) => l.handler !== handler);
    if (next.length === 0) {
      byType.delete(type);
      if (byType.size === 0) this.listeners.delete(nodeId);
    } else {
      byType.set(type, next);
    }
  }

  removeAllListeners(nodeId?: string): void {
    if (nodeId) this.listeners.delete(nodeId);
    else this.listeners.clear();
  }

  getHitPath(x: number, y: number, options?: { targetId?: string }): string[] {
    const tree = this.getTree();
    const hitPath = options?.targetId ? this.getPathToTarget(tree, options.targetId) : hitTestAll(
      tree,
      x,
      y,
      this.scrollManager ? { scrollManager: this.scrollManager } : undefined,
    );
    if (hitPath.length === 0) return [CANVAS_EVENT_TARGET_ID];
    return [CANVAS_EVENT_TARGET_ID, ...hitPath];
  }

  dispatchPointerEvent(input: CanvasPointerEventInput): CanvasPointerEventDispatchResult {
    const pointerId = typeof input.pointerId === 'number' ? input.pointerId : 1;
    const button = typeof input.button === 'number' ? input.button : 0;
    const buttons = typeof input.buttons === 'number' ? input.buttons : 0;
    const deltaX = typeof input.deltaX === 'number' ? input.deltaX : 0;
    const deltaY = typeof input.deltaY === 'number' ? input.deltaY : 0;
    const timeStamp = typeof input.timeStamp === 'number' ? input.timeStamp : Date.now();

    const path = this.getHitPath(input.x, input.y, { targetId: input.targetId });
    const targetId = path.length > 1 ? path[path.length - 1] : null;

    const baseEvent: CanvasPointerEvent = {
      type: input.type,
      x: input.x,
      y: input.y,
      pointerId,
      button,
      buttons,
      deltaX,
      deltaY,
      timeStamp,
      targetId,
      currentTargetId: CANVAS_EVENT_TARGET_ID,
      phase: 'capture',
      path,
      defaultPrevented: false,
      propagationStopped: false,
      immediatePropagationStopped: false,
      preventDefault(this: CanvasPointerEvent) {
        this.defaultPrevented = true;
      },
      stopPropagation(this: CanvasPointerEvent) {
        this.propagationStopped = true;
      },
      stopImmediatePropagation(this: CanvasPointerEvent) {
        this.immediatePropagationStopped = true;
        this.propagationStopped = true;
      },
    };

    this.dispatchAlongPath(baseEvent, path);

    if (input.type === 'pointerdown') {
      this.pointerDown.set(pointerId, { targetId, x: input.x, y: input.y, timeStamp, button });
    } else if (input.type === 'pointercancel') {
      this.pointerDown.delete(pointerId);
    } else if (input.type === 'pointerup') {
      const down = this.pointerDown.get(pointerId);
      this.pointerDown.delete(pointerId);

      const shouldClick = (() => {
        if (!down) return false;
        if (down.button !== 0) return false;
        if (down.targetId === null || targetId === null) return false;
        if (down.targetId !== targetId) return false;
        const dx = input.x - down.x;
        const dy = input.y - down.y;
        if (dx * dx + dy * dy > 25) return false;
        if (timeStamp - down.timeStamp > 450) return false;
        return true;
      })();

      if (shouldClick) {
        const clickEvent: CanvasPointerEvent = {
          ...baseEvent,
          type: 'click',
          button: 0,
          buttons: 0,
          deltaX: 0,
          deltaY: 0,
          defaultPrevented: false,
          propagationStopped: false,
          immediatePropagationStopped: false,
        };
        this.dispatchAlongPath(clickEvent, path);
      }
    }

    return {
      targetId,
      path,
      defaultPrevented: baseEvent.defaultPrevented,
    };
  }

  private dispatchAlongPath(event: CanvasPointerEvent, path: string[]): void {
    const captureIds = path.slice(0, Math.max(0, path.length - 1));
    const target = path[path.length - 1] ?? CANVAS_EVENT_TARGET_ID;
    const bubbleIds = captureIds.slice().reverse();

    for (const id of captureIds) {
      if (event.propagationStopped) break;
      event.phase = 'capture';
      this.dispatchToNode(event, id, true);
    }

    if (!event.propagationStopped) {
      event.phase = 'target';
      this.dispatchToNode(event, target, true);
      if (!event.immediatePropagationStopped) this.dispatchToNode(event, target, false);
    }

    for (const id of bubbleIds) {
      if (event.propagationStopped) break;
      event.phase = 'bubble';
      this.dispatchToNode(event, id, false);
    }
  }

  private dispatchToNode(event: CanvasPointerEvent, nodeId: string, capture: boolean): void {
    const byType = this.listeners.get(nodeId);
    if (!byType) return;
    const list = byType.get(event.type);
    if (!list || list.length === 0) return;

    event.currentTargetId = nodeId;

    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      if (entry.capture !== capture) continue;
      entry.handler(event);
      if (entry.once) {
        list.splice(i, 1);
        i--;
      }
      if (event.immediatePropagationStopped) return;
    }

    if (list.length === 0) {
      byType.delete(event.type);
      if (byType.size === 0) this.listeners.delete(nodeId);
    }
  }

  private getPathToTarget(tree: NodeTree, targetId: string): string[] {
    const path: string[] = [];
    let cur = tree.nodes[targetId];
    if (!cur) return path;
    path.push(cur.id);
    while (cur.parentId) {
      const parent = tree.nodes[cur.parentId];
      if (!parent) break;
      path.push(parent.id);
      cur = parent;
    }
    return path.reverse();
  }
}
