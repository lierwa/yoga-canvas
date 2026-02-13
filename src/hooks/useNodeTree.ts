import { useState, useCallback, useRef, useEffect } from 'react';
import type { CanvasNode, NodeTree, FlexStyle, VisualStyle, TextProps, ImageProps, NodeType, CanvasContainerConfig, FlexValue } from '../types';
import {
  initYoga,
  buildYogaTree,
  freeYogaTree,
  calculateLayout,
} from '../core/YogaManager';
import type { YogaNode } from '../core/YogaManager';

let idCounter = 0;
function generateId(): string {
  return `node_${++idCounter}`;
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
  '#6366f1', '#06b6d4',
];

function pickColor(index: number): string {
  return COLORS[index % COLORS.length];
}

function flexValueToNum(v: FlexValue | undefined, fallback: number): number {
  if (v === undefined || v === 'auto') return fallback;
  if (typeof v === 'number') return v;
  return fallback;
}

function createNodeByType(type: NodeType, parentId: string, index: number): CanvasNode {
  const id = generateId();
  const base = {
    id,
    parentId,
    children: [],
    computedLayout: { left: 0, top: 0, width: 0, height: 0 },
  };

  switch (type) {
    case 'text':
      return {
        ...base,
        name: `Text ${index}`,
        type: 'text',
        flexStyle: { paddingTop: 4, paddingRight: 4, paddingBottom: 4, paddingLeft: 4 },
        visualStyle: { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0, borderRadius: 0, opacity: 1, rotation: 0 },
        textProps: {
          content: 'Text',
          fontSize: 14,
          fontWeight: 'normal',
          color: '#1f2937',
          lineHeight: 1.4,
          textAlign: 'left',
        },
      };
    case 'image':
      return {
        ...base,
        name: `Image ${index}`,
        type: 'image',
        flexStyle: { width: 120, height: 120 },
        visualStyle: { backgroundColor: '#e0e7ff', borderColor: '#6366f1', borderWidth: 1, borderRadius: 6, opacity: 1, rotation: 0 },
        imageProps: {
          src: '',
          objectFit: 'cover',
        },
      };
    case 'scrollview':
      return {
        ...base,
        name: `ScrollView ${index}`,
        type: 'scrollview',
        flexStyle: {
          flex: 1,
          flexDirection: 'column',
          overflow: 'scroll',
          gap: 8,
          paddingTop: 8, paddingRight: 8, paddingBottom: 8, paddingLeft: 8,
        },
        visualStyle: { backgroundColor: '#f1f5f9', borderColor: '#94a3b8', borderWidth: 1, borderRadius: 6, opacity: 1, rotation: 0 },
        scrollViewProps: { scrollDirection: 'vertical' },
      };
    case 'box':
    default:
      return {
        ...base,
        name: `Box ${index}`,
        type: 'box',
        flexStyle: { flex: 1 },
        visualStyle: {
          backgroundColor: 'transparent',
          borderColor: '#d1d5db',
          borderWidth: 1,
          borderRadius: 0,
          opacity: 1,
          rotation: 0,
        },
      };
  }
}

function createDefaultTree(): NodeTree {
  const rootId = generateId();

  const nodes: Record<string, CanvasNode> = {
    [rootId]: {
      id: rootId,
      name: 'Phone Screen',
      type: 'box',
      flexStyle: {
        width: 375,
        height: 667,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        flexWrap: 'nowrap',
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
      },
      visualStyle: {
        backgroundColor: '#f5f5f5',
        borderColor: '#d1d5db',
        borderWidth: 0,
        borderRadius: 0,
        opacity: 1,
        rotation: 0,
      },
      children: [],
      parentId: null,
      computedLayout: { left: 0, top: 0, width: 375, height: 667 },
    },
  };

  return { rootId, nodes };
}

const MAX_HISTORY = 50;

