import type {
  CanvasNode,
  NodeTree,
  NodeDescriptor,
  FlexStyle,
  VisualStyle,
  TextProps,
  ImageProps,
  PlatformAdapter,
} from '../types';
import { splitStyle } from '../types/style';
import { buildYogaTree, calculateLayout, freeYogaTree, flexValueToNum } from '../layout';
import { History } from './History';
import type { Node as YogaNode } from 'yoga-layout/load';

let idCounter = 0;
function generateId(): string {
  return `yaga_${++idCounter}`;
}

/** Reset the ID counter (useful for testing). */
export function resetIdCounter(): void {
  idCounter = 0;
}

const DEFAULT_VISUAL_STYLE: Required<VisualStyle> = {
  backgroundColor: 'transparent',
  borderColor: 'transparent',
  borderWidth: 0,
  borderRadius: 0,
  opacity: 1,
  rotate: 0,
};

const DEFAULT_TEXT_PROPS: TextProps = {
  content: '',
  fontSize: 14,
  fontWeight: 'normal',
  fontFamily: 'sans-serif',
  color: '#000000',
  lineHeight: 1.4,
  textAlign: 'left',
};

/**
 * Framework-agnostic node tree manager.
 * Handles building, mutating, and layout-computing the node tree.
 */
export class NodeTreeManager {
  private tree: NodeTree;
  private yogaNodes: Map<string, YogaNode> = new Map();
  private history: History;
  private adapter: PlatformAdapter | undefined;
  private liveUpdateBase: NodeTree | null = null;

  constructor(adapter?: PlatformAdapter) {
    this.adapter = adapter;
    this.history = new History();
    this.tree = { rootId: '', nodes: {} };
  }

  /** Get the current node tree. */
  getTree(): NodeTree {
    return this.tree;
  }

  /** Get a node by id. */
  getNodeById(id: string): CanvasNode | null {
    return this.tree.nodes[id] ?? null;
  }

  /** Get the root node. */
  getRootNode(): CanvasNode | null {
    return this.tree.nodes[this.tree.rootId] ?? null;
  }

  /**
   * Build a node tree from a NodeDescriptor (the DSL output).
   * This is the primary way to initialize or replace the tree.
   */
  buildFromDescriptor(descriptor: NodeDescriptor): NodeTree {
    const nodes: Record<string, CanvasNode> = {};

    function buildNode(desc: NodeDescriptor, parentId: string | null): string {
      const id = generateId();
      const { flexStyle, visualStyle, textStyle } = splitStyle(desc.style);

      const node: CanvasNode = {
        id,
        name: desc.name || desc.type,
        type: desc.type,
        flexStyle,
        visualStyle: { ...DEFAULT_VISUAL_STYLE, ...visualStyle },
        children: [],
        parentId,
        computedLayout: { left: 0, top: 0, width: 0, height: 0 },
      };

      // Type-specific props
      if (desc.type === 'text') {
        node.textProps = {
          ...DEFAULT_TEXT_PROPS,
          content: desc.content ?? '',
          ...(textStyle.fontSize !== undefined && { fontSize: textStyle.fontSize }),
          ...(textStyle.fontWeight !== undefined && { fontWeight: textStyle.fontWeight }),
          ...(textStyle.fontFamily !== undefined && { fontFamily: textStyle.fontFamily }),
          ...(textStyle.color !== undefined && { color: textStyle.color }),
          ...(textStyle.lineHeight !== undefined && { lineHeight: textStyle.lineHeight }),
          ...(textStyle.textAlign !== undefined && { textAlign: textStyle.textAlign }),
        };
      }

      if (desc.type === 'image') {
        node.imageProps = {
          src: desc.src ?? '',
          objectFit: desc.objectFit ?? 'cover',
        };
      }

      if (desc.type === 'scrollview') {
        node.scrollViewProps = {
          scrollDirection: desc.scrollDirection ?? 'vertical',
          scrollBarVisibility: desc.scrollBarVisibility ?? 'auto',
        };
      }

      // Build children
      if (desc.children) {
        for (const childDesc of desc.children) {
          const childId = buildNode(childDesc, id);
          node.children.push(childId);
        }
      }

      nodes[id] = node;
      return id;
    }

    const rootId = buildNode(descriptor, null);
    this.tree = { rootId, nodes };
    return this.tree;
  }

