import type { FlexStyle, FlexValue } from '../types';
export interface YogaNode {
  setWidth(v: number): void;
  setWidthPercent(v: number): void;
  setWidthAuto(): void;
  setHeight(v: number): void;
  setHeightPercent(v: number): void;
  setHeightAuto(): void;
  setMinWidth(v: number): void;
  setMinWidthPercent(v: number): void;
  setMinHeight(v: number): void;
  setMinHeightPercent(v: number): void;
  setMaxWidth(v: number): void;
  setMaxWidthPercent(v: number): void;
  setMaxHeight(v: number): void;
  setMaxHeightPercent(v: number): void;
  setFlexDirection(n: number): void;
  setJustifyContent(n: number): void;
  setAlignItems(n: number): void;
  setAlignSelf(n: number): void;
  setFlexWrap(n: number): void;
  setFlexBasisAuto(): void;
  setFlexBasis(v: number): void;
  setFlexBasisPercent(v: number): void;
  setFlex(v: number): void;
  setFlexGrow(v: number): void;
  setFlexShrink(v: number): void;
  setGapPercent(edge: number, v: number): void;
  setGap(edge: number, v: number): void;
  setPaddingPercent(edge: number, v: number): void;
  setMarginPercent(edge: number, v: number): void;
  setPadding(edge: number, v: number): void;
  setMargin(edge: number, v: number): void;
  setMarginAuto(edge: number): void;
  setPositionPercent(edge: number, v: number): void;
  setPosition(edge: number, v: number): void;
  setPositionType(n: number): void;
  setMeasureFunc(fn: (width: number, widthMode: number) => { width: number; height: number }): void;
  insertChild(child: YogaNode, index: number): void;
  calculateLayout(w?: number, h?: number, dir?: number): void;
  getComputedLayout(): { left: number; top: number; width: number; height: number };
  free(): void;
}
export interface Yoga {
  Node: { create(): YogaNode };
}

let yogaInstance: Yoga | null = null;
let wasmShimReady = false;

type WxGlobals = typeof globalThis & {
  WXWebAssembly?: {
    instantiate: (path: string, imports?: Record<string, unknown>) => Promise<unknown>;
    Memory?: unknown;
    Table?: unknown;
    Global?: unknown;
  };
  wx?: {
    env?: { USER_DATA_PATH?: string };
    getFileSystemManager?: () => {
      writeFileSync?: (path: string, data: ArrayBufferLike) => void;
    };
  };
};

type YogaEnums = {
  MeasureMode: { Undefined: number; Exactly: number };
  Direction: { LTR: number };
  Edge: Record<string, number>;
  Gutter: Record<string, number>;
  PositionType: { Static: number; Relative: number; Absolute: number };
  FlexDirection: { Row: number; Column: number; RowReverse: number; ColumnReverse: number };
  Justify: { FlexStart: number; Center: number; FlexEnd: number; SpaceBetween: number; SpaceAround: number; SpaceEvenly: number };
  Align: { Auto: number; FlexStart: number; Center: number; FlexEnd: number; Stretch: number };
  Wrap: { NoWrap: number; Wrap: number };
};
type YogaModule = YogaEnums & {
  loadYoga: () => Promise<Yoga>;
};

let MeasureModeEnum: Record<string, number> | null = null;
let DirectionEnum: Record<string, number> | null = null;
let FLEX_DIRECTION_MAP: Record<string, number> | null = null;
let JUSTIFY_MAP: Record<string, number> | null = null;
let ALIGN_MAP: Record<string, number> | null = null;
let WRAP_MAP: Record<string, number> | null = null;
let EDGE_ENUM: Record<string, number> | null = null;
let GUTTER_ENUM: Record<string, number> | null = null;
let POSITION_TYPE_ENUM: Record<string, number> | null = null;

function ensureWebAssemblyAvailable(): void {
  const g = globalThis as WxGlobals;
  if (typeof g.WebAssembly !== 'undefined') return;
  const wxWasm = g.WXWebAssembly;
  if (!wxWasm) {
    throw new Error('WebAssembly is not available in this environment.');
  }
  if (wasmShimReady) return;
  g.WebAssembly = {
    RuntimeError: Error,
    instantiate: async (_buffer: ArrayBuffer | Uint8Array, imports?: Record<string, unknown>) => {
      const wasmPath = '/wasm/yoga.wasm';
      const instance = await wxWasm.instantiate(wasmPath, imports ?? {});
      if (instance && typeof instance === 'object' && 'instance' in (instance as Record<string, unknown>)) {
        return instance as { instance: unknown; module: unknown };
      }
      return { instance, module: null };
    },
    Memory: wxWasm.Memory,
    Table: wxWasm.Table,
    Global: wxWasm.Global,
  } as unknown as typeof WebAssembly;
  wasmShimReady = true;
}

