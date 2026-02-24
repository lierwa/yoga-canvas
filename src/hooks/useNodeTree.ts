import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  CanvasNode,
  NodeTree,
  FlexStyle,
  VisualStyle,
  TextProps,
  ImageProps,
  NodeType,
  CanvasContainerConfig,
} from '../types';
import { H5Adapter, initYoga, NodeTreeManager, ScrollManager, computeScrollContentSizes } from '@yoga-canvas/core';
import type { NodeDescriptor } from '@yoga-canvas/core';

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
  '#6366f1', '#06b6d4',
];

function pickColor(index: number): string {
  return COLORS[index % COLORS.length];
}

function createDefaultDescriptor(): NodeDescriptor {
  return {
    type: 'view',
    name: 'Root',
    style: {
      width: 375,
      height: 667,
      flexDirection: 'column',
      backgroundColor: '#fff',
      padding: 16,
      gap: 12,
    },
    children: [
      {
        type: 'view',
        name: 'Header',
        style: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#6366f1',
          borderRadius: 12,
          padding: 16,
          gap: 12,
        },
        children: [
          {
            type: 'image',
            name: 'Avatar',
            src: 'https://api.dicebear.com/7.x/avataaars/svg?seed=yoga',
            style: { width: 48, height: 48, borderRadius: 24 },
          },
          {
            type: 'view',
            name: 'UserInfo',
            style: { flex: 1, flexDirection: 'column', gap: 4 },
            children: [
              {
                type: 'text',
                name: 'Username',
                content: 'Yoga Canvas',
                style: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
              },
              {
                type: 'text',
                name: 'Bio',
                content: 'A powerful canvas layout engine',
                style: { fontSize: 12, color: '#c7d2fe' },
              },
            ],
          },
        ],
      },
      {
        type: 'view',
        name: 'StatsRow',
        style: { flexDirection: 'row', gap: 8 },
        children: [
          {
            type: 'view',
            name: 'Stats1',
            style: {
              flex: 1,
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: '#fff',
              borderRadius: 10,
              padding: 12,
              gap: 4,
              borderWidth: 1,
              borderColor: '#e2e8f0',
            },
            children: [
              {
                type: 'text',
                name: 'NodesValue',
                content: '128',
                style: { fontSize: 20, fontWeight: 'bold', color: '#8b5cf6' },
              },
              {
                type: 'text',
                name: 'NodesLabel',
                content: 'Nodes',
                style: { fontSize: 11, color: '#94a3b8' },
              },
              {
                type: 'view',
                name: 'Badge',
                style: {
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  backgroundColor: '#ef4444',
                  borderRadius: 8,
                  padding: 2,
                  paddingLeft: 6,
                  paddingRight: 6,
                },
                children: [
                  {
                    type: 'text',
                    name: 'BadgeText',
                    content: 'NEW',
                    style: {
                      fontSize: 9,
                      width: 22,
                      height: 12,
                      flexDirection: 'row',
                      fontWeight: 'bold',
                      color: '#ffffff',
                    },
                  },
                ],
              },
            ],
          },
          {
            type: 'view',
            name: 'Stats2',
            style: {
              flex: 1,
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: '#fff',
              borderRadius: 10,
              padding: 12,
              gap: 4,
              borderWidth: 1,
              borderColor: '#e2e8f0',
            },
            children: [
              {
                type: 'text',
                name: 'RenderValue',
                content: '16ms',
                style: { fontSize: 20, fontWeight: 'bold', color: '#06b6d4' },
              },
              {
                type: 'text',
                name: 'RenderLabel',
                content: 'Render',
                style: { fontSize: 11, color: '#94a3b8' },
              },
            ],
          },
          {
            type: 'view',
            name: 'Stats3',
            style: {
              flex: 1,
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              backgroundColor: '#fff',
              borderRadius: 10,
              padding: 12,
              gap: 4,
              borderWidth: 1,
              borderColor: '#e2e8f0',
            },
            children: [
              {
                type: 'text',
                name: 'FPSValue',
                content: '60',
                style: { fontSize: 20, fontWeight: 'bold', color: '#10b981' },
              },
              {
                type: 'text',
                name: 'FPSLabel',
                content: 'FPS',
                style: { fontSize: 11, flex: 1, color: '#94a3b8' },
              },
            ],
          },
        ],
      },
      {
        type: 'view',
        name: 'ContentCard',
        style: {
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: 16,
          gap: 8,
          borderWidth: 1,
          borderColor: '#e2e8f0',
        },
        children: [
          {
            type: 'text',
            name: 'Title',
            content: 'Flexbox Layout Engine',
            style: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
          },
          {
            type: 'text',
            name: 'Description',
            content: 'Build complex canvas layouts with familiar CSS flexbox. Powered by yoga-layout.',
            style: { fontSize: 13, color: '#64748b', lineHeight: 1.6 },
          },
        ],
      },
      {
        type: 'scrollview',
        name: 'FeatureList',
        scrollDirection: 'vertical',
        style: {
          flex: 1,
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: 12,
          gap: 8,
          borderWidth: 1,
          borderColor: '#e2e8f0',
        },
        children: [
          featureRowDescriptor('View', 'Flex container with all CSS props', '#6366f1', '#6366f10a'),
          featureRowDescriptor('Text', 'Auto word-wrapping text node', '#f59e0b', '#f59e0b0a'),
          featureRowDescriptor('Image', 'Cover / Contain / Fill modes', '#ec4899', '#ec48990a'),
          featureRowDescriptor('ScrollView', 'Real scrolling with wheel events!', '#14b8a6', '#14b8a60a'),
          featureRowDescriptor('Export', 'JSON / DataURL / DOM string', '#8b5cf6', '#8b5cf60a'),
          featureRowDescriptor('Hit Test', 'Click to select nodes', '#ef4444', '#ef44440a'),
          featureRowDescriptor('JSX API', 'Write layouts as React components', '#22c55e', '#22c55e0a'),
        ],
      },
    ],
  };
}

