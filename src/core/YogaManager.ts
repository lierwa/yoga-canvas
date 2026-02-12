import { loadYoga } from 'yoga-layout/load';
import {
  FlexDirection,
  Justify,
  Align,
  Wrap,
  Edge,
  Gutter,
  Direction,
} from 'yoga-layout/load';
import type { Yoga, Node as YogaNode } from 'yoga-layout/load';
import type { CanvasNode, NodeTree, FlexStyle, ComputedLayout } from '../types';

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

export function applyFlexStyle(yogaNode: YogaNode, style: FlexStyle): void {
  if (style.width !== undefined) yogaNode.setWidth(style.width);
  if (style.height !== undefined) yogaNode.setHeight(style.height);

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
  if (style.flexBasis !== undefined) {
    if (style.flexBasis === 'auto') {
      yogaNode.setFlexBasisAuto();
    } else {
      yogaNode.setFlexBasis(style.flexBasis);
    }
  }

  if (style.gap !== undefined) yogaNode.setGap(Gutter.All, style.gap);
  if (style.rowGap !== undefined) yogaNode.setGap(Gutter.Row, style.rowGap);
  if (style.columnGap !== undefined) yogaNode.setGap(Gutter.Column, style.columnGap);

  if (style.paddingTop !== undefined) yogaNode.setPadding(Edge.Top, style.paddingTop);
  if (style.paddingRight !== undefined) yogaNode.setPadding(Edge.Right, style.paddingRight);
  if (style.paddingBottom !== undefined) yogaNode.setPadding(Edge.Bottom, style.paddingBottom);
  if (style.paddingLeft !== undefined) yogaNode.setPadding(Edge.Left, style.paddingLeft);

  if (style.marginTop !== undefined) yogaNode.setMargin(Edge.Top, style.marginTop);
  if (style.marginRight !== undefined) yogaNode.setMargin(Edge.Right, style.marginRight);
  if (style.marginBottom !== undefined) yogaNode.setMargin(Edge.Bottom, style.marginBottom);
  if (style.marginLeft !== undefined) yogaNode.setMargin(Edge.Left, style.marginLeft);
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
