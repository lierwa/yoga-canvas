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
} from './types';
import { initYoga, computeScrollContentSizes } from './layout';
import { renderTree } from './renderer';
import { NodeTreeManager } from './tree';
import { ScrollManager } from './scroll';
import { EventEmitter, hitTestAll } from './events';
import type { EventHandler } from './events';
import { exportToJSON, importFromJSON, exportToDOMString } from './export';
import { exportToDataURL, exportToTempFilePath } from './export';
import { H5Adapter } from './platform/H5Adapter';
import { WxAdapter } from './platform/WxAdapter';

export interface YogaCanvasOptions {
  /** Platform: 'h5' (default) or 'wx'. */
  platform?: 'h5' | 'wx';
  /** Device pixel ratio. Defaults to 1. */
  pixelRatio?: number;
  /** Canvas logical width. */
  width?: number;
  /** Canvas logical height. */
  height?: number;
  /** Custom platform adapter (overrides `platform` option). */
  adapter?: PlatformAdapter;
}

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
  private layout: NodeDescriptor;
  private pixelRatio: number;
  private logicalWidth: number;
  private logicalHeight: number;
  private explicitWidth: number | undefined;
  private explicitHeight: number | undefined;
  private lastEmittedSize: { width: number; height: number } | null = null;
  private initialized = false;
  private wheelHandler: ((e: WheelEvent) => void) | null = null;
  private scrollBarTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(canvas: unknown, layout: NodeDescriptor, options: YogaCanvasOptions = {}) {
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
    } else if (options.platform === 'wx') {
      this.adapter = new WxAdapter();
    } else {
      this.adapter = new H5Adapter();
    }

    this.treeManager = new NodeTreeManager(this.adapter);
    this.scrollManager = new ScrollManager();
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

    if (this.adapter instanceof H5Adapter || this.adapter instanceof WxAdapter) {
      this.adapter.setRenderCallback(() => {
        this.render();
        this.emitter.emit('imageLoaded');
      });
    }

    // Setup wheel event for ScrollView scrolling (H5)
    if (this.adapter.name === 'h5') {
      this.setupWheelHandler();
    }

    this.initialized = true;
    this.emitter.emit('ready');
  }

  setSize(size: { width?: number; height?: number | null }): void {
    if (typeof size.width === 'number' && Number.isFinite(size.width) && size.width > 0) {
      this.explicitWidth = size.width;
      this.logicalWidth = size.width;
    }
    if (size.height === null) {
      this.explicitHeight = undefined;
    } else if (typeof size.height === 'number' && Number.isFinite(size.height) && size.height > 0) {
      this.explicitHeight = size.height;
      this.logicalHeight = size.height;
    }

    if (!this.initialized) return;
    this.applyLayoutConstraints();
    this.treeManager.computeLayout();
    this.syncCanvasSizeFromLayout();
    computeScrollContentSizes(this.treeManager.getTree(), this.scrollManager);
    this.render();
    this.emitter.emit('update');
  }

  /**
   * Render the current tree onto the canvas.
   */
  render(): void {
    if (!this.ctx) return;

    const w = this.logicalWidth * this.pixelRatio;
    const h = this.logicalHeight * this.pixelRatio;

    // Setup canvas dimensions for H5
    if (this.adapter.name === 'h5') {
      const el = this.canvas as HTMLCanvasElement;
      el.width = w;
      el.height = h;
    }

    this.ctx.save();
    this.ctx.scale(this.pixelRatio, this.pixelRatio);

    const getImage = this.createImageGetter();
    renderTree(this.ctx, this.treeManager.getTree(), this.logicalWidth, this.logicalHeight, {
      getImage,
      scrollManager: this.scrollManager,
    });

    this.ctx.restore();
    this.emitter.emit('render');
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
    this.render();
    this.emitter.emit('update');
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
    this.syncCanvasSizeFromLayout();
    computeScrollContentSizes(this.treeManager.getTree(), this.scrollManager);
    this.render();
  }

  updateVisualStyle(nodeId: string, updates: Partial<VisualStyle>): void {
    this.treeManager.updateVisualStyle(nodeId, updates);
    this.syncCanvasSizeFromLayout();
    computeScrollContentSizes(this.treeManager.getTree(), this.scrollManager);
    this.render();
  }

  updateTextProps(nodeId: string, updates: Partial<TextProps>): void {
    this.treeManager.updateTextProps(nodeId, updates);
    this.syncCanvasSizeFromLayout();
    computeScrollContentSizes(this.treeManager.getTree(), this.scrollManager);
    this.render();
  }

  updateImageProps(nodeId: string, updates: Partial<ImageProps>): void {
    this.treeManager.updateImageProps(nodeId, updates);
    this.syncCanvasSizeFromLayout();
    computeScrollContentSizes(this.treeManager.getTree(), this.scrollManager);
    this.render();
  }

  addChild(parentId: string, descriptor: NodeDescriptor): void {
    this.treeManager.addChild(parentId, descriptor);
    this.syncCanvasSizeFromLayout();
    computeScrollContentSizes(this.treeManager.getTree(), this.scrollManager);
    this.render();
  }

  deleteNode(nodeId: string): void {
    this.treeManager.deleteNode(nodeId);
    this.syncCanvasSizeFromLayout();
    computeScrollContentSizes(this.treeManager.getTree(), this.scrollManager);
    this.render();
  }

  moveNode(nodeId: string, newParentId: string, insertIndex?: number): void {
    this.treeManager.moveNode(nodeId, newParentId, insertIndex);
    this.syncCanvasSizeFromLayout();
    computeScrollContentSizes(this.treeManager.getTree(), this.scrollManager);
    this.render();
  }

  // --- Undo/Redo ---

  undo(): boolean {
    const result = this.treeManager.undo();
    if (result) {
      this.treeManager.computeLayout();
      this.syncCanvasSizeFromLayout();
      computeScrollContentSizes(this.treeManager.getTree(), this.scrollManager);
      this.render();
      return true;
    }
    return false;
  }

  redo(): boolean {
    const result = this.treeManager.redo();
    if (result) {
      this.treeManager.computeLayout();
      this.syncCanvasSizeFromLayout();
      computeScrollContentSizes(this.treeManager.getTree(), this.scrollManager);
      this.render();
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
    this.render();
  }

  toDOMString(): string {
    return exportToDOMString(this.treeManager.getTree());
  }

  async toDataURL(type = 'image/png', quality = 1): Promise<string> {
    return exportToDataURL(this.adapter, this.canvas, type, quality);
  }

  async toTempFilePath(options?: Record<string, unknown>): Promise<string> {
    if (this.adapter.canvasToTempFilePath) {
      return exportToTempFilePath(this.adapter, this.canvas, options);
    }
    return this.toDataURL('image/png', 1);
  }

  async canvasToTempFilePath(options?: Record<string, unknown>): Promise<string> {
    return this.toTempFilePath(options);
  }

  // --- Events ---

  on(event: string, handler: EventHandler): void {
    this.emitter.on(event, handler);
  }

  off(event: string, handler: EventHandler): void {
    this.emitter.off(event, handler);
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
    this.treeManager.destroy();
    this.scrollManager.reset();
    this.emitter.removeAllListeners();
    if (this.adapter instanceof H5Adapter || this.adapter instanceof WxAdapter) {
      this.adapter.setRenderCallback(null);
    }
    // Remove wheel listener
    if (this.wheelHandler && this.adapter.name === 'h5') {
      (this.canvas as HTMLCanvasElement).removeEventListener('wheel', this.wheelHandler);
      this.wheelHandler = null;
    }
    // Clear all scrollbar fade-out timers
    for (const timer of this.scrollBarTimers.values()) {
      clearTimeout(timer);
    }
    this.scrollBarTimers.clear();
    this.ctx = null;
    this.initialized = false;
    this.emitter.emit('destroy');
  }

  // --- Private ---

  private setupWheelHandler(): void {
    const el = this.canvas as HTMLCanvasElement;
    this.wheelHandler = (e: WheelEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Find all ScrollView ancestors at this point
      const tree = this.treeManager.getTree();
      const hitNodes = hitTestAll(tree, x, y, { scrollManager: this.scrollManager });

      // Find the innermost ScrollView in the hit path
      let scrollViewId: string | null = null;
      for (let i = hitNodes.length - 1; i >= 0; i--) {
        const node = tree.nodes[hitNodes[i]];
        if (node?.type === 'scrollview') {
          scrollViewId = hitNodes[i];
          break;
        }
      }

      if (!scrollViewId) return;

      const node = tree.nodes[scrollViewId];
      const isVertical = node?.scrollViewProps?.scrollDirection !== 'horizontal';
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
        this.emitter.emit('scroll', scrollViewId, this.scrollManager.getOffset(scrollViewId));
      }
    };
    el.addEventListener('wheel', this.wheelHandler, { passive: false });
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
      return (src: string) => this.adapter instanceof H5Adapter
        ? (this.adapter as H5Adapter).getCachedImage(src)
        : null;
    }
    if (this.adapter instanceof WxAdapter) {
      return (src: string) => this.adapter instanceof WxAdapter
        ? (this.adapter as WxAdapter).getCachedImage(src)
        : null;
    }
    return () => null;
  }

  private applyLayoutConstraints(): void {
    const root = this.treeManager.getRootNode();
    const rootWidth = root?.flexStyle.width;
    const rootHeight = root?.flexStyle.height;

    const width = this.explicitWidth
      ?? (typeof rootWidth === 'number' && Number.isFinite(rootWidth) && rootWidth > 0 ? rootWidth : undefined)
      ?? this.logicalWidth;

    const autoHeight = this.shouldAutoFitHeight(root);
    const height = autoHeight
      ? null
      : (this.explicitHeight
        ?? (typeof rootHeight === 'number' && Number.isFinite(rootHeight) && rootHeight > 0 ? rootHeight : undefined)
        ?? this.logicalHeight);

    this.logicalWidth = width;
    if (typeof height === 'number') {
      this.logicalHeight = height;
    }

    this.treeManager.setLayoutConstraints({ width, height });
  }

  private shouldAutoFitHeight(root: CanvasNode | null): boolean {
    if (typeof this.explicitHeight === 'number' && Number.isFinite(this.explicitHeight) && this.explicitHeight > 0) {
      return false;
    }
    const h = root?.flexStyle.height;
    if (h === 'auto') return true;
    const minH = root?.flexStyle.minHeight;
    if (h === undefined && minH !== undefined) return true;
    return false;
  }

  private syncCanvasSizeFromLayout(): void {
    const root = this.treeManager.getRootNode();
    if (!root) return;

    if (this.shouldAutoFitHeight(root)) {
      const nextHeight = root.computedLayout.height;
      if (typeof nextHeight === 'number' && Number.isFinite(nextHeight) && nextHeight > 0) {
        this.logicalHeight = nextHeight;
      }
    }

    const next = { width: this.logicalWidth, height: this.logicalHeight };
    const prev = this.lastEmittedSize;
    if (!prev || prev.width !== next.width || prev.height !== next.height) {
      this.lastEmittedSize = next;
      this.emitter.emit('resize', next);
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