function featureRowDescriptor(title: string, subtitle: string, dotColor: string, bg: string): NodeDescriptor {
  return {
    type: 'view',
    style: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: bg,
      borderRadius: 8,
      padding: 10,
    },
    children: [
      {
        type: 'view',
        style: { width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor },
      },
      {
        type: 'view',
        style: { flex: 1, flexDirection: 'column', gap: 2 },
        children: [
          {
            type: 'text',
            content: title,
            style: { fontSize: 13, fontWeight: 'bold', color: '#334155' },
          },
          {
            type: 'text',
            content: subtitle,
            style: { fontSize: 11, color: '#94a3b8' },
          },
        ],
      },
    ],
  };
}

function createDescriptorByType(type: NodeType, index: number): NodeDescriptor {
  switch (type) {
    case 'text':
      return {
        type: 'text',
        name: `Text ${index}`,
        content: 'Text',
        style: {
          paddingTop: 4,
          paddingRight: 4,
          paddingBottom: 4,
          paddingLeft: 4,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: 0,
          opacity: 1,
          rotate: 0,
          fontSize: 14,
          fontWeight: 'normal',
          fontFamily: 'sans-serif',
          color: '#1f2937',
          lineHeight: 1.4,
          textAlign: 'left',
        },
      };
    case 'image':
      return {
        type: 'image',
        name: `Image ${index}`,
        src: '',
        objectFit: 'cover',
        style: {
          width: 120,
          height: 120,
          backgroundColor: '#e0e7ff',
          borderColor: '#6366f1',
          borderWidth: 1,
          borderRadius: 6,
          opacity: 1,
          rotate: 0,
        },
      };
    case 'scrollview':
      return {
        type: 'scrollview',
        name: `ScrollView ${index}`,
        scrollDirection: 'vertical',
        scrollBarVisibility: 'auto',
        style: {
          flex: 1,
          flexDirection: 'column',
          gap: 8,
          padding: 12,
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          borderRadius: 12,
        },
      };
    case 'view':
    default:
      return {
        type: 'view',
        name: `Box ${index}`,
        style: {
          flex: 1,
          backgroundColor: 'transparent',
          borderColor: '#d1d5db',
          borderWidth: 1,
          borderRadius: 0,
          opacity: 1,
          rotate: 0,
        },
      };
  }
}

