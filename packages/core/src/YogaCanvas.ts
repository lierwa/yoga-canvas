import type {
  NodeTree,
  NodeDescriptor,
  CanvasNode,
  CanvasContextLike,
  CanvasImageLike,
  PlatformAdapter,
  FlexStyle,
  VisualStyle,
  TextProps,
  ImageProps,
  MotionEasing,
  MotionTransition,
  NodeAction,
  NodeEventBindings,
} from "./types";
import { initYoga, computeScrollContentSizes } from "./layout";
import { renderTree } from "./renderer";
import { NodeTreeManager } from "./tree";
import { ScrollManager } from "./scroll";
import {
  EventEmitter,
  PointerEventDispatcher,
  CANVAS_EVENT_TARGET_ID,
} from "./events";
import type { EventHandler } from "./events";
import type {
  CanvasPointerEventType,
  CanvasPointerEventHandler,
  CanvasPointerEventInput,
  CanvasPointerEventDispatchResult,
  CanvasPointerEventListenerOptions,
} from "./events";
import { exportToJSON, importFromJSON, exportToDOMString } from "./export";
import { exportToDataURL, exportToTempFilePath } from "./export";
import { H5Adapter } from "./platform/H5Adapter";
import { WxAdapter } from "./platform/WxAdapter";
import * as TWEEN from "@tweenjs/tween.js";

export interface YogaCanvasOptions {
  /** Platform: 'h5' (default) or 'wx'. */
  platform?: "h5" | "wx";
  /** Device pixel ratio. Defaults to 1. */
  pixelRatio?: number;
  /** Canvas logical width. */
  width?: number;
  /** Canvas logical height. */
  height?: number;
  /** Custom platform adapter (overrides `platform` option). */
  adapter?: PlatformAdapter;
}

export type YogaNodeRef = string | { id?: string; name?: string };

export type YogaNodeOverride = {
  visualStyle?: Partial<VisualStyle>;
  textProps?: Partial<TextProps>;
  imageProps?: Partial<ImageProps>;
};

export type YogaAnimationPatch = YogaNodeOverride;

export type YogaAnimateOptions = {
  duration?: number;
  delay?: number;
  easing?: MotionEasing;
  repeat?: number;
  yoyo?: boolean;
  autoClear?: boolean;
  restoreOnFinish?: boolean;
};

export type YogaAnimationHandle = {
  stop: () => void;
  finished: Promise<void>;
  restore: (mode?: "initial" | "clear") => void;
};

/**
 * The main YogaCanvas engine instance.
 */
export class YogaCanvas {
  private canvas: unknown;
  private ctx: CanvasContextLike | null = null;
  private adapter: PlatformAdapter;
  private treeManager: NodeTreeManager;
  private scrollManager: ScrollManager;
  private emitter: EventEmitter;
  private pointerDispatcher: PointerEventDispatcher;
  private layout: NodeDescriptor;
  private pixelRatio: number;
  private logicalWidth: number;
  private logicalHeight: number;
  private explicitWidth: number | undefined;
  private explicitHeight: number | undefined;
  private lastEmittedSize: { width: number; height: number } | null = null;
  private initialized = false;
  private wheelHandler: ((e: WheelEvent) => void) | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private activeTweens: Set<TWEEN.Tween<any>> = new Set();
  private tweenGroup: TWEEN.Group = new TWEEN.Group();
  private nodeOverrides: Map<string, YogaNodeOverride> = new Map();
  private motionInitialOverrides: Map<string, YogaNodeOverride> = new Map();
  private activeAnimationStops: Map<
    string,
    { token: symbol; stop: () => void }
  > = new Map();
  private boundEventHandlers: Map<
    string,
    { nodeId: string; type: CanvasPointerEventType; handler: CanvasPointerEventHandler }
  > = new Map();
  private boundEventTypesByNodeId: Map<string, Set<CanvasPointerEventType>> =
    new Map();
  private scrollBarTimers: Map<string, ReturnType<typeof setTimeout>> =
    new Map();
  private animationRunning = false;
  private hadTweensLastTick = false;
  private animationFrameHandle: number | null = null;

  constructor(
    canvas: unknown,
    layout: NodeDescriptor,
    options: YogaCanvasOptions = {},
  ) {
    this.canvas = canvas;
    this.layout = layout;
    this.pixelRatio = options.pixelRatio ?? 1;
    this.explicitWidth = options.width;
    this.explicitHeight = options.height;
    this.logicalWidth = options.width ?? 375;
    this.logicalHeight = options.height ?? 667;
    this.emitter = new EventEmitter();

    // Resolve adapter
    if (options.adapter) {
      this.adapter = options.adapter;
    } else if (options.platform === "wx") {
      this.adapter = new WxAdapter();
    } else {
      this.adapter = new H5Adapter();
    }

    this.treeManager = new NodeTreeManager(this.adapter);
    this.scrollManager = new ScrollManager();
    this.pointerDispatcher = new PointerEventDispatcher(
      () => this.treeManager.getTree(),
      {
        scrollManager: this.scrollManager,
      },
    );
  }