export function useNodeTree() {
  const [tree, setTree] = useState<NodeTree>(createDefaultTree);
  const [ready, setReady] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const yogaNodesRef = useRef<Map<string, YogaNode>>(new Map());
  const historyRef = useRef<{ past: NodeTree[]; future: NodeTree[] }>({ past: [], future: [] });
  const liveUpdateBaseRef = useRef<NodeTree | null>(null);

  const computeLayout = useCallback((newTree: NodeTree) => {
    freeYogaTree(yogaNodesRef.current);
    const yogaNodes = buildYogaTree(newTree);
    yogaNodesRef.current = yogaNodes;
    const rootNode = newTree.nodes[newTree.rootId];
    return calculateLayout(
      newTree,
      yogaNodes,
      flexValueToNum(rootNode.flexStyle.width, 800),
      flexValueToNum(rootNode.flexStyle.height, 600)
    );
  }, []);

  const commitMutation = useCallback(
    (mutate: (prev: NodeTree) => NodeTree | null) => {
      setTree((prev) => {
        const newTree = mutate(prev);
        if (!newTree) return prev;
        const h = historyRef.current;
        h.past = [...h.past.slice(-(MAX_HISTORY - 1)), prev];
        h.future = [];
        setCanUndo(true);
        setCanRedo(false);
        return computeLayout(newTree);
      });
    },
    [computeLayout]
  );

  const applyLiveUpdate = useCallback(
    (mutate: (prev: NodeTree) => NodeTree | null) => {
      setTree((prev) => {
        if (!liveUpdateBaseRef.current) {
          liveUpdateBaseRef.current = prev;
        }
        const newTree = mutate(prev);
        if (!newTree) return prev;
        return computeLayout(newTree);
      });
    },
    [computeLayout]
  );

  const commitLiveUpdate = useCallback(() => {
    if (liveUpdateBaseRef.current) {
      const h = historyRef.current;
      h.past = [...h.past.slice(-(MAX_HISTORY - 1)), liveUpdateBaseRef.current];
      h.future = [];
      setCanUndo(true);
      setCanRedo(false);
      liveUpdateBaseRef.current = null;
    }
  }, []);

  const undo = useCallback(() => {
    setTree((prev) => {
      const h = historyRef.current;
      if (h.past.length === 0) return prev;
      const previous = h.past[h.past.length - 1];
      h.past = h.past.slice(0, -1);
      h.future = [prev, ...h.future];
      setCanUndo(h.past.length > 0);
      setCanRedo(true);
      freeYogaTree(yogaNodesRef.current);
      const yogaNodes = buildYogaTree(previous);
      yogaNodesRef.current = yogaNodes;
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setTree((prev) => {
      const h = historyRef.current;
      if (h.future.length === 0) return prev;
      const next = h.future[0];
      h.past = [...h.past, prev];
      h.future = h.future.slice(1);
      setCanUndo(true);
      setCanRedo(h.future.length > 0);
      freeYogaTree(yogaNodesRef.current);
      const yogaNodes = buildYogaTree(next);
      yogaNodesRef.current = yogaNodes;
      return next;
    });
  }, []);

  useEffect(() => {
    initYoga().then(() => {
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) {
      setTree((prev) => computeLayout(prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const updateNodeFlexStyle = useCallback(
    (nodeId: string, updates: Partial<FlexStyle>) => {
      commitMutation((prev) => {
        const node = prev.nodes[nodeId];
        if (!node) return null;
        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [nodeId]: { ...node, flexStyle: { ...node.flexStyle, ...updates } },
          },
        };
      });
    },
    [commitMutation]
  );

  const updateNodeVisualStyle = useCallback(
    (nodeId: string, updates: Partial<VisualStyle>) => {
      commitMutation((prev) => {
        const node = prev.nodes[nodeId];
        if (!node) return null;
        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [nodeId]: { ...node, visualStyle: { ...node.visualStyle, ...updates } },
          },
        };
      });
    },
    [commitMutation]
  );

  const updateTextProps = useCallback(
    (nodeId: string, updates: Partial<TextProps>) => {
      commitMutation((prev) => {
        const node = prev.nodes[nodeId];
        if (!node || !node.textProps) return null;
        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [nodeId]: { ...node, textProps: { ...node.textProps, ...updates } },
          },
        };
      });
    },
    [commitMutation]
  );

  const updateImageProps = useCallback(
    (nodeId: string, updates: Partial<ImageProps>) => {
      commitMutation((prev) => {
        const node = prev.nodes[nodeId];
        if (!node || !node.imageProps) return null;
        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [nodeId]: { ...node, imageProps: { ...node.imageProps, ...updates } },
          },
        };
      });
    },
    [commitMutation]
  );

  const adaptFlexStyleForParent = (
    node: CanvasNode,
    newParent: CanvasNode,
    allNodes: Record<string, CanvasNode>,
  ): FlexStyle => {
    const dir = newParent.flexStyle.flexDirection ?? 'column';
    const isRow = dir === 'row' || dir === 'row-reverse';

    // Collect existing siblings (excluding the moved node)
    const siblings = newParent.children
      .filter((id) => id !== node.id)
      .map((id) => allNodes[id])
      .filter(Boolean);

    const adapted: FlexStyle = { ...node.flexStyle };

    // If node was absolute, reset to static so it participates in flow
    if (adapted.positionType === 'absolute') {
      adapted.positionType = undefined;
      adapted.positionTop = undefined;
      adapted.positionRight = undefined;
      adapted.positionBottom = undefined;
      adapted.positionLeft = undefined;
    }

    // Empty parent → keep original style (just fix absolute)
    if (siblings.length === 0) {
      return adapted;
    }

    // Has siblings → adopt the dominant sizing pattern from siblings
    const flexCount = siblings.filter((s) => s.flexStyle.flex !== undefined).length;
    const growCount = siblings.filter((s) => (s.flexStyle.flexGrow ?? 0) > 0).length;
    const usesFlex = flexCount >= Math.ceil(siblings.length / 2);
    const usesGrow = !usesFlex && growCount >= Math.ceil(siblings.length / 2);

    if (usesFlex) {
      // Siblings use flex shorthand → match that
      const avgFlex = siblings.reduce((sum, s) => sum + (s.flexStyle.flex ?? 0), 0) / flexCount;
      adapted.flex = avgFlex > 0 ? Math.round(avgFlex) : 1;
      adapted.flexGrow = undefined;
      adapted.flexShrink = undefined;
      adapted.flexBasis = undefined;
      if (isRow) { adapted.width = undefined; } else { adapted.height = undefined; }
    } else if (usesGrow) {
      // Siblings use flexGrow → match that
      const avgGrow = siblings.reduce((sum, s) => sum + (s.flexStyle.flexGrow ?? 0), 0) / growCount;
      adapted.flexGrow = avgGrow > 0 ? Math.round(avgGrow) : 1;
      adapted.flex = undefined;
      if (isRow) { adapted.width = undefined; } else { adapted.height = undefined; }
    } else {
      // Siblings use fixed/auto sizing → clear flex properties so node uses its natural size
      adapted.flex = undefined;
      adapted.flexGrow = undefined;
      adapted.flexShrink = undefined;
      adapted.flexBasis = undefined;
    }

    return adapted;
  };

  const moveNode = useCallback(
    (nodeId: string, newParentId: string, insertIndex?: number) => {
      commitMutation((prev) => {
        const node = prev.nodes[nodeId];
        const newParent = prev.nodes[newParentId];
        if (!node || !newParent || !node.parentId) return null;
        if (newParent.type === 'text') return null;
        const oldParent = prev.nodes[node.parentId];
        if (!oldParent) return null;

        const isSameParent = node.parentId === newParentId;
        // Remove from old parent
        const oldChildren = oldParent.children.filter((id) => id !== nodeId);

        let newChildren: string[];
        if (isSameParent) {
          // Reorder within same parent
          if (insertIndex === undefined) return null;
          newChildren = [...oldChildren];
          // Adjust index since we already removed the node
          const clampedIndex = Math.min(insertIndex, newChildren.length);
          newChildren.splice(clampedIndex, 0, nodeId);
        } else {
          // Move to different parent
          const targetChildren = [...newParent.children];
          if (insertIndex !== undefined) {
            targetChildren.splice(Math.min(insertIndex, targetChildren.length), 0, nodeId);
          } else {
            targetChildren.push(nodeId);
          }
          newChildren = targetChildren;
        }

        const updatedNodes = { ...prev.nodes };

        // When moving to a different parent, adapt flex style to fit the new layout
        if (!isSameParent) {
          const adaptedStyle = adaptFlexStyleForParent(node, newParent, prev.nodes);
          updatedNodes[nodeId] = { ...node, parentId: newParentId, flexStyle: adaptedStyle };
        } else {
          updatedNodes[nodeId] = { ...node, parentId: newParentId };
        }

        updatedNodes[node.parentId] = { ...oldParent, children: oldChildren };
        if (!isSameParent) {
          updatedNodes[newParentId] = { ...newParent, children: newChildren };
        } else {
          updatedNodes[newParentId] = { ...updatedNodes[newParentId], children: newChildren };
        }

        return { ...prev, nodes: updatedNodes };
      });
    },
    [commitMutation]
  );

  const addNodeByType = useCallback(
    (parentId: string, type: NodeType) => {
      commitMutation((prev) => {
        const parent = prev.nodes[parentId];
        if (!parent) return null;
        if (parent.type === 'text') return null;
        const index = Object.keys(prev.nodes).length;
        const newNode = createNodeByType(type, parentId, index);
        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [newNode.id]: newNode,
            [parentId]: { ...parent, children: [...parent.children, newNode.id] },
          },
        };
      });
    },
    [commitMutation]
  );

  const addChildNode = useCallback(
    (parentId: string) => addNodeByType(parentId, 'box'),
    [addNodeByType]
  );

  const addContainerNode = useCallback(
    (parentId: string) => {
      commitMutation((prev) => {
        const parent = prev.nodes[parentId];
        if (!parent) return null;
        if (parent.type === 'text') return null;

        const childCount = Object.keys(prev.nodes).length;
        const newId = generateId();
        const innerChild1 = generateId();
        const innerChild2 = generateId();

        const container: CanvasNode = {
          id: newId,
          name: `Container ${childCount}`,
          type: 'box',
          flexStyle: {
            flex: 1, flexDirection: 'column', gap: 6,
            paddingTop: 6, paddingRight: 6, paddingBottom: 6, paddingLeft: 6,
          },
          visualStyle: {
            backgroundColor: '#334155', borderColor: '#64748b',
            borderWidth: 1, borderRadius: 6, opacity: 1, rotation: 0,
          },
          children: [innerChild1, innerChild2],
          parentId,
          computedLayout: { left: 0, top: 0, width: 0, height: 0 },
        };

        const child1: CanvasNode = {
          id: innerChild1, name: `Sub 1`, type: 'box',
          flexStyle: { flex: 1 },
          visualStyle: { backgroundColor: pickColor(childCount + 1), borderColor: 'transparent', borderWidth: 0, borderRadius: 4, opacity: 0.9, rotation: 0 },
          children: [], parentId: newId,
          computedLayout: { left: 0, top: 0, width: 0, height: 0 },
        };

        const child2: CanvasNode = {
          id: innerChild2, name: `Sub 2`, type: 'box',
          flexStyle: { flex: 1 },
          visualStyle: { backgroundColor: pickColor(childCount + 2), borderColor: 'transparent', borderWidth: 0, borderRadius: 4, opacity: 0.9, rotation: 0 },
          children: [], parentId: newId,
          computedLayout: { left: 0, top: 0, width: 0, height: 0 },
        };

        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [newId]: container,
            [innerChild1]: child1,
            [innerChild2]: child2,
            [parentId]: { ...parent, children: [...parent.children, newId] },
          },
        };
      });
    },
    [commitMutation]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      commitMutation((prev) => {
        if (nodeId === prev.rootId) return null;
        const node = prev.nodes[nodeId];
        if (!node || !node.parentId) return null;

        const newNodes = { ...prev.nodes };
        const parent = newNodes[node.parentId];
        newNodes[node.parentId] = {
          ...parent,
          children: parent.children.filter((id) => id !== nodeId),
        };

        const toDelete = [nodeId];
        while (toDelete.length > 0) {
          const id = toDelete.pop()!;
          const n = newNodes[id];
          if (n) {
            toDelete.push(...n.children);
            delete newNodes[id];
          }
        }

        return { ...prev, nodes: newNodes };
      });
    },
    [commitMutation]
  );

  const resizeNode = useCallback(
    (nodeId: string, width: number, height: number) => {
      applyLiveUpdate((prev) => {
        const node = prev.nodes[nodeId];
        if (!node) return null;
        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [nodeId]: {
              ...node,
              flexStyle: {
                ...node.flexStyle,
                width: Math.max(20, Math.round(width)),
                height: Math.max(20, Math.round(height)),
                flex: undefined,
              },
            },
          },
        };
      });
    },
    [applyLiveUpdate]
  );

  const rotateNodeLive = useCallback(
    (nodeId: string, rotation: number) => {
      applyLiveUpdate((prev) => {
        const node = prev.nodes[nodeId];
        if (!node) return null;
        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [nodeId]: {
              ...node,
              visualStyle: { ...node.visualStyle, rotation },
            },
          },
        };
      });
    },
    [applyLiveUpdate]
  );

  const updateCanvasContainer = useCallback(
    (config: CanvasContainerConfig) => {
      commitMutation((prev) => {
        const root = prev.nodes[prev.rootId];
        if (!root) return null;
        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [prev.rootId]: {
              ...root,
              name: config.name,
              flexStyle: { ...root.flexStyle, width: config.width, height: config.height },
            },
          },
        };
      });
    },
    [commitMutation]
  );

  return {
    tree,
    ready,
    canUndo,
    canRedo,
    undo,
    redo,
    updateNodeFlexStyle,
    updateNodeVisualStyle,
    updateTextProps,
    addChildNode,
    addContainerNode,
    addNodeByType,
    deleteNode,
    moveNode,
    resizeNode,
    rotateNodeLive,
    commitLiveUpdate,
    updateImageProps,
    updateCanvasContainer,
  };
}