function createContainerDescriptor(index: number): NodeDescriptor {
  return {
    type: 'view',
    name: `Container ${index}`,
    style: {
      flex: 1,
      flexDirection: 'column',
      gap: 6,
      paddingTop: 6,
      paddingRight: 6,
      paddingBottom: 6,
      paddingLeft: 6,
      backgroundColor: '#334155',
      borderColor: '#64748b',
      borderWidth: 1,
      borderRadius: 6,
      opacity: 1,
      rotate: 0,
    },
    children: [
      {
        type: 'view',
        name: 'Sub 1',
        style: {
          flex: 1,
          backgroundColor: pickColor(index + 1),
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: 4,
          opacity: 0.9,
          rotate: 0,
        },
      },
      {
        type: 'view',
        name: 'Sub 2',
        style: {
          flex: 1,
          backgroundColor: pickColor(index + 2),
          borderColor: 'transparent',
          borderWidth: 0,
          borderRadius: 4,
          opacity: 0.9,
          rotate: 0,
        },
      },
    ],
  };
}

export function useNodeTree() {
  const [tree, setTree] = useState<NodeTree>({ rootId: '', nodes: {} });
  const [ready, setReady] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const adapterRef = useRef<H5Adapter | null>(null);
  const managerRef = useRef<NodeTreeManager | null>(null);
  const scrollManagerRef = useRef<ScrollManager>(new ScrollManager());

  const refresh = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;
    const nextTree = manager.getTree();
    computeScrollContentSizes(nextTree, scrollManagerRef.current);
    setTree(nextTree);
    setCanUndo(manager.canUndo);
    setCanRedo(manager.canRedo);
  }, []);

  useEffect(() => {
    const adapter = new H5Adapter();
    const manager = new NodeTreeManager(adapter);
    const scrollManager = scrollManagerRef.current;
    adapterRef.current = adapter;
    managerRef.current = manager;

    initYoga().then(() => {
      manager.buildFromDescriptor(createDefaultDescriptor());
      manager.computeLayout();
      refresh();
      setReady(true);
    });

    return () => {
      manager.destroy();
      scrollManager.reset();
      adapterRef.current = null;
      managerRef.current = null;
    };
  }, [refresh]);

  const updateNodeFlexStyle = useCallback(
    (nodeId: string, updates: Partial<FlexStyle>) => {
      const manager = managerRef.current;
      if (!manager) return;
      manager.updateFlexStyle(nodeId, updates);
      refresh();
    },
    [refresh],
  );

  const updateNodeVisualStyle = useCallback(
    (nodeId: string, updates: Partial<VisualStyle>) => {
      const manager = managerRef.current;
      if (!manager) return;
      manager.updateVisualStyle(nodeId, updates);
      refresh();
    },
    [refresh],
  );

  const updateTextProps = useCallback(
    (nodeId: string, updates: Partial<TextProps>) => {
      const manager = managerRef.current;
      if (!manager) return;
      manager.updateTextProps(nodeId, updates);
      refresh();
    },
    [refresh],
  );

  const updateImageProps = useCallback(
    (nodeId: string, updates: Partial<ImageProps>) => {
      const manager = managerRef.current;
      if (!manager) return;
      manager.updateImageProps(nodeId, updates);
      refresh();
    },
    [refresh],
  );

  const commitLiveUpdate = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;
    manager.commitLive();
    refresh();
  }, [refresh]);

  const undo = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;
    if (!manager.undo()) return;
    refresh();
  }, [refresh]);

  const redo = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;
    if (!manager.redo()) return;
    refresh();
  }, [refresh]);

  const adaptFlexStyleForParent = useCallback(
    (node: CanvasNode, newParent: CanvasNode, allNodes: Record<string, CanvasNode>): FlexStyle => {
      const dir = newParent.flexStyle.flexDirection ?? 'column';
      const isRow = dir === 'row' || dir === 'row-reverse';

      const siblings: CanvasNode[] = [];
      for (const childId of newParent.children) {
        if (childId === node.id) continue;
        const sibling = allNodes[childId];
        if (sibling) siblings.push(sibling);
      }

      const adapted: FlexStyle = { ...node.flexStyle };

      if (adapted.position === 'absolute') {
        adapted.position = undefined;
        adapted.top = undefined;
        adapted.right = undefined;
        adapted.bottom = undefined;
        adapted.left = undefined;
      }

      if (siblings.length === 0) return adapted;

      const flexCount = siblings.filter((sibling) => sibling.flexStyle.flex !== undefined).length;
      const growCount = siblings.filter((sibling) => (sibling.flexStyle.flexGrow ?? 0) > 0).length;
      const usesFlex = flexCount >= Math.ceil(siblings.length / 2);
      const usesGrow = !usesFlex && growCount >= Math.ceil(siblings.length / 2);

      if (usesFlex) {
        const avgFlex = siblings.reduce((sum, sibling) => sum + (sibling.flexStyle.flex ?? 0), 0) / flexCount;
        adapted.flex = avgFlex > 0 ? Math.round(avgFlex) : 1;
        adapted.flexGrow = undefined;
        adapted.flexShrink = undefined;
        adapted.flexBasis = undefined;
        if (isRow) adapted.width = undefined;
        else adapted.height = undefined;
      } else if (usesGrow) {
        const avgGrow = siblings.reduce((sum, sibling) => sum + (sibling.flexStyle.flexGrow ?? 0), 0) / growCount;
        adapted.flexGrow = avgGrow > 0 ? Math.round(avgGrow) : 1;
        adapted.flex = undefined;
        if (isRow) adapted.width = undefined;
        else adapted.height = undefined;
      } else {
        adapted.flex = undefined;
        adapted.flexGrow = undefined;
        adapted.flexShrink = undefined;
        adapted.flexBasis = undefined;
      }

      return adapted;
    },
    [],
  );

  const moveNode = useCallback(
    (nodeId: string, newParentId: string, insertIndex?: number) => {
      const manager = managerRef.current;
      if (!manager) return;

      manager.commit((prev: NodeTree) => {
        const node = prev.nodes[nodeId];
        const newParent = prev.nodes[newParentId];
        if (!node || !newParent || !node.parentId) return null;
        if (newParent.type === 'text') return null;
        const oldParent = prev.nodes[node.parentId];
        if (!oldParent) return null;

        const isSameParent = node.parentId === newParentId;
        const oldChildren = oldParent.children.filter((id: string) => id !== nodeId);

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

        const updatedNodes = { ...prev.nodes };

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

      refresh();
    },
    [adaptFlexStyleForParent, refresh],
  );

  const addNodeByType = useCallback(
    (parentId: string, type: NodeType) => {
      const manager = managerRef.current;
      if (!manager) return;
      const current = manager.getTree();
      const parent = current.nodes[parentId];
      if (!parent || parent.type === 'text') return;
      const index = Object.keys(current.nodes).length;
      manager.addChild(parentId, createDescriptorByType(type, index));
      refresh();
    },
    [refresh],
  );

  const addChildNode = useCallback(
    (parentId: string) => addNodeByType(parentId, 'view'),
    [addNodeByType],
  );

  const addContainerNode = useCallback(
    (parentId: string) => {
      const manager = managerRef.current;
      if (!manager) return;
      const current = manager.getTree();
      const parent = current.nodes[parentId];
      if (!parent || parent.type === 'text') return;
      const index = Object.keys(current.nodes).length;
      manager.addChild(parentId, createContainerDescriptor(index));
      refresh();
    },
    [refresh],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      const manager = managerRef.current;
      if (!manager) return;
      manager.deleteNode(nodeId);
      refresh();
    },
    [refresh],
  );

  const resizeNode = useCallback(
    (nodeId: string, width: number, height: number) => {
      const manager = managerRef.current;
      if (!manager) return;
      manager.applyLive((prev: NodeTree) => {
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
      refresh();
    },
    [refresh],
  );

  const rotateNodeLive = useCallback(
    (nodeId: string, rotate: number) => {
      const manager = managerRef.current;
      if (!manager) return;
      manager.applyLive((prev: NodeTree) => {
        const node = prev.nodes[nodeId];
        if (!node) return null;
        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [nodeId]: {
              ...node,
              visualStyle: { ...node.visualStyle, rotate },
            },
          },
        };
      });
      refresh();
    },
    [refresh],
  );

  const updateCanvasContainer = useCallback(
    (config: CanvasContainerConfig) => {
      const manager = managerRef.current;
      if (!manager) return;
      manager.commit((prev: NodeTree) => {
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
      refresh();
    },
    [refresh],
  );

  return {
    tree,
    ready,
    canUndo,
    canRedo,
    scrollManager: scrollManagerRef.current,
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
