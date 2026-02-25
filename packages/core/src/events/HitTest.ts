import type { NodeTree } from '../types';
import type { ScrollManager } from '../scroll/ScrollManager';

export interface HitTestOptions {
  /** Optional scroll manager for ScrollView offset awareness. */
  scrollManager?: ScrollManager;
}

/**
 * Hit-test: find the deepest node at the given canvas coordinates.
 * Returns null if no node is hit.
 */
export function hitTest(
  tree: NodeTree,
  canvasX: number,
  canvasY: number,
  options?: HitTestOptions,
): string | null {
  return hitTestNode(tree, tree.rootId, canvasX, canvasY, options?.scrollManager);
}

function hitTestNode(
  tree: NodeTree,
  nodeId: string,
  x: number,
  y: number,
  scrollManager?: ScrollManager,
): string | null {
  const node = tree.nodes[nodeId];
  if (!node) return null;

  const { left, top, width, height } = node.computedLayout;

  // For ScrollView, adjust child coordinates by scroll offset and clip
  if (node.type === 'scrollview') {
    // Must be within ScrollView viewport to test children
    if (x < left || x > left + width || y < top || y > top + height) {
      return null;
    }
    const offset = scrollManager?.getOffset(nodeId) ?? { x: 0, y: 0 };
    const adjustedX = x + offset.x;
    const adjustedY = y + offset.y;

    const orderedChildren = getOrderedChildren(tree, node);
    for (let i = orderedChildren.length - 1; i >= 0; i--) {
      const result = hitTestNode(tree, orderedChildren[i], adjustedX, adjustedY, scrollManager);
      if (result) return result;
    }
  } else {
    // Test children in reverse order (top-most first)
    const orderedChildren = getOrderedChildren(tree, node);
    for (let i = orderedChildren.length - 1; i >= 0; i--) {
      const result = hitTestNode(tree, orderedChildren[i], x, y, scrollManager);
      if (result) return result;
    }
  }

  if (x >= left && x <= left + width && y >= top && y <= top + height) {
    return nodeId;
  }

  return null;
}

/**
 * Hit-test: find all nodes at the given canvas coordinates,
 * ordered from root (first) to deepest (last).
 */
export function hitTestAll(
  tree: NodeTree,
  canvasX: number,
  canvasY: number,
  options?: HitTestOptions,
): string[] {
  const result: string[] = [];
  collectHitNodes(tree, tree.rootId, canvasX, canvasY, result, options?.scrollManager);
  return result;
}

function collectHitNodes(
  tree: NodeTree,
  nodeId: string,
  x: number,
  y: number,
  result: string[],
  scrollManager?: ScrollManager,
): void {
  const node = tree.nodes[nodeId];
  if (!node) return;
  const { left, top, width, height } = node.computedLayout;
  if (x >= left && x <= left + width && y >= top && y <= top + height) {
    result.push(nodeId);

    if (node.type === 'scrollview') {
      const offset = scrollManager?.getOffset(nodeId) ?? { x: 0, y: 0 };
      const orderedChildren = getOrderedChildren(tree, node);
      for (const childId of orderedChildren) {
        collectHitNodes(tree, childId, x + offset.x, y + offset.y, result, scrollManager);
      }
    } else {
      const orderedChildren = getOrderedChildren(tree, node);
      for (const childId of orderedChildren) {
        collectHitNodes(tree, childId, x, y, result, scrollManager);
      }
    }
  }
}

function getOrderedChildren(tree: NodeTree, node: NodeTree['nodes'][string]): string[] {
  if (node.children.length <= 1) return node.children;
  return node.children
    .map((id, index) => ({ id, index }))
    .sort((a, b) => {
      const nodeA = tree.nodes[a.id];
      const nodeB = tree.nodes[b.id];
      const zA = nodeA?.visualStyle?.zIndex ?? 0;
      const zB = nodeB?.visualStyle?.zIndex ?? 0;
      if (zA !== zB) return zA - zB;
      return a.index - b.index;
    })
    .map((item) => item.id);
}