  /**
   * Initialize the engine: load yoga, build tree, compute layout.
   * Must be called (and awaited) before render().
   */
  async init(): Promise<void> {
    await initYoga();
    this.ctx = this.adapter.createCanvasContext(this.canvas);
    this.treeManager.buildFromDescriptor(this.layout);
    this.applyLayoutConstraints();
    this.treeManager.computeLayout();
    this.syncCanvasSizeFromLayout();
    computeScrollContentSizes(this.treeManager.getTree(), this.scrollManager);
    this.resetAnimations();
    this.applyMotionsFromDescriptor(this.layout);
    this.applyEventsFromDescriptor(this.layout);

    if (
      this.adapter instanceof H5Adapter ||
      this.adapter instanceof WxAdapter
    ) {
      this.adapter.setRenderCallback(() => {
        this.render();
        this.emitter.emit("imageLoaded");
      });
    }

    // Setup wheel event for ScrollView scrolling (H5)
    if (this.adapter.name === "h5") {
      this.setupWheelHandler();
    }

    this.initialized = true;
    this.emitter.emit("ready");
  }

  setSize(size: { width?: number; height?: number | null }): void {
    if (
      typeof size.width === "number" &&
      Number.isFinite(size.width) &&
      size.width > 0
    ) {
      this.explicitWidth = size.width;
      this.logicalWidth = size.width;
    }
    if (size.height === null) {
      this.explicitHeight = undefined;
    } else if (
      typeof size.height === "number" &&
      Number.isFinite(size.height) &&
      size.height > 0
    ) {
      this.explicitHeight = size.height;
      this.logicalHeight = size.height;
    }

    if (!this.initialized) return;
    this.applyLayoutConstraints();
    this.treeManager.computeLayout();
    this.syncCanvasSizeFromLayout();
    computeScrollContentSizes(this.treeManager.getTree(), this.scrollManager);
    this.render();
    this.emitter.emit("update");
  }

  /**
   * Render the current tree onto the canvas.
   */
  render(): void {
    if (!this.ctx) return;

    const w = this.logicalWidth * this.pixelRatio;
    const h = this.logicalHeight * this.pixelRatio;

    // Setup canvas dimensions for H5
    if (this.adapter.name === "h5") {
      const el = this.canvas as HTMLCanvasElement;
      el.width = w;
      el.height = h;
    }

    this.ctx.save();
    this.ctx.scale(this.pixelRatio, this.pixelRatio);

    const getImage = this.createImageGetter();
    renderTree(
      this.ctx,
      this.treeManager.getTree(),
      this.logicalWidth,
      this.logicalHeight,
      {
        getImage,
        scrollManager: this.scrollManager,
        getNodeOverride: (nodeId) => this.nodeOverrides.get(nodeId) ?? null,
      },
    );

    this.ctx.restore();
    this.emitter.emit("render");
  }

  /**
   * Update the layout descriptor and re-render.
   */
  async update(layout: NodeDescriptor): Promise<void> {
    this.layout = layout;
    this.treeManager.buildFromDescriptor(layout);
    this.applyLayoutConstraints();
    this.treeManager.computeLayout();
    this.syncCanvasSizeFromLayout();
    computeScrollContentSizes(this.treeManager.getTree(), this.scrollManager);
    this.resetAnimations();
    this.applyMotionsFromDescriptor(layout);
    this.applyEventsFromDescriptor(layout);
    this.render();
    this.emitter.emit("update");
  }

  // --- Node tree access ---

  getNodeTree(): NodeTree {
    return this.treeManager.getTree();
  }

  getNodeById(id: string): CanvasNode | null {
    return this.treeManager.getNodeById(id);
  }

  getRootNode(): CanvasNode | null {
    return this.treeManager.getRootNode();
  }

  // --- Node mutations ---

  updateFlexStyle(nodeId: string, updates: Partial<FlexStyle>): void {
    this.treeManager.updateFlexStyle(nodeId, updates);
    this.syncAfterTreeMutation();
  }

  updateVisualStyle(nodeId: string, updates: Partial<VisualStyle>): void {
    this.treeManager.updateVisualStyle(nodeId, updates);
    this.syncAfterTreeMutation();
  }

  updateTextProps(nodeId: string, updates: Partial<TextProps>): void {
    this.treeManager.updateTextProps(nodeId, updates);
    this.syncAfterTreeMutation();
  }

  updateImageProps(nodeId: string, updates: Partial<ImageProps>): void {
    this.treeManager.updateImageProps(nodeId, updates);
    this.syncAfterTreeMutation();
  }

  setNodeOverride(nodeId: string, override: YogaNodeOverride): void {
    this.mergeNodeOverride(nodeId, override);
    this.render();
  }

  clearNodeOverride(nodeId: string): void {
    if (!this.nodeOverrides.has(nodeId)) return;
    this.nodeOverrides.delete(nodeId);
    this.render();
  }

