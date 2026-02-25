import type { Node as YogaNode } from 'yoga-layout/load';
import { Direction, MeasureMode } from 'yoga-layout/load';
import type { CanvasNode, NodeTree, ComputedLayout, TextProps, FlexStyle, PlatformAdapter } from '../types';
import { getYoga, applyFlexStyle } from './YogaManager';

/**
 * Build a yoga node tree from the canvas node tree.
 * Returns a map of nodeId → YogaNode.
 */
export function buildYogaTree(
  tree: NodeTree,
  adapter?: PlatformAdapter,
): Map<string, YogaNode> {
  const yoga = getYoga();
  const yogaNodes = new Map<string, YogaNode>();

  function createNodeRecursive(nodeId: string): YogaNode {
    const canvasNode = tree.nodes[nodeId];
    const yogaNode = yoga.Node.create();

    applyFlexStyle(yogaNode, canvasNode.flexStyle);

    // Text nodes: use measureFunc so Yoga computes height from content
    if (
      canvasNode.type === 'text' &&
      canvasNode.textProps &&
      canvasNode.children.length === 0 &&
      adapter
    ) {
      const textProps = canvasNode.textProps;
      const flexStyle = canvasNode.flexStyle;
      yogaNode.setMeasureFunc((width, widthMode) => {
        const isUndefined = widthMode === MeasureMode.Undefined;
        const isExactly = widthMode === MeasureMode.Exactly;
        const availableWidth = isFinite(width) ? width : 100000;
        const measureWidth = isUndefined ? 100000 : availableWidth;
        const result = measureTextFullWithAdapter(adapter, textProps, flexStyle, measureWidth);
        const shouldFillWidth = flexStyle.width !== undefined
          || flexStyle.flex !== undefined
          || flexStyle.flexGrow !== undefined
          || flexStyle.flexBasis !== undefined;
        const nextWidth = isExactly && shouldFillWidth
          ? availableWidth
          : Math.min(result.width, availableWidth);
        return { width: nextWidth, height: result.height };
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

/**
 * Calculate layout for the entire tree.
 */
export function calculateLayout(
  tree: NodeTree,
  yogaNodes: Map<string, YogaNode>,
  canvasWidth: number,
  canvasHeight: number,
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
  parentAbsY: number,
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

/**
 * Free all yoga nodes to avoid memory leaks.
 */
export function freeYogaTree(yogaNodes: Map<string, YogaNode>): void {
  yogaNodes.forEach((node) => {
    node.free();
  });
  yogaNodes.clear();
}

/**
 * Measure text height using the platform adapter.
 */
function measureTextFullWithAdapter(
  adapter: PlatformAdapter,
  textProps: TextProps,
  flexStyle: FlexStyle,
  availableWidth: number,
): { width: number; height: number } {
  return adapter.measureText({
    content: textProps.content,
    fontSize: textProps.fontSize,
    fontWeight: textProps.fontWeight,
    fontStyle: textProps.fontStyle,
    fontFamily: textProps.fontFamily,
    lineHeight: textProps.lineHeight,
    availableWidth,
    whiteSpace: textProps.whiteSpace,
  });
}

/**
 * Compute content sizes for all ScrollView nodes and update the ScrollManager.
 */
export function computeScrollContentSizes(
  tree: NodeTree,
  scrollManager: { setContentSize: (id: string, cw: number, ch: number, vw: number, vh: number) => void },
): void {
  for (const nodeId of Object.keys(tree.nodes)) {
    const node = tree.nodes[nodeId];
    if (node.type !== 'scrollview') continue;

    const viewport = node.computedLayout;
    let maxRight = 0;
    let maxBottom = 0;

    for (const childId of node.children) {
      const child = tree.nodes[childId];
      if (!child) continue;
      // Children's computedLayout is absolute, convert to relative to parent
      const childRight = (child.computedLayout.left - viewport.left) + child.computedLayout.width;
      const childBottom = (child.computedLayout.top - viewport.top) + child.computedLayout.height;
      if (childRight > maxRight) maxRight = childRight;
      if (childBottom > maxBottom) maxBottom = childBottom;
    }

    scrollManager.setContentSize(
      nodeId,
      Math.max(maxRight, viewport.width),
      Math.max(maxBottom, viewport.height),
      viewport.width,
      viewport.height,
    );
  }
}

/**
 * Helper: convert FlexValue to number.
 */
export function flexValueToNum(v: unknown, fallback: number): number {
  if (v === undefined || v === 'auto') return fallback;
  if (typeof v === 'number') return v;
  return fallback;
}