  /** Recompute layout for the current tree. */
  computeLayout(): NodeTree {
    freeYogaTree(this.yogaNodes);
    this.yogaNodes = buildYogaTree(this.tree, this.adapter);
    const rootNode = this.tree.nodes[this.tree.rootId];
    this.tree = calculateLayout(
      this.tree,
      this.yogaNodes,
      flexValueToNum(rootNode?.flexStyle.width, 800),
      flexValueToNum(rootNode?.flexStyle.height, 600),
    );
    return this.tree;
  }

  /** Apply a mutation with undo support. */
  commit(mutate: (tree: NodeTree) => NodeTree | null): NodeTree {
    const newTree = mutate(this.tree);
    if (!newTree) return this.tree;
    this.history.push(this.tree);
    this.tree = newTree;
    return this.computeLayout();
  }

  /** Apply a live update (no history push until commitLive). */
  applyLive(mutate: (tree: NodeTree) => NodeTree | null): NodeTree {
    if (!this.liveUpdateBase) {
      this.liveUpdateBase = this.tree;
    }
    const newTree = mutate(this.tree);
    if (!newTree) return this.tree;
    this.tree = newTree;
    return this.computeLayout();
  }

  /** Commit a live update to history. */
  commitLive(): void {
    if (this.liveUpdateBase) {
      this.history.push(this.liveUpdateBase);
      this.liveUpdateBase = null;
    }
  }

  /** Undo the last mutation. */
  undo(): NodeTree | null {
    const prev = this.history.undo(this.tree);
    if (!prev) return null;
    this.tree = prev;
    freeYogaTree(this.yogaNodes);
    this.yogaNodes = buildYogaTree(this.tree, this.adapter);
    return this.tree;
  }

  /** Redo the last undone mutation. */
  redo(): NodeTree | null {
    const next = this.history.redo(this.tree);
    if (!next) return null;
    this.tree = next;
    freeYogaTree(this.yogaNodes);
    this.yogaNodes = buildYogaTree(this.tree, this.adapter);
    return this.tree;
  }

  get canUndo(): boolean {
    return this.history.canUndo;
  }

  get canRedo(): boolean {
    return this.history.canRedo;
  }

  // --- Convenience mutation methods ---

  updateFlexStyle(nodeId: string, updates: Partial<FlexStyle>): NodeTree {
    return this.commit((tree) => {
      const node = tree.nodes[nodeId];
      if (!node) return null;
      return {
        ...tree,
        nodes: {
          ...tree.nodes,
          [nodeId]: { ...node, flexStyle: { ...node.flexStyle, ...updates } },
        },
      };
    });
  }

  updateVisualStyle(nodeId: string, updates: Partial<VisualStyle>): NodeTree {
    return this.commit((tree) => {
      const node = tree.nodes[nodeId];
      if (!node) return null;
      return {
        ...tree,
        nodes: {
          ...tree.nodes,
          [nodeId]: { ...node, visualStyle: { ...node.visualStyle, ...updates } },
        },
      };
    });
  }

  updateTextProps(nodeId: string, updates: Partial<TextProps>): NodeTree {
    return this.commit((tree) => {
      const node = tree.nodes[nodeId];
      if (!node || !node.textProps) return null;
      return {
        ...tree,
        nodes: {
          ...tree.nodes,
          [nodeId]: { ...node, textProps: { ...node.textProps, ...updates } },
        },
      };
    });
  }

  updateImageProps(nodeId: string, updates: Partial<ImageProps>): NodeTree {
    return this.commit((tree) => {
      const node = tree.nodes[nodeId];
      if (!node || !node.imageProps) return null;
      return {
        ...tree,
        nodes: {
          ...tree.nodes,
          [nodeId]: { ...node, imageProps: { ...node.imageProps, ...updates } },
        },
      };
    });
  }

  addChild(parentId: string, descriptor: NodeDescriptor): NodeTree {
    return this.commit((tree) => {
      const parent = tree.nodes[parentId];
      if (!parent || parent.type === 'text') return null;

      const childNodes: Record<string, CanvasNode> = {};
      const childId = this.buildSingleNode(descriptor, parentId, childNodes);

      return {
        ...tree,
        nodes: {
          ...tree.nodes,
          ...childNodes,
          [parentId]: { ...parent, children: [...parent.children, childId] },
        },
      };
    });
  }