async function loadYogaModule(): Promise<YogaModule> {
  return (await import(/* webpackMode: "eager" */ 'yoga-layout/load')) as unknown as YogaModule;
}

export async function initYoga(): Promise<Yoga> {
  if (!yogaInstance) {
    ensureWebAssemblyAvailable();
    const mod = await loadYogaModule();
    MeasureModeEnum = mod.MeasureMode;
    DirectionEnum = mod.Direction;
    EDGE_ENUM = mod.Edge;
    GUTTER_ENUM = mod.Gutter;
    POSITION_TYPE_ENUM = mod.PositionType;
    FLEX_DIRECTION_MAP = {
      row: mod.FlexDirection.Row,
      column: mod.FlexDirection.Column,
      'row-reverse': mod.FlexDirection.RowReverse,
      'column-reverse': mod.FlexDirection.ColumnReverse,
    };
    JUSTIFY_MAP = {
      'flex-start': mod.Justify.FlexStart,
      center: mod.Justify.Center,
      'flex-end': mod.Justify.FlexEnd,
      'space-between': mod.Justify.SpaceBetween,
      'space-around': mod.Justify.SpaceAround,
      'space-evenly': mod.Justify.SpaceEvenly,
    };
    ALIGN_MAP = {
      auto: mod.Align.Auto,
      'flex-start': mod.Align.FlexStart,
      center: mod.Align.Center,
      'flex-end': mod.Align.FlexEnd,
      stretch: mod.Align.Stretch,
    };
    WRAP_MAP = {
      nowrap: mod.Wrap.NoWrap,
      wrap: mod.Wrap.Wrap,
    };
    yogaInstance = await mod.loadYoga();
  }
  return yogaInstance;
}

export function getYoga(): Yoga {
  if (!yogaInstance) {
    throw new Error('Yoga not initialized. Call initYoga() first.');
  }
  return yogaInstance;
}

export function isYogaReady(): boolean {
  return yogaInstance !== null;
}

export function getMeasureMode(): Record<string, number> {
  if (!MeasureModeEnum) throw new Error('Yoga enums not initialized');
  return MeasureModeEnum;
}

export function getDirection(): Record<string, number> {
  if (!DirectionEnum) throw new Error('Yoga enums not initialized');
  return DirectionEnum;
}

function applyDimension(
  value: FlexValue | undefined,
  setPx: (v: number) => void,
  setPercent: (v: number) => void,
  setAuto?: () => void,
): void {
  if (value === undefined) return;
  if (value === 'auto') {
    setAuto?.();
    return;
  }
  if (typeof value === 'string' && value.endsWith('%')) {
    setPercent(parseFloat(value));
    return;
  }
  setPx(value as number);
}

