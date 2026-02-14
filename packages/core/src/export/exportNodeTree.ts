import type { NodeTree, CanvasNode } from '../types';

/**
 * Serializable node representation for JSON export.
 */
export interface SerializedNode {
  id: string;
  name: string;
  type: string;
  flexStyle: Record<string, unknown>;
  visualStyle: Record<string, unknown>;
  textProps?: Record<string, unknown>;
  imageProps?: Record<string, unknown>;
  scrollViewProps?: Record<string, unknown>;
  computedLayout: { left: number; top: number; width: number; height: number };
  children: SerializedNode[];
}

/**
 * Export the node tree as a JSON string.
 */
export function exportToJSON(tree: NodeTree): string {
  const root = tree.nodes[tree.rootId];
  if (!root) return '{}';
  const serialized = serializeNode(root, tree);
  return JSON.stringify(serialized, null, 2);
}

/**
 * Import a node tree from a JSON string produced by exportToJSON.
 */
export function importFromJSON(json: string): NodeTree {
  const serialized: SerializedNode = JSON.parse(json);
  const nodes: Record<string, CanvasNode> = {};
  deserializeNode(serialized, null, nodes);
  return { rootId: serialized.id, nodes };
}

function serializeNode(node: CanvasNode, tree: NodeTree): SerializedNode {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    flexStyle: { ...node.flexStyle },
    visualStyle: { ...node.visualStyle },
    ...(node.textProps && { textProps: { ...node.textProps } }),
    ...(node.imageProps && { imageProps: { ...node.imageProps } }),
    ...(node.scrollViewProps && { scrollViewProps: { ...node.scrollViewProps } }),
    computedLayout: { ...node.computedLayout },
    children: node.children
      .map((childId) => tree.nodes[childId])
      .filter(Boolean)
      .map((child) => serializeNode(child, tree)),
  };
}

function deserializeNode(
  serialized: SerializedNode,
  parentId: string | null,
  nodes: Record<string, CanvasNode>,
): void {
  const node: CanvasNode = {
    id: serialized.id,
    name: serialized.name,
    type: serialized.type as CanvasNode['type'],
    flexStyle: serialized.flexStyle as CanvasNode['flexStyle'],
    visualStyle: serialized.visualStyle as CanvasNode['visualStyle'],
    textProps: serialized.textProps as CanvasNode['textProps'],
    imageProps: serialized.imageProps as CanvasNode['imageProps'],
    scrollViewProps: serialized.scrollViewProps as CanvasNode['scrollViewProps'],
    computedLayout: serialized.computedLayout,
    children: serialized.children.map((c) => c.id),
    parentId,
  };
  nodes[node.id] = node;

  for (const child of serialized.children) {
    deserializeNode(child, node.id, nodes);
  }
}
