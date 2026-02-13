import { loadYoga } from 'yoga-layout/load';
import {
  FlexDirection,
  Justify,
  Align,
  Wrap,
  Edge,
  Gutter,
  Direction,
  PositionType,
} from 'yoga-layout/load';
import type { Yoga, Node as YogaNode } from 'yoga-layout/load';
import type { CanvasNode, NodeTree, FlexStyle, FlexValue, ComputedLayout } from '../types';
import { measureTextHeight } from './textMeasure';

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

  if (style.flexDirection) {
    yogaNode.setFlexDirection(FLEX_DIRECTION_MAP[style.flexDirection] ?? FlexDirection.Row);
  }
  if (style.justifyContent) {
    yogaNode.setJustifyContent(JUSTIFY_MAP[style.justifyContent] ?? Justify.FlexStart);
  }
  if (style.alignItems) {
    yogaNode.setAlignItems(ALIGN_MAP[style.alignItems] ?? Align.Stretch);
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
  if (style.positionType) {
    const map: Record<string, PositionType> = {
      static: PositionType.Static,
      relative: PositionType.Relative,
      absolute: PositionType.Absolute,
    };
    yogaNode.setPositionType(map[style.positionType] ?? PositionType.Static);
  }
  applyPositionEdge(yogaNode, Edge.Top, style.positionTop);
  applyPositionEdge(yogaNode, Edge.Right, style.positionRight);
  applyPositionEdge(yogaNode, Edge.Bottom, style.positionBottom);
  applyPositionEdge(yogaNode, Edge.Left, style.positionLeft);
}

function applyGap(yogaNode: YogaNode, gutter: Gutter, value: FlexValue | undefined): void {
  if (value === undefined) return;
  if (typeof value === 'string' && value.endsWith('%')) {
    yogaNode.setGapPercent(gutter, parseFloat(value));
    return;
  }
  // gap does not support 'auto'
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

export function calculateLayout(
  tree: NodeTree,
  yogaNodes: Map<string, YogaNode>,
  canvasWidth: number,
  canvasHeight: number
): NodeTree {
  const rootYogaNode = yogaNodes.get(tree.rootId);
  if (!rootYogaNode) return tree;

  rootYogaNode.calculateLayout(canvasWidth, canvasHeight, Direction.LTR);

  const updatedNodes = { ...tree.nodes };
  updateComputedLayouts(tree.rootId, updatedNodes, yogaNodes, 0, 0);

  return { ...tree, nodes: updatedNodes };
}

function updateComputedLayouts(
  nodeId: string,
  nodes: Record<string, CanvasNode>,
  yogaNodes: Map<string, YogaNode>,
  parentAbsX: number,
  parentAbsY: number
): void {
  const yogaNode = yogaNodes.get(nodeId);
  const canvasNode = nodes[nodeId];
  if (!yogaNode || !canvasNode) return;

  const layout = yogaNode.getComputedLayout();
  const absX = parentAbsX + layout.left;
  const absY = parentAbsY + layout.top;

  const computedLayout: ComputedLayout = {
    left: absX,
    top: absY,
    width: layout.width,
    height: layout.height,
  };

  nodes[nodeId] = { ...canvasNode, computedLayout };

  for (const childId of canvasNode.children) {
    updateComputedLayouts(childId, nodes, yogaNodes, absX, absY);
  }
}

export function buildYogaTree(
  tree: NodeTree
): Map<string, YogaNode> {
  const yoga = getYoga();
  const yogaNodes = new Map<string, YogaNode>();

  function createNodeRecursive(nodeId: string): YogaNode {
    const canvasNode = tree.nodes[nodeId];
    const yogaNode = yoga.Node.create();

    applyFlexStyle(yogaNode, canvasNode.flexStyle);

    // Text nodes: use measureFunc so Yoga computes height from content
    if (canvasNode.type === 'text' && canvasNode.textProps && canvasNode.children.length === 0) {
      yogaNode.setMeasureFunc((width) => {
        const h = measureTextHeight(canvasNode.textProps!, canvasNode.flexStyle, width);
        return { width, height: h };
      });
    }

    yogaNodes.set(nodeId, yogaNode);

    canvasNode.children.forEach((childId, index) => {
      const childYogaNode = createNodeRecursive(childId);
      yogaNode.insertChild(childYogaNode, index);
    });

    return yogaNode;
  }

  createNodeRecursive(tree.rootId);
  return yogaNodes;
}

export function freeYogaTree(yogaNodes: Map<string, YogaNode>): void {
  yogaNodes.forEach((node) => {
    node.free();
  });
  yogaNodes.clear();
}

export { FlexDirection, Justify, Align, Wrap, Edge, Gutter, Direction };
export type { YogaNode };