export function applyFlexStyle(yogaNode: YogaNode, style: FlexStyle): void {
  applyDimension(style.width,
    (v) => yogaNode.setWidth(v),
    (v) => yogaNode.setWidthPercent(v),
    () => yogaNode.setWidthAuto(),
  );
  applyDimension(style.height,
    (v) => yogaNode.setHeight(v),
    (v) => yogaNode.setHeightPercent(v),
    () => yogaNode.setHeightAuto(),
  );
  applyDimension(style.minWidth,
    (v) => yogaNode.setMinWidth(v),
    (v) => yogaNode.setMinWidthPercent(v),
  );
  applyDimension(style.minHeight,
    (v) => yogaNode.setMinHeight(v),
    (v) => yogaNode.setMinHeightPercent(v),
  );
  applyDimension(style.maxWidth,
    (v) => yogaNode.setMaxWidth(v),
    (v) => yogaNode.setMaxWidthPercent(v),
  );
  applyDimension(style.maxHeight,
    (v) => yogaNode.setMaxHeight(v),
    (v) => yogaNode.setMaxHeightPercent(v),
  );

  if (style.flexDirection) {
    yogaNode.setFlexDirection((FLEX_DIRECTION_MAP ?? {})[style.flexDirection] ?? (FLEX_DIRECTION_MAP ?? {}).row);
  }
  if (style.justifyContent) {
    yogaNode.setJustifyContent((JUSTIFY_MAP ?? {})[style.justifyContent] ?? (JUSTIFY_MAP ?? {})['flex-start']);
  }
  if (style.alignItems) {
    yogaNode.setAlignItems((ALIGN_MAP ?? {})[style.alignItems] ?? (ALIGN_MAP ?? {}).stretch);
  }
  if (style.alignSelf) {
    yogaNode.setAlignSelf((ALIGN_MAP ?? {})[style.alignSelf] ?? (ALIGN_MAP ?? {}).auto);
  }
  if (style.flexWrap) {
    yogaNode.setFlexWrap((WRAP_MAP ?? {})[style.flexWrap] ?? (WRAP_MAP ?? {}).nowrap);
  }

  if (style.flex !== undefined) yogaNode.setFlex(style.flex);
  if (style.flexGrow !== undefined) yogaNode.setFlexGrow(style.flexGrow);
  if (style.flexShrink !== undefined) yogaNode.setFlexShrink(style.flexShrink);

  applyDimension(style.flexBasis,
    (v) => yogaNode.setFlexBasis(v),
    (v) => yogaNode.setFlexBasisPercent(v),
    () => yogaNode.setFlexBasisAuto(),
  );

  applyGap(yogaNode, Gutter.All, style.gap);
  applyGap(yogaNode, Gutter.Row, style.rowGap);
  applyGap(yogaNode, Gutter.Column, style.columnGap);

  applyEdge(yogaNode, 'padding', Edge.Top, style.paddingTop);
  applyEdge(yogaNode, 'padding', Edge.Right, style.paddingRight);
  applyEdge(yogaNode, 'padding', Edge.Bottom, style.paddingBottom);
  applyEdge(yogaNode, 'padding', Edge.Left, style.paddingLeft);

  applyEdge(yogaNode, 'margin', Edge.Top, style.marginTop);
  applyEdge(yogaNode, 'margin', Edge.Right, style.marginRight);
  applyEdge(yogaNode, 'margin', Edge.Bottom, style.marginBottom);
  applyEdge(yogaNode, 'margin', Edge.Left, style.marginLeft);

  // Position
  if (style.position) {
    const map = {
      static: (POSITION_TYPE_ENUM ?? {}).Static,
      relative: (POSITION_TYPE_ENUM ?? {}).Relative,
      absolute: (POSITION_TYPE_ENUM ?? {}).Absolute,
    };
    yogaNode.setPositionType(map[style.position] ?? (POSITION_TYPE_ENUM ?? {}).Static);
  }
  applyPositionEdge(yogaNode, Edge.Top, style.top);
  applyPositionEdge(yogaNode, Edge.Right, style.right);
  applyPositionEdge(yogaNode, Edge.Bottom, style.bottom);
  applyPositionEdge(yogaNode, Edge.Left, style.left);
}

const Edge = new Proxy({}, { get: (_t, p: string) => (EDGE_ENUM ?? {})[p] ?? 0 }) as unknown as Record<string, number>;
const Gutter = new Proxy({}, { get: (_t, p: string) => (GUTTER_ENUM ?? {})[p] ?? 0 }) as unknown as Record<string, number>;

function applyGap(yogaNode: YogaNode, gutter: number, value: FlexValue | undefined): void {
  if (value === undefined) return;
  if (typeof value === 'string' && value.endsWith('%')) {
    yogaNode.setGapPercent(gutter, parseFloat(value));
    return;
  }
  if (typeof value === 'number') yogaNode.setGap(gutter, value);
}

function applyEdge(
  yogaNode: YogaNode,
  prop: 'padding' | 'margin',
  edge: number,
  value: FlexValue | undefined,
): void {
  if (value === undefined) return;
  if (value === 'auto' && prop === 'margin') {
    yogaNode.setMarginAuto(edge);
    return;
  }
  if (typeof value === 'string' && value.endsWith('%')) {
    if (prop === 'padding') yogaNode.setPaddingPercent(edge, parseFloat(value));
    else yogaNode.setMarginPercent(edge, parseFloat(value));
    return;
  }
  if (typeof value === 'number') {
    if (prop === 'padding') yogaNode.setPadding(edge, value);
    else yogaNode.setMargin(edge, value);
  }
}

function applyPositionEdge(
  yogaNode: YogaNode,
  edge: number,
  value: FlexValue | undefined,
): void {
  if (value === undefined) return;
  if (typeof value === 'string' && value.endsWith('%')) {
    yogaNode.setPositionPercent(edge, parseFloat(value));
    return;
  }
  if (typeof value === 'number') {
    yogaNode.setPosition(edge, value);
  }
}