  restoreNode(
    nodeRef: YogaNodeRef,
    mode: "initial" | "clear" = "initial",
  ): void {
    const nodeId = this.resolveNodeId(nodeRef);
    if (!nodeId) return;
    if (mode === "clear") {
      this.nodeOverrides.delete(nodeId);
      this.render();
      return;
    }
    const initial = this.motionInitialOverrides.get(nodeId) ?? null;
    if (!initial) return;
    this.nodeOverrides.set(nodeId, {
      ...(this.nodeOverrides.get(nodeId) ?? {}),
      ...initial,
      ...(initial.visualStyle
        ? {
            visualStyle: {
              ...(this.nodeOverrides.get(nodeId)?.visualStyle ?? {}),
              ...(initial.visualStyle ?? {}),
            },
          }
        : null),
      ...(initial.textProps
        ? {
            textProps: {
              ...(this.nodeOverrides.get(nodeId)?.textProps ?? {}),
              ...(initial.textProps ?? {}),
            },
          }
        : null),
      ...(initial.imageProps
        ? {
            imageProps: {
              ...(this.nodeOverrides.get(nodeId)?.imageProps ?? {}),
              ...(initial.imageProps ?? {}),
            },
          }
        : null),
    });
    this.render();
  }

  animate(
    nodeRef: YogaNodeRef,
    patch: YogaAnimationPatch,
    options: YogaAnimateOptions = {},
  ): YogaAnimationHandle {
    const nodeId = this.resolveNodeId(nodeRef);
    if (!nodeId) {
      return { stop: () => {}, finished: Promise.resolve(), restore: () => {} };
    }

    const node = this.treeManager.getNodeById(nodeId);
    if (!node) {
      return { stop: () => {}, finished: Promise.resolve(), restore: () => {} };
    }

    const prev = this.activeAnimationStops.get(nodeId);
    if (prev) prev.stop();
    const token = Symbol("anim");

    const duration = options.duration ?? 350;
    const delay = options.delay ?? 0;
    const easing = options.easing ?? "cubicInOut";
    const repeat = options.repeat ?? 0;
    const yoyo = options.yoyo ?? false;
    const autoClear = options.autoClear ?? false;
    const restoreOnFinish = options.restoreOnFinish ?? false;

    let resolveFinished: (() => void) | null = null;
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });

    const tweenParts: Array<{
      tween: TWEEN.Tween<Record<string, number>>;
      stop: () => void;
    }> = [];

    let pendingTweens = 0;
    let finalized = false;
    const finalize = () => {
      if (finalized) return;
      finalized = true;
      if (this.activeAnimationStops.get(nodeId)?.token === token) {
        this.activeAnimationStops.delete(nodeId);
      }
      if (restoreOnFinish) {
        this.restoreNode(nodeId, "initial");
      } else if (autoClear) {
        this.nodeOverrides.delete(nodeId);
      }
      if (resolveFinished) {
        resolveFinished();
        resolveFinished = null;
      }
    };

    const stopAll = () => {
      for (const part of tweenParts) part.stop();
      tweenParts.length = 0;
      pendingTweens = 0;
      finalize();
    };
    this.activeAnimationStops.set(nodeId, { token, stop: stopAll });

    const startNumericTween = (input: {
      kind: "visualStyle" | "textProps";
      base: Record<string, unknown> | null | undefined;
      patch: Record<string, unknown> | null | undefined;
    }): void => {
      if (!input.patch) return;

      const base = input.base ?? {};
      const from: Record<string, number> = {};
      const to: Record<string, number> = {};
      const nonNumeric: Record<string, unknown> = {};

      for (const [k, v] of Object.entries(input.patch)) {
        if (typeof v === "number" && Number.isFinite(v)) {
          const baseValue = base[k];
          from[k] =
            typeof baseValue === "number" && Number.isFinite(baseValue)
              ? baseValue
              : 0;
          to[k] = v;
          continue;
        }
        if (v !== undefined) nonNumeric[k] = v;
      }

      if (Object.keys(nonNumeric).length) {
        const prev = this.nodeOverrides.get(nodeId) ?? {};
        const next: YogaNodeOverride =
          input.kind === "visualStyle"
            ? {
                ...prev,
                visualStyle: {
                  ...(prev.visualStyle ?? {}),
                  ...(nonNumeric as Partial<VisualStyle>),
                },
              }
            : {
                ...prev,
                textProps: {
                  ...(prev.textProps ?? {}),
                  ...(nonNumeric as Partial<TextProps>),
                },
              };
        this.nodeOverrides.set(nodeId, next);
      }

      const numericKeys = Object.keys(to);
      if (!numericKeys.length) return;

      const state: Record<string, number> = { ...from };

      const tween = new TWEEN.Tween(state, this.tweenGroup)
        .to(to, duration)
        .delay(delay)
        .easing(this.mapEasing(easing));
      if (repeat !== 0) tween.repeat(repeat < 0 ? Infinity : repeat);
      if (yoyo) tween.yoyo(true);

      const syncOverrideFromState = (): void => {
        const curr = this.nodeOverrides.get(nodeId) ?? {};
        if (input.kind === "visualStyle") {
          this.nodeOverrides.set(nodeId, {
            ...curr,
            visualStyle: {
              ...(curr.visualStyle ?? {}),
              ...state,
            } as Partial<VisualStyle>,
          });
        } else {
          this.nodeOverrides.set(nodeId, {
            ...curr,
            textProps: {
              ...(curr.textProps ?? {}),
              ...state,
            } as Partial<TextProps>,
          });
        }
      };

      // Fix yoyo boundary flicker in a deterministic way:
      // at repeat boundaries tween.js can cause a 1-frame large jump (≈ full range) in the animated value.
      // We suppress such jumps by clamping to the previous frame's value.
      const prevValues: Record<string, number> = { ...state };

      tween.onUpdate(() => {
        if (yoyo && repeat !== 0) {
          for (const k of numericKeys) {
            const prev = prevValues[k];
            const curr = state[k];
            const range = Math.abs((to[k] ?? 0) - (from[k] ?? 0));
            if (range > 0) {
              const delta = Math.abs(curr - prev);
              // If we see a sudden jump close to the full range, treat it as a boundary glitch.
              if (delta > range * 0.9) {
                state[k] = prev;
                continue;
              }
            }
            prevValues[k] = state[k];
          }
        } else {
          for (const k of numericKeys) prevValues[k] = state[k];
        }

        syncOverrideFromState();
      });

      const stop = () => {
        tween.stop();
        this.tweenGroup.remove(tween);
        this.activeTweens.delete(tween);
      };

      tween.onComplete(() => {
        this.activeTweens.delete(tween);
        pendingTweens = Math.max(0, pendingTweens - 1);
        if (pendingTweens === 0) finalize();
      });

      this.activeTweens.add(tween);
      pendingTweens += 1;
      tween.start();
      tweenParts.push({ tween, stop });
    };

    const mergedVisualBase = {
      ...node.visualStyle,
      ...(this.nodeOverrides.get(nodeId)?.visualStyle ?? {}),
    } as Record<string, unknown>;

    const mergedTextBase =
      node.type === "text"
        ? ({
            ...(node.textProps ?? {}),
            ...(this.nodeOverrides.get(nodeId)?.textProps ?? {}),
          } as Record<string, unknown>)
        : null;

    startNumericTween({
      kind: "visualStyle",
      base: mergedVisualBase,
      patch: patch.visualStyle as Record<string, unknown>,
    });
    startNumericTween({
      kind: "textProps",
      base: mergedTextBase,
      patch: patch.textProps as Record<string, unknown>,
    });

    if (patch.imageProps) {
      const prev = this.nodeOverrides.get(nodeId) ?? {};
      this.nodeOverrides.set(nodeId, {
        ...prev,
        imageProps: { ...(prev.imageProps ?? {}), ...patch.imageProps },
      });
    }

    this.startAnimationLoop();
    if (pendingTweens === 0) finalize();

    return {
      stop: stopAll,
      finished,
      restore: (mode: "initial" | "clear" = "initial") =>
        this.restoreNode(nodeId, mode),
    };
  }

  addChild(parentId: string, descriptor: NodeDescriptor): void {
    this.treeManager.addChild(parentId, descriptor);
    this.syncAfterTreeMutation();
  }

  deleteNode(nodeId: string): void {
    this.treeManager.deleteNode(nodeId);
    this.syncAfterTreeMutation();
  }

  moveNode(nodeId: string, newParentId: string, insertIndex?: number): void {
    this.treeManager.moveNode(nodeId, newParentId, insertIndex);
    this.syncAfterTreeMutation();
  }

  // --- Undo/Redo ---

  undo(): boolean {
    const result = this.treeManager.undo();
    if (result) {
      this.treeManager.computeLayout();
      this.syncAfterTreeMutation();
      return true;
    }
    return false;
  }

  redo(): boolean {
    const result = this.treeManager.redo();
    if (result) {
      this.treeManager.computeLayout();
      this.syncAfterTreeMutation();
      return true;
    }
    return false;
  }

  get canUndo(): boolean {
    return this.treeManager.canUndo;
  }

  get canRedo(): boolean {
    return this.treeManager.canRedo;
  }

  // --- Export APIs ---

  toJSON(): string {
    return exportToJSON(this.treeManager.getTree());
  }

  loadJSON(json: string): void {
    const tree = importFromJSON(json);
    this.treeManager.loadFromTree(tree);
    this.applyLayoutConstraints();
    this.syncCanvasSizeFromLayout();
    computeScrollContentSizes(this.treeManager.getTree(), this.scrollManager);
    this.resetAnimations();
    this.applyMotionsFromTree(this.treeManager.getTree());
    this.applyEventsFromTree(this.treeManager.getTree());
    this.render();
  }

  toDOMString(): string {
    return exportToDOMString(this.treeManager.getTree());
  }

  async toDataURL(
    type = "image/png",
    quality = 1,
    options?: { scale?: number },
  ): Promise<string> {
    const scale = options?.scale ?? 1;
    if (!Number.isFinite(scale) || scale <= 1.00001) {
      return exportToDataURL(this.adapter, this.canvas, type, quality);
    }

    if (this.adapter.name !== "h5") {
      return exportToDataURL(this.adapter, this.canvas, type, quality);
    }

    if (typeof document === "undefined") {
      return exportToDataURL(this.adapter, this.canvas, type, quality);
    }

    const canvas = document.createElement("canvas");
    this.renderToCanvas(canvas, scale);
    return this.adapter.canvasToDataURL(canvas, type, quality);
  }

  async toTempFilePath(options?: Record<string, unknown>): Promise<string> {
    if (this.adapter.canvasToTempFilePath) {
      return exportToTempFilePath(this.adapter, this.canvas, options);
    }
    return this.toDataURL("image/png", 1);
  }

  async canvasToTempFilePath(
    options?: Record<string, unknown>,
  ): Promise<string> {
    return this.toTempFilePath(options);
  }

  // --- Events ---

  on(event: string, handler: EventHandler): void {
    this.emitter.on(event, handler);
  }

  off(event: string, handler: EventHandler): void {
    this.emitter.off(event, handler);
  }

  addEventListener(
    nodeId: string,
    type: CanvasPointerEventType,
    handler: CanvasPointerEventHandler,
    options?: CanvasPointerEventListenerOptions,
  ): void {
    this.pointerDispatcher.addEventListener(nodeId, type, handler, options);
  }

  removeEventListener(
    nodeId: string,
    type: CanvasPointerEventType,
    handler: CanvasPointerEventHandler,
  ): void {
    this.pointerDispatcher.removeEventListener(nodeId, type, handler);
  }

  dispatchPointerEvent(
    input: CanvasPointerEventInput,
  ): CanvasPointerEventDispatchResult {
    const dispatched = this.pointerDispatcher.dispatchPointerEvent(input);

    if (this.adapter.name === "h5" && input.type === "pointermove") {
      const el = this.canvas as HTMLCanvasElement;
      if (el && typeof (el as unknown as { style?: unknown }).style === "object") {
        let pointer = false;
        for (let i = dispatched.path.length - 1; i >= 0; i--) {
          const id = dispatched.path[i];
          if (!id || id === CANVAS_EVENT_TARGET_ID) continue;
          const types = this.boundEventTypesByNodeId.get(id);
          if (types && types.has("click")) {
            pointer = true;
            break;
          }
        }
        el.style.cursor = pointer ? "pointer" : "";
      }
    }

    return dispatched;
  }

  // --- Lifecycle ---

  get isInitialized(): boolean {
    return this.initialized;
  }

  /** Get the underlying platform adapter. */
  getAdapter(): PlatformAdapter {
    return this.adapter;
  }

  /** Get the internal tree manager (for advanced use). */
  getTreeManager(): NodeTreeManager {
    return this.treeManager;
  }

  /** Get the scroll manager. */
  getScrollManager(): ScrollManager {
    return this.scrollManager;
  }

  destroy(): void {
    this.resetAnimations();
    this.treeManager.destroy();
    this.scrollManager.reset();
    this.emitter.removeAllListeners();
    this.pointerDispatcher.removeAllListeners();
    if (
      this.adapter instanceof H5Adapter ||
      this.adapter instanceof WxAdapter
    ) {
      this.adapter.setRenderCallback(null);
    }
    // Remove wheel listener
    if (this.wheelHandler && this.adapter.name === "h5") {
      (this.canvas as HTMLCanvasElement).removeEventListener(
        "wheel",
        this.wheelHandler,
      );
      this.wheelHandler = null;
    }
    // Clear all scrollbar fade-out timers
    for (const timer of this.scrollBarTimers.values()) {
      clearTimeout(timer);
    }
    this.scrollBarTimers.clear();
    this.ctx = null;
    this.initialized = false;
    this.emitter.emit("destroy");
  }

  private syncAfterTreeMutation(): void {
    this.syncCanvasSizeFromLayout();
    computeScrollContentSizes(this.treeManager.getTree(), this.scrollManager);
    this.render();
  }

  private resetAnimations(): void {
    this.clearBoundEvents();
    for (const tween of this.activeTweens) {
      tween.stop();
      this.tweenGroup.remove(tween);
    }
    this.activeTweens.clear();
    this.nodeOverrides.clear();
    this.motionInitialOverrides.clear();
    this.tweenGroup.removeAll();
    this.stopAnimationLoop();
  }

  private startAnimationLoop(): void {
    if (this.animationRunning) return;
    this.animationRunning = true;
    const tick = () => {
      if (!this.animationRunning) return;
      const time = this.nowMs();
      this.tweenGroup.update(time);
      const hasTweens = this.activeTweens.size > 0;
      if (hasTweens || this.hadTweensLastTick) {
        this.render();
      }
      this.hadTweensLastTick = hasTweens;
      if (!hasTweens) {
        this.stopAnimationLoop();
        return;
      }
      this.animationFrameHandle = this.requestFrame(tick);
    };
    this.animationFrameHandle = this.requestFrame(tick);
  }

  private stopAnimationLoop(): void {
    if (!this.animationRunning) return;
    this.animationRunning = false;
    this.hadTweensLastTick = false;
    if (this.animationFrameHandle !== null) {
      this.cancelFrame(this.animationFrameHandle);
      this.animationFrameHandle = null;
    }
  }

  private nowMs(): number {
    const perf = typeof performance !== "undefined" ? performance : null;
    if (perf && typeof perf.now === "function") return perf.now();
    return Date.now();
  }

  private requestFrame(cb: () => void): number | ReturnType<typeof setTimeout> {
    const raf = (
      globalThis as unknown as {
        requestAnimationFrame?: (cb: () => void) => number;
      }
    ).requestAnimationFrame;
    if (typeof raf === "function") return raf(cb);
    return setTimeout(cb, 16);
  }

  private cancelFrame(handle: number | ReturnType<typeof setTimeout>): void {
    const caf = (
      globalThis as unknown as { cancelAnimationFrame?: (id: number) => void }
    ).cancelAnimationFrame;
    if (typeof handle === "number" && typeof caf === "function") {
      caf(handle);
      return;
    }
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  }

  private resolveNodeId(ref: YogaNodeRef): string | null {
    if (typeof ref === "string") return ref;
    if (ref.id) return ref.id;
    const name = ref.name?.trim();
    if (!name) return null;
    const tree = this.treeManager.getTree();
    for (const [id, node] of Object.entries(tree.nodes)) {
      if (node?.name === name) return id;
    }
    return null;
  }

  private mergeNodeOverride(nodeId: string, override: YogaNodeOverride): void {
    const prev = this.nodeOverrides.get(nodeId) ?? {};
    const next: YogaNodeOverride = {
      ...prev,
      ...(override.visualStyle
        ? {
            visualStyle: {
              ...(prev.visualStyle ?? {}),
              ...override.visualStyle,
            },
          }
        : {}),
      ...(override.textProps
        ? { textProps: { ...(prev.textProps ?? {}), ...override.textProps } }
        : {}),
      ...(override.imageProps
        ? { imageProps: { ...(prev.imageProps ?? {}), ...override.imageProps } }
        : {}),
    };
    this.nodeOverrides.set(nodeId, next);
  }

  private applyMotionToNode(
    nodeId: string,
    motion: NonNullable<NodeDescriptor["motion"]>,
  ): void {
    const node = this.treeManager.getNodeById(nodeId);
    if (!node) return;

    // Build complete initial state by merging user-provided initial with defaults from animate
    const animate = motion.animate;
    if (animate) {
      const initial: YogaNodeOverride = {};

      if (animate.visualStyle) {
        const animateKeys = Object.keys(animate.visualStyle) as Array<
          keyof typeof animate.visualStyle
        >;
        const initialVisual: Partial<VisualStyle> = {};

        for (const key of animateKeys) {
          if (motion.initial?.visualStyle?.[key] !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialVisual[key] = motion.initial.visualStyle[key] as any;
          } else if (node.visualStyle[key] !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialVisual[key] = node.visualStyle[key] as any;
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialVisual[key] = (key === "scaleX" || key === "scaleY" ? 1 : 0) as any;
          }
        }

        if (Object.keys(initialVisual).length) {
          initial.visualStyle = initialVisual;
        }
      }

      if (animate.textProps && node.type === "text") {
        const animateKeys = Object.keys(animate.textProps) as Array<
          keyof typeof animate.textProps
        >;
        const initialText: Partial<NonNullable<typeof node.textProps>> = {};

        for (const key of animateKeys) {
          if (motion.initial?.textProps?.[key] !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialText[key] = motion.initial.textProps[key] as any;
          } else if (node.textProps?.[key] !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialText[key] = node.textProps[key] as any;
          }
        }

        if (Object.keys(initialText).length) {
          initial.textProps = initialText;
        }
      }

      if (animate.imageProps && node.type === "image") {
        const animateKeys = Object.keys(animate.imageProps) as Array<
          keyof typeof animate.imageProps
        >;
        const initialImage: Partial<NonNullable<typeof node.imageProps>> = {};

        for (const key of animateKeys) {
          if (motion.initial?.imageProps?.[key] !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialImage[key] = motion.initial.imageProps[key] as any;
          } else if (node.imageProps?.[key] !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialImage[key] = node.imageProps[key] as any;
          }
        }

        if (Object.keys(initialImage).length) {
          initial.imageProps = initialImage;
        }
      }

      if (Object.keys(initial).length) {
        this.motionInitialOverrides.set(nodeId, initial);
        this.mergeNodeOverride(nodeId, initial);
      }
    }

    const transition: MotionTransition = motion.transition ?? {};
    const autoStart = transition.autoStart ?? true;
    if (autoStart && animate) {
      this.animate(
        { id: nodeId },
        {
          visualStyle: animate.visualStyle,
          textProps: animate.textProps,
          imageProps: animate.imageProps,
        },
        {
          duration: transition.duration,
          delay: transition.delay,
          easing: transition.easing,
          repeat: transition.repeat,
          yoyo: transition.yoyo,
          autoClear: transition.autoClear,
          restoreOnFinish: transition.restoreOnFinish,
        },
      );
    }
  }

  private applyEventsFromDescriptor(descriptor: NodeDescriptor): void {
    this.clearBoundEvents();
    const walk = (node: NodeDescriptor): void => {
      const nodeId = this.resolveNodeId({ id: node.id, name: node.name });
      if (nodeId) {
        const events = node.events ?? null;
        const hasOnClick = typeof node.onClick === "function";

        if (events && typeof events === "object") {
          for (const [type, actions] of Object.entries(events)) {
            if (!actions || actions.length === 0) continue;
            const handler: CanvasPointerEventHandler = (e) =>
              this.runActions(actions, e);
            this.bindEvent(nodeId, type as CanvasPointerEventType, handler);
          }
        }

        if (hasOnClick) {
          const handler: CanvasPointerEventHandler = (e) => {
            node.onClick?.(e);
            const actions = node.events?.click ?? null;
            if (actions && actions.length) this.runActions(actions, e);
          };
          this.bindEvent(nodeId, "click", handler);
        }
      }
      for (const child of node.children ?? []) walk(child);
    };
    walk(descriptor);
  }

  private applyEventsFromTree(tree: NodeTree): void {
    this.clearBoundEvents();
    for (const node of Object.values(tree.nodes)) {
      if (!node) continue;
      const events = node.events ?? null;
      if (!events || typeof events !== "object") continue;
      for (const [type, actions] of Object.entries(events)) {
        if (!actions || actions.length === 0) continue;
        const handler: CanvasPointerEventHandler = (e) =>
          this.runActions(actions, e);
        this.bindEvent(node.id, type as CanvasPointerEventType, handler);
      }
    }
  }

  private bindEvent(
    nodeId: string,
    type: CanvasPointerEventType,
    handler: CanvasPointerEventHandler,
  ): void {
    const key = `${nodeId}:${type}`;
    const existing = this.boundEventHandlers.get(key);
    if (existing) {
      this.pointerDispatcher.removeEventListener(
        existing.nodeId,
        existing.type,
        existing.handler,
      );
    }
    this.pointerDispatcher.addEventListener(nodeId, type, handler);
    this.boundEventHandlers.set(key, { nodeId, type, handler });

    const set = this.boundEventTypesByNodeId.get(nodeId) ?? new Set();
    set.add(type);
    this.boundEventTypesByNodeId.set(nodeId, set);
  }

  private clearBoundEvents(): void {
    for (const { nodeId, type, handler } of this.boundEventHandlers.values()) {
      this.pointerDispatcher.removeEventListener(nodeId, type, handler);
    }
    this.boundEventHandlers.clear();
    this.boundEventTypesByNodeId.clear();
  }

  private runActions(actions: NodeAction[], e: unknown): void {
    for (const action of actions) {
      this.runAction(action, e);
    }
  }

  private runAction(action: NodeAction, e: unknown): void {
    if (action.type === "emit") {
      this.emitter.emit(action.event, { payload: action.payload, event: e });
      return;
    }

    const targetId = this.resolveNodeId(action.target);
    if (!targetId) return;

    if (action.type === "animate") {
      this.animate({ id: targetId }, action.patch, action.options ?? {});
      return;
    }

    if (action.type === "playMotion") {
      const node = this.treeManager.getNodeById(targetId);
      const motion = node?.motion;
      const animate = motion?.animate ?? null;
      if (!node || !animate) return;
      const transition = motion?.transition ?? {};
      const merged = { ...transition, ...(action.options ?? {}) };
      this.restoreNode({ id: targetId }, "initial");
      this.animate(
        { id: targetId },
        {
          visualStyle: animate.visualStyle,
          textProps: animate.textProps,
          imageProps: animate.imageProps,
        },
        {
          duration: merged.duration,
          delay: merged.delay,
          easing: merged.easing,
          repeat: merged.repeat,
          yoyo: merged.yoyo,
          autoClear: merged.autoClear,
          restoreOnFinish: (merged as MotionTransition & { restoreOnFinish?: boolean }).restoreOnFinish,
        },
      );
    }
  }

  private renderToCanvas(target: unknown, scale: number): void {
    const ctx = this.adapter.createCanvasContext(target);
    const w = this.logicalWidth * this.pixelRatio * scale;
    const h = this.logicalHeight * this.pixelRatio * scale;

    if (this.adapter.name === "h5") {
      const el = target as HTMLCanvasElement;
      el.width = w;
      el.height = h;
    }

    ctx.save();
    ctx.scale(this.pixelRatio * scale, this.pixelRatio * scale);
    const getImage = this.createImageGetter();
    renderTree(ctx, this.treeManager.getTree(), this.logicalWidth, this.logicalHeight, {
      getImage,
      scrollManager: this.scrollManager,
      getNodeOverride: (nodeId) => this.nodeOverrides.get(nodeId) ?? null,
    });
    ctx.restore();
  }

  private applyMotionsFromDescriptor(descriptor: NodeDescriptor): void {
    const walk = (node: NodeDescriptor): void => {
      const motion = node.motion;
      if (motion) {
        const nodeId = this.resolveNodeId({ id: node.id, name: node.name });
        if (nodeId) {
          this.applyMotionToNode(nodeId, motion);
        }
      }
      for (const child of node.children ?? []) walk(child);
    };
    walk(descriptor);
  }

  private applyMotionsFromTree(tree: NodeTree): void {
    for (const node of Object.values(tree.nodes)) {
      if (!node) continue;
      const motion = node.motion;
      if (!motion) continue;
      this.applyMotionToNode(node.id, motion);
    }
  }

  private mapEasing(name: MotionEasing): (t: number) => number {
    switch (name) {
      case "linear":
        return TWEEN.Easing.Linear.None;
      case "quadIn":
        return TWEEN.Easing.Quadratic.In;
      case "quadOut":
        return TWEEN.Easing.Quadratic.Out;
      case "quadInOut":
        return TWEEN.Easing.Quadratic.InOut;
      case "cubicIn":
        return TWEEN.Easing.Cubic.In;
      case "cubicOut":
        return TWEEN.Easing.Cubic.Out;
      case "cubicInOut":
        return TWEEN.Easing.Cubic.InOut;
      case "sinIn":
        return TWEEN.Easing.Sinusoidal.In;
      case "sinOut":
        return TWEEN.Easing.Sinusoidal.Out;
      case "sinInOut":
        return TWEEN.Easing.Sinusoidal.InOut;
      default:
        return TWEEN.Easing.Cubic.InOut;
    }
  }

  // --- Private ---

  private setupWheelHandler(): void {
    const el = this.canvas as HTMLCanvasElement;
    this.wheelHandler = (e: WheelEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const tree = this.treeManager.getTree();
      const dispatched = this.pointerDispatcher.dispatchPointerEvent({
        type: "wheel",
        x,
        y,
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        timeStamp: typeof e.timeStamp === "number" ? e.timeStamp : Date.now(),
      });
      if (dispatched.defaultPrevented) {
        e.preventDefault();
        return;
      }

      let scrollViewId: string | null = null;
      for (let i = dispatched.path.length - 1; i >= 0; i--) {
        const id = dispatched.path[i];
        if (id === CANVAS_EVENT_TARGET_ID) continue;
        const node = tree.nodes[id];
        if (node?.type === "scrollview") {
          scrollViewId = id;
          break;
        }
      }

      if (!scrollViewId) return;

      const node = tree.nodes[scrollViewId];
      const isVertical =
        node?.scrollViewProps?.scrollDirection !== "horizontal";
      const delta = isVertical ? e.deltaY : e.deltaX;

      const changed = this.scrollManager.scroll(
        scrollViewId,
        isVertical ? 0 : delta,
        isVertical ? delta : 0,
      );

      if (changed) {
        e.preventDefault();
        // Show scrollbar and schedule fade-out
        this.scrollManager.showScrollBar(scrollViewId);
        this.scheduleScrollBarFadeOut(scrollViewId);
        this.render();
        this.emitter.emit(
          "scroll",
          scrollViewId,
          this.scrollManager.getOffset(scrollViewId),
        );
      }
    };
    el.addEventListener("wheel", this.wheelHandler, { passive: false });
  }

  private scheduleScrollBarFadeOut(nodeId: string): void {
    // Clear existing timer for this node
    const existing = this.scrollBarTimers.get(nodeId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.scrollBarTimers.delete(nodeId);
      this.scrollManager.setScrollBarOpacity(nodeId, 0);
      this.render();
    }, 800);
    this.scrollBarTimers.set(nodeId, timer);
  }

  private createImageGetter(): (src: string) => CanvasImageLike | null {
    if (this.adapter instanceof H5Adapter) {
      return (src: string) =>
        this.adapter instanceof H5Adapter
          ? (this.adapter as H5Adapter).getCachedImage(src)
          : null;
    }
    if (this.adapter instanceof WxAdapter) {
      return (src: string) =>
        this.adapter instanceof WxAdapter
          ? (this.adapter as WxAdapter).getCachedImage(src)
          : null;
    }
    return () => null;
  }

  private applyLayoutConstraints(): void {
    const root = this.treeManager.getRootNode();
    const rootWidth = root?.flexStyle.width;
    const rootHeight = root?.flexStyle.height;

    const width =
      this.explicitWidth ??
      (typeof rootWidth === "number" &&
      Number.isFinite(rootWidth) &&
      rootWidth > 0
        ? rootWidth
        : undefined) ??
      this.logicalWidth;

    const autoHeight = this.shouldAutoFitHeight(root);
    const height = autoHeight
      ? null
      : this.explicitHeight ??
        (typeof rootHeight === "number" &&
        Number.isFinite(rootHeight) &&
        rootHeight > 0
          ? rootHeight
          : undefined) ??
        this.logicalHeight;

    this.logicalWidth = width;
    if (typeof height === "number") {
      this.logicalHeight = height;
    }

    this.treeManager.setLayoutConstraints({ width, height });
  }

  private shouldAutoFitHeight(root: CanvasNode | null): boolean {
    if (
      typeof this.explicitHeight === "number" &&
      Number.isFinite(this.explicitHeight) &&
      this.explicitHeight > 0
    ) {
      return false;
    }
    const h = root?.flexStyle.height;
    if (h === "auto") return true;
    const minH = root?.flexStyle.minHeight;
    if (h === undefined && minH !== undefined) return true;
    return false;
  }

  private syncCanvasSizeFromLayout(): void {
    const root = this.treeManager.getRootNode();
    if (!root) return;

    if (this.shouldAutoFitHeight(root)) {
      const nextHeight = root.computedLayout.height;
      if (
        typeof nextHeight === "number" &&
        Number.isFinite(nextHeight) &&
        nextHeight > 0
      ) {
        this.logicalHeight = nextHeight;
      }
    }

    const next = { width: this.logicalWidth, height: this.logicalHeight };
    const prev = this.lastEmittedSize;
    if (!prev || prev.width !== next.width || prev.height !== next.height) {
      this.lastEmittedSize = next;
      this.emitter.emit("resize", next);
    }
  }
}

/**
 * Create a YogaCanvas instance.
 * This is the main entry point for the library.
 */
export function createYogaCanvas(
  canvas: unknown,
  layout: NodeDescriptor,
  options?: YogaCanvasOptions,
): YogaCanvas {
  return new YogaCanvas(canvas, layout, options);
}