  deleteNode(nodeId: string): NodeTree {
    return this.commit((tree) => {
      if (nodeId === tree.rootId) return null;
      const node = tree.nodes[nodeId];
      if (!node || !node.parentId) return null;

      const newNodes = { ...tree.nodes };
      const parent = newNodes[node.parentId];
      newNodes[node.parentId] = {
        ...parent,
        children: parent.children.filter((id) => id !== nodeId),
      };

      // Remove node and all descendants
      const toDelete = [nodeId];
      while (toDelete.length > 0) {
        const id = toDelete.pop()!;
        const n = newNodes[id];
        if (n) {
          toDelete.push(...n.children);
          delete newNodes[id];
        }
      }

      return { ...tree, nodes: newNodes };
    });
  }

  moveNode(nodeId: string, newParentId: string, insertIndex?: number): NodeTree {
    return this.commit((tree) => {
      const node = tree.nodes[nodeId];
      const newParent = tree.nodes[newParentId];
      if (!node || !newParent || !node.parentId) return null;
      if (newParent.type === 'text') return null;

      const oldParent = tree.nodes[node.parentId];
      if (!oldParent) return null;

      const isSameParent = node.parentId === newParentId;
      const oldChildren = oldParent.children.filter((id) => id !== nodeId);

      let newChildren: string[];
      if (isSameParent) {
        if (insertIndex === undefined) return null;
        newChildren = [...oldChildren];
        const clampedIndex = Math.min(insertIndex, newChildren.length);
        newChildren.splice(clampedIndex, 0, nodeId);
      } else {
        const targetChildren = [...newParent.children];
        if (insertIndex !== undefined) {
          targetChildren.splice(Math.min(insertIndex, targetChildren.length), 0, nodeId);
        } else {
          targetChildren.push(nodeId);
        }
        newChildren = targetChildren;
      }

      const updatedNodes = { ...tree.nodes };
      updatedNodes[nodeId] = { ...node, parentId: newParentId };
      updatedNodes[node.parentId] = { ...oldParent, children: oldChildren };
      if (!isSameParent) {
        updatedNodes[newParentId] = { ...newParent, children: newChildren };
      } else {
        updatedNodes[newParentId] = { ...updatedNodes[newParentId], children: newChildren };
      }

      return { ...tree, nodes: updatedNodes };
    });
  }

  /** Free yoga resources. */
  destroy(): void {
    freeYogaTree(this.yogaNodes);
    this.history.clear();
  }

  // --- Private helpers ---

  private buildSingleNode(
    desc: NodeDescriptor,
    parentId: string,
    outNodes: Record<string, CanvasNode>,
  ): string {
    const id = generateId();
    const { flexStyle, visualStyle, textStyle } = splitStyle(desc.style);

    const node: CanvasNode = {
      id,
      name: desc.name || desc.type,
      type: desc.type,
      flexStyle,
      visualStyle: { ...DEFAULT_VISUAL_STYLE, ...visualStyle },
      children: [],
      parentId,
      computedLayout: { left: 0, top: 0, width: 0, height: 0 },
    };

    if (desc.type === 'text') {
      node.textProps = {
        ...DEFAULT_TEXT_PROPS,
        content: desc.content ?? '',
        ...(textStyle.fontSize !== undefined && { fontSize: textStyle.fontSize }),
        ...(textStyle.fontWeight !== undefined && { fontWeight: textStyle.fontWeight }),
        ...(textStyle.fontFamily !== undefined && { fontFamily: textStyle.fontFamily }),
        ...(textStyle.color !== undefined && { color: textStyle.color }),
        ...(textStyle.lineHeight !== undefined && { lineHeight: textStyle.lineHeight }),
        ...(textStyle.textAlign !== undefined && { textAlign: textStyle.textAlign }),
      };
    }

    if (desc.type === 'image') {
      node.imageProps = {
        src: desc.src ?? '',
        objectFit: desc.objectFit ?? 'cover',
      };
    }

    if (desc.type === 'scrollview') {
      node.scrollViewProps = {
        scrollDirection: desc.scrollDirection ?? 'vertical',
        scrollBarVisibility: desc.scrollBarVisibility ?? 'auto',
      };
    }

    if (desc.children) {
      for (const childDesc of desc.children) {
        const childId = this.buildSingleNode(childDesc, id, outNodes);
        node.children.push(childId);
      }
    }

    outNodes[id] = node;
    return id;
  }
}
