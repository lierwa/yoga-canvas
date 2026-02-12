import { useState, useCallback, useRef, useEffect } from 'react';
import type { CanvasNode, NodeTree, FlexStyle, VisualStyle } from '../types';
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

function createDefaultTree(): NodeTree {
  const rootId = generateId();
  const child1Id = generateId();
  const child2Id = generateId();
  const child3Id = generateId();

  const nodes: Record<string, CanvasNode> = {
    [rootId]: {
      id: rootId,
      name: 'Root (Flex Container)',
      flexStyle: {
        width: 600,
        height: 400,
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        flexWrap: 'nowrap',
        gap: 10,
        paddingTop: 10,
        paddingRight: 10,
        paddingBottom: 10,
        paddingLeft: 10,
      },
      visualStyle: {
        backgroundColor: '#1e293b',
        borderColor: '#475569',
        borderWidth: 2,
        borderRadius: 8,
        opacity: 1,
      },
      children: [child1Id, child2Id, child3Id],
      parentId: null,
      computedLayout: { left: 0, top: 0, width: 600, height: 400 },
    },
    [child1Id]: {
      id: child1Id,
      name: 'Item 1',
      flexStyle: { flex: 1 },
      visualStyle: {
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        borderWidth: 0,
        borderRadius: 6,
        opacity: 0.9,
      },
      children: [],
      parentId: rootId,
      computedLayout: { left: 0, top: 0, width: 0, height: 0 },
    },
    [child2Id]: {
      id: child2Id,
      name: 'Item 2',
      flexStyle: { flex: 2 },
      visualStyle: {
        backgroundColor: '#22c55e',
        borderColor: '#16a34a',
        borderWidth: 0,
        borderRadius: 6,
        opacity: 0.9,
      },
      children: [],
      parentId: rootId,
      computedLayout: { left: 0, top: 0, width: 0, height: 0 },
    },
    [child3Id]: {
      id: child3Id,
      name: 'Item 3',
      flexStyle: { flex: 1 },
      visualStyle: {
        backgroundColor: '#f59e0b',
        borderColor: '#d97706',
        borderWidth: 0,
        borderRadius: 6,
        opacity: 0.9,
      },
      children: [],
      parentId: rootId,
      computedLayout: { left: 0, top: 0, width: 0, height: 0 },
    },
  };

  return { rootId, nodes };
}

