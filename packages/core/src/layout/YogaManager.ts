import { loadYoga } from 'yoga-layout/load';
import {
  FlexDirection,
  Justify,
  Align,
  Wrap,
  Edge,
  Gutter,
  PositionType,
} from 'yoga-layout/load';
import type { Yoga, Node as YogaNode } from 'yoga-layout/load';
import type { FlexStyle, FlexValue } from '../types';

let yogaInstance: Yoga | null = null;

export async function initYoga(): Promise<Yoga> {
  if (!yogaInstance) {
    yogaInstance = await loadYoga();
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

const FLEX_DIRECTION_MAP: Record<string, FlexDirection> = {
  row: FlexDirection.Row,
  column: FlexDirection.Column,
  'row-reverse': FlexDirection.RowReverse,
  'column-reverse': FlexDirection.ColumnReverse,
};

const JUSTIFY_MAP: Record<string, Justify> = {
  'flex-start': Justify.FlexStart,
  center: Justify.Center,
  'flex-end': Justify.FlexEnd,
  'space-between': Justify.SpaceBetween,
  'space-around': Justify.SpaceAround,
  'space-evenly': Justify.SpaceEvenly,
};

const ALIGN_MAP: Record<string, Align> = {
  auto: Align.Auto,
  'flex-start': Align.FlexStart,
  center: Align.Center,
  'flex-end': Align.FlexEnd,
  stretch: Align.Stretch,
};

const WRAP_MAP: Record<string, Wrap> = {
  nowrap: Wrap.NoWrap,
  wrap: Wrap.Wrap,
};

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
    yogaNode.setFlexDirection(FLEX_DIRECTION_MAP[style.flexDirection] ?? FlexDirection.Row);
  }
  if (style.justifyContent) {
    yogaNode.setJustifyContent(JUSTIFY_MAP[style.justifyContent] ?? Justify.FlexStart);
  }
  if (style.alignItems) {
    yogaNode.setAlignItems(ALIGN_MAP[style.alignItems] ?? Align.Stretch);
  }
  if (style.alignSelf) {
    yogaNode.setAlignSelf(ALIGN_MAP[style.alignSelf] ?? Align.Auto);
  }
  if (style.flexWrap) {
    yogaNode.setFlexWrap(WRAP_MAP[style.flexWrap] ?? Wrap.NoWrap);
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
    const map: Record<string, PositionType> = {
      static: PositionType.Static,
      relative: PositionType.Relative,
      absolute: PositionType.Absolute,
    };
    yogaNode.setPositionType(map[style.position] ?? PositionType.Static);
  }
  applyPositionEdge(yogaNode, Edge.Top, style.top);
  applyPositionEdge(yogaNode, Edge.Right, style.right);
  applyPositionEdge(yogaNode, Edge.Bottom, style.bottom);
  applyPositionEdge(yogaNode, Edge.Left, style.left);
}

function applyGap(yogaNode: YogaNode, gutter: Gutter, value: FlexValue | undefined): void {
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
  edge: Edge,
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
  edge: Edge,
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

export type { YogaNode };