export function useNodeTree() {
  const [tree, setTree] = useState<NodeTree>(createDefaultTree);
  const [ready, setReady] = useState(false);
  const yogaNodesRef = useRef<Map<string, YogaNode>>(new Map());

  const rebuildAndLayout = useCallback(
    (newTree: NodeTree, canvasW = 800, canvasH = 600) => {
      freeYogaTree(yogaNodesRef.current);
      const yogaNodes = buildYogaTree(newTree);
      yogaNodesRef.current = yogaNodes;

      const rootNode = newTree.nodes[newTree.rootId];
      const layoutTree = calculateLayout(
        newTree,
        yogaNodes,
        rootNode.flexStyle.width ?? canvasW,
        rootNode.flexStyle.height ?? canvasH
      );
      setTree(layoutTree);
      return layoutTree;
    },
    []
  );

  useEffect(() => {
    initYoga().then(() => {
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) {
      rebuildAndLayout(tree);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const updateNodeFlexStyle = useCallback(
    (nodeId: string, updates: Partial<FlexStyle>) => {
      setTree((prev) => {
        const node = prev.nodes[nodeId];
        if (!node) return prev;
        const newTree: NodeTree = {
          ...prev,
          nodes: {
            ...prev.nodes,
            [nodeId]: {
              ...node,
              flexStyle: { ...node.flexStyle, ...updates },
            },
          },
        };
        return rebuildAndLayout(newTree);
      });
    },
    [rebuildAndLayout]
  );

  const updateNodeVisualStyle = useCallback(
    (nodeId: string, updates: Partial<VisualStyle>) => {
      setTree((prev) => {
        const node = prev.nodes[nodeId];
        if (!node) return prev;
        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [nodeId]: {
              ...node,
              visualStyle: { ...node.visualStyle, ...updates },
            },
          },
        };
      });
    },
    []
  );

  const addChildNode = useCallback(
    (parentId: string) => {
      setTree((prev) => {
        const parent = prev.nodes[parentId];
        if (!parent) return prev;

        const childCount = Object.keys(prev.nodes).length;
        const newId = generateId();
        const newNode: CanvasNode = {
          id: newId,
          name: `Item ${childCount}`,
          flexStyle: { flex: 1 },
          visualStyle: {
            backgroundColor: pickColor(childCount),
            borderColor: 'transparent',
            borderWidth: 0,
            borderRadius: 6,
            opacity: 0.9,
          },
          children: [],
          parentId,
          computedLayout: { left: 0, top: 0, width: 0, height: 0 },
        };

        const newTree: NodeTree = {
          ...prev,
          nodes: {
            ...prev.nodes,
            [newId]: newNode,
            [parentId]: {
              ...parent,
              children: [...parent.children, newId],
            },
          },
        };
        return rebuildAndLayout(newTree);
      });
    },
    [rebuildAndLayout]
  );

  const addContainerNode = useCallback(
    (parentId: string) => {
      setTree((prev) => {
        const parent = prev.nodes[parentId];
        if (!parent) return prev;

        const childCount = Object.keys(prev.nodes).length;
        const newId = generateId();
        const innerChild1 = generateId();
        const innerChild2 = generateId();

        const container: CanvasNode = {
          id: newId,
          name: `Container ${childCount}`,
          flexStyle: {
            flex: 1,
            flexDirection: 'column',
            gap: 6,
            paddingTop: 6,
            paddingRight: 6,
            paddingBottom: 6,
            paddingLeft: 6,
          },
          visualStyle: {
            backgroundColor: '#334155',
            borderColor: '#64748b',
            borderWidth: 1,
            borderRadius: 6,
            opacity: 1,
          },
          children: [innerChild1, innerChild2],
          parentId,
          computedLayout: { left: 0, top: 0, width: 0, height: 0 },
        };

        const child1: CanvasNode = {
          id: innerChild1,
          name: `Sub 1`,
          flexStyle: { flex: 1 },
          visualStyle: {
            backgroundColor: pickColor(childCount + 1),
            borderColor: 'transparent',
            borderWidth: 0,
            borderRadius: 4,
            opacity: 0.9,
          },
          children: [],
          parentId: newId,
          computedLayout: { left: 0, top: 0, width: 0, height: 0 },
        };

        const child2: CanvasNode = {
          id: innerChild2,
          name: `Sub 2`,
          flexStyle: { flex: 1 },
          visualStyle: {
            backgroundColor: pickColor(childCount + 2),
            borderColor: 'transparent',
            borderWidth: 0,
            borderRadius: 4,
            opacity: 0.9,
          },
          children: [],
          parentId: newId,
          computedLayout: { left: 0, top: 0, width: 0, height: 0 },
        };

        const newTree: NodeTree = {
          ...prev,
          nodes: {
            ...prev.nodes,
            [newId]: container,
            [innerChild1]: child1,
            [innerChild2]: child2,
            [parentId]: {
              ...parent,
              children: [...parent.children, newId],
            },
          },
        };
        return rebuildAndLayout(newTree);
      });
    },
    [rebuildAndLayout]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setTree((prev) => {
        if (nodeId === prev.rootId) return prev;
        const node = prev.nodes[nodeId];
        if (!node || !node.parentId) return prev;

        const newNodes = { ...prev.nodes };

        // Remove from parent's children
        const parent = newNodes[node.parentId];
        newNodes[node.parentId] = {
          ...parent,
          children: parent.children.filter((id) => id !== nodeId),
        };

        // Delete node and all descendants
        const toDelete = [nodeId];
        while (toDelete.length > 0) {
          const id = toDelete.pop()!;
          const n = newNodes[id];
          if (n) {
            toDelete.push(...n.children);
            delete newNodes[id];
          }
        }

        const newTree: NodeTree = { ...prev, nodes: newNodes };
        return rebuildAndLayout(newTree);
      });
    },
    [rebuildAndLayout]
  );

  const resizeNode = useCallback(
    (nodeId: string, width: number, height: number) => {
      updateNodeFlexStyle(nodeId, {
        width: Math.max(20, Math.round(width)),
        height: Math.max(20, Math.round(height)),
        flex: undefined,
      });
    },
    [updateNodeFlexStyle]
  );

  return {
    tree,
    ready,
    updateNodeFlexStyle,
    updateNodeVisualStyle,
    addChildNode,
    addContainerNode,
    deleteNode,
    resizeNode,
  };
}
