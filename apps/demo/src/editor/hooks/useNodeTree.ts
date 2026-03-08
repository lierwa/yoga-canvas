import { useState, useCallback, useRef, useEffect } from "react";
import type {
  CanvasNode,
  NodeTree,
  FlexStyle,
  VisualStyle,
  TextProps,
  ImageProps,
  NodeType,
  CanvasContainerConfig,
} from "../types";
import {
  H5Adapter,
  initYoga,
  NodeTreeManager,
  ScrollManager,
  computeScrollContentSizes,
  importFromJSON,
} from "@yoga-canvas/core";
import type { NodeDescriptor, MotionSpec } from "@yoga-canvas/core";
import type { NodeEventBindings } from "@yoga-canvas/core";

const COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
  "#06b6d4",
];

function pickColor(index: number): string {
  return COLORS[index % COLORS.length];
}

type Rgb = { r: number; g: number; b: number };

const PALETTE = {
  white: "#ffffff",
  black: "#000000",
  slate50: "#f8fafc",
  slate200: "#e2e8f0",
  slate400: "#94a3b8",
  slate500: "#64748b",
  slate900: "#0f172a",
  indigo50: "#eef2ff",
  indigo500: "#6366f1",
  violet500: "#8b5cf6",
  cyan500: "#06b6d4",
  green500: "#10b981",
  pink500: "#ec4899",
  teal500: "#14b8a6",
  amber500: "#f59e0b",
  amber900: "#78350f",
  yellow400: "#fde047",
  red500: "#ef4444",
};

const SPACE = { xs: 4, sm: 6, md: 8, lg: 12, xl: 16 };

const RADII = { none: 0, sm: 4, md: 8, lg: 12, xl: 24 };

const SIZE = { avatar: 48, mediaHeight: 64 };

const TYPE = {
  size: { s8: 8, s10: 10, s12: 12, s14: 14, s16: 16, s18: 18 },
  weight: { regular: 400, bold: 700 },
};

const hexToRgb = (hex: string): Rgb | null => {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((ch) => `${ch}${ch}`)
          .join("")
      : normalized;
  if (full.length !== 6) return null;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
};

const withAlpha = (hex: string, alpha: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0, 0, 0, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const shadow = (
  color: string,
  blur: number,
  offsetY: number,
  offsetX = 0,
  spread = 0,
) => ({
  color,
  blur,
  offsetX,
  offsetY,
  spread,
});

const textShadow = (
  color: string,
  blur: number,
  offsetY: number,
  offsetX = 0,
) => ({
  color,
  blur,
  offsetX,
  offsetY,
});

const SHADOWS = {
  sm: shadow(withAlpha(PALETTE.slate900, 0.12), 12, 6, 6),
  md: shadow(withAlpha(PALETTE.slate900, 0.18), 16, 8, 8),
  lg: shadow(withAlpha(PALETTE.slate900, 0.25), 24, 10, 10),
};

const TEXT_SHADOWS = {
  onBrand: textShadow(withAlpha(PALETTE.black, 0.35), 6, 2),
  title: textShadow(withAlpha(PALETTE.black, 0.15), 4, 1),
};

const TEXT_STYLES = {
  header: {
    fontSize: TYPE.size.s18,
    fontWeight: TYPE.weight.bold,
    color: PALETTE.white,
    textShadow: TEXT_SHADOWS.onBrand,
  },
  headerSub: {
    fontSize: TYPE.size.s12,
    color: withAlpha(PALETTE.white, 0.85),
  },
  title: {
    fontSize: TYPE.size.s16,
    fontWeight: TYPE.weight.bold,
    color: PALETTE.slate900,
    textShadow: TEXT_SHADOWS.title,
  },
  body: {
    fontSize: TYPE.size.s12,
    color: PALETTE.slate500,
    lineHeight: 1.6,
    fontStyle: "italic" as const,
  },
  label: {
    fontSize: TYPE.size.s10,
    color: PALETTE.slate400,
  },
  badgeBase: {
    fontSize: TYPE.size.s8,
    width: 22,
    height: 12,
    textAlign: "center" as const,
    flexDirection: "row" as const,
    fontWeight: TYPE.weight.bold,
  },
  featureTitle: {
    fontSize: TYPE.size.s12,
    fontWeight: TYPE.weight.bold,
    color: PALETTE.slate900,
  },
  featureSubtitle: {
    fontSize: TYPE.size.s10,
    color: PALETTE.slate400,
  },
};

function createDefaultDescriptor(): NodeDescriptor {
  return {
    type: "view",
    name: "Root",
    style: {
      width: 375,
      height: 667,
      flexDirection: "column",
      backgroundColor: PALETTE.white,
      padding: SPACE.xl,
      gap: SPACE.lg,
    },
    children: [
      {
        type: "view",
        name: "Header",
        style: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: PALETTE.indigo500,
          linearGradient: {
            start: { x: 0, y: 0 },
            end: { x: 1, y: 0 },
            colors: [
              { offset: 0, color: PALETTE.indigo500 },
              { offset: 1, color: PALETTE.violet500 },
            ],
          },
          borderRadius: RADII.lg,
          padding: SPACE.xl,
          gap: SPACE.lg,
          boxShadow: SHADOWS.sm,
        },
        children: [
          {
            type: "image",
            name: "Avatar",
            src: "https://api.dicebear.com/7.x/avataaars/svg?seed=yoga",
            objectFit: "cover",
            style: {
              width: SIZE.avatar,
              height: SIZE.avatar,
              borderRadius: SIZE.avatar / 2,
              backgroundColor: PALETTE.indigo50,
            },
          },
          {
            type: "view",
            name: "UserInfo",
            style: { flex: 1, flexDirection: "column", gap: SPACE.xs },
            children: [
              {
                type: "text",
                name: "Username",
                content: "Yoga Canvas",
                style: TEXT_STYLES.header,
              },
              {
                type: "text",
                name: "Bio",
                content: "A powerful canvas layout engine",
                style: TEXT_STYLES.headerSub,
              },
            ],
          },
        ],
      },
      {
        type: "view",
        name: "StatsRow",
        style: { flexDirection: "row", gap: SPACE.md, position: "relative" },
        children: [
          {
            type: "view",
            name: "Stats1",
            style: {
              flex: 1,
              flexDirection: "column",
              alignItems: "flex-start",
              backgroundColor: PALETTE.white,
              borderRadius: RADII.md,
              padding: SPACE.lg,
              gap: SPACE.xs,
              borderWidth: 1,
              borderColor: PALETTE.slate200,
              boxShadow: SHADOWS.sm,
            },
            children: [
              {
                type: "text",
                name: "NodesValue",
                content: "128",
                style: { fontSize: 20, fontWeight: "bold", color: PALETTE.violet500 },
              },
              {
                type: "text",
                name: "NodesLabel",
                content: "Nodes",
                style: TEXT_STYLES.label,
              },
              {
                type: "view",
                name: "BadgeBack",
                style: {
                  position: "absolute",
                  top: -6,
                  right: -6,
                  backgroundColor: PALETTE.yellow400,
                  borderRadius: RADII.sm + 1,
                  padding: 2,
                  paddingLeft: 7,
                  paddingRight: 7,
                  zIndex: 0,
                },
                children: [
                  {
                    type: "text",
                    name: "BadgeBackText",
                    content: "HOT",
                    style: { ...TEXT_STYLES.badgeBase, color: PALETTE.amber900 },
                  },
                ],
              },
              {
                type: "view",
                name: "Badge",
                style: {
                  position: "absolute",
                  top: -4,
                  right: -4,
                  backgroundColor: PALETTE.red500,
                  borderRadius: RADII.sm,
                  padding: 2,
                  paddingLeft: 6,
                  paddingRight: 6,
                  zIndex: 2,
                },
                children: [
                  {
                    type: "text",
                    name: "BadgeText",
                    content: "NEW",
                    style: { ...TEXT_STYLES.badgeBase, color: PALETTE.white },
                  },
                ],
              },
            ],
          },
          {
            type: "view",
            name: "Stats2",
            style: {
              flex: 1,
              flexDirection: "column",
              alignItems: "flex-start",
              backgroundColor: PALETTE.white,
              borderRadius: RADII.md,
              padding: SPACE.lg,
              gap: SPACE.xs,
              borderWidth: 1,
              borderColor: PALETTE.slate200,
              boxShadow: SHADOWS.sm,
            },
            children: [
              {
                type: "text",
                name: "RenderValue",
                content: "16ms",
                style: { fontSize: 20, fontWeight: "bold", color: PALETTE.cyan500 },
              },
              {
                type: "text",
                name: "RenderLabel",
                content: "Render",
                style: TEXT_STYLES.label,
              },
            ],
          },
          {
            type: "view",
            name: "Stats3",
            style: {
              flex: 1,
              flexDirection: "column",
              flexWrap: "wrap",
              alignItems: "flex-start",
              backgroundColor: PALETTE.white,
              borderRadius: RADII.md,
              padding: SPACE.lg,
              gap: SPACE.xs,
              borderWidth: 1,
              borderColor: PALETTE.slate200,
              boxShadow: SHADOWS.sm,
            },
            children: [
              {
                type: "text",
                name: "FPSValue",
                content: "60",
                style: { fontSize: 20, fontWeight: "bold", color: PALETTE.green500 },
              },
              {
                type: "text",
                name: "FPSLabel",
                content: "FPS",
                style: { ...TEXT_STYLES.label, flex: 1 },
              },
            ],
          },
        ],
      },
      {
        type: "view",
        name: "ContentCard",
        style: {
          flexDirection: "column",
          backgroundColor: PALETTE.white,
          borderRadius: RADII.lg,
          padding: SPACE.xl,
          gap: SPACE.md,
          borderWidth: 1,
          borderColor: PALETTE.slate200,
          boxShadow: SHADOWS.sm,
        },
        children: [
          {
            type: "text",
            name: "Title",
            content: "Flexbox Layout Engine",
            style: TEXT_STYLES.title,
          },
          {
            type: "text",
            name: "Description",
            content:
              "Build complex canvas layouts with familiar CSS flexbox. Powered by yoga-layout.",
            style: TEXT_STYLES.body,
          },
          {
            type: "view",
            name: "MediaRow",
            style: {
              flexDirection: "row",
              gap: SPACE.md,
              backgroundColor: PALETTE.slate50,
              borderRadius: RADII.md,
              padding: SPACE.md,
            },
            children: [
              {
                type: "view",
                name: "CoverCard",
                style: { flex: 1, gap: SPACE.sm },
                children: [
                  {
                    type: "image",
                    name: "CoverImage",
                    src: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=400&auto=format&fit=crop",
                    objectFit: "cover",
                    style: {
                      width: "100%",
                      height: SIZE.mediaHeight,
                      borderRadius: RADII.sm,
                      backgroundColor: PALETTE.slate200,
                    },
                  },
                  {
                    type: "text",
                    name: "CoverLabel",
                    content: "Image fit: cover",
                    style: { ...TEXT_STYLES.label, textAlign: "center" },
                  },
                ],
              },
              {
                type: "view",
                name: "ContainCard",
                style: { flex: 1, gap: SPACE.sm },
                children: [
                  {
                    type: "image",
                    name: "ContainImage",
                    src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=400&auto=format&fit=crop",
                    objectFit: "contain",
                    style: {
                      width: "100%",
                      height: SIZE.mediaHeight,
                      borderRadius: RADII.sm,
                      backgroundColor: PALETTE.slate200,
                    },
                  },
                  {
                    type: "text",
                    name: "ContainLabel",
                    content: "Image fit: contain",
                    style: { ...TEXT_STYLES.label, textAlign: "center" },
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "scrollview",
        name: "FeatureList",
        scrollDirection: "vertical",
        style: {
          flex: 1,
          flexDirection: "column",
          backgroundColor: PALETTE.white,
          borderRadius: RADII.lg,
          padding: SPACE.lg,
          gap: SPACE.md,
          borderWidth: 1,
          borderColor: PALETTE.slate200,
          boxShadow: SHADOWS.sm,
        },
        children: [
          featureRowDescriptor("View", "Flex container with all CSS props", PALETTE.indigo500, withAlpha(PALETTE.indigo500, 0.04)),
          featureRowDescriptor("Text", "Auto word-wrapping text node", PALETTE.amber500, withAlpha(PALETTE.amber500, 0.04)),
          featureRowDescriptor("Image", "Cover / Contain / Fill modes", PALETTE.pink500, withAlpha(PALETTE.pink500, 0.04)),
          featureRowDescriptor("ScrollView", "Real scrolling with wheel events!", PALETTE.teal500, withAlpha(PALETTE.teal500, 0.04)),
          featureRowDescriptor("Export", "JSON / DataURL / DOM string", PALETTE.violet500, withAlpha(PALETTE.violet500, 0.04)),
          featureRowDescriptor("Hit Test", "Click to select nodes", PALETTE.red500, withAlpha(PALETTE.red500, 0.04)),
          featureRowDescriptor("JSX API", "Write layouts as React components", PALETTE.green500, withAlpha(PALETTE.green500, 0.04)),
        ],
      },
    ],
  };
}

function featureRowDescriptor(
  title: string,
  subtitle: string,
  dotColor: string,
  bg: string,
): NodeDescriptor {
  return {
    type: "view",
    style: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACE.md,
      backgroundColor: bg,
      borderRadius: RADII.sm,
      padding: SPACE.md,
    },
    children: [
      {
        type: "view",
        style: {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: dotColor,
        },
      },
      {
        type: "view",
        style: { flex: 1, flexDirection: "column", gap: SPACE.xs },
        children: [
          {
            type: "text",
            content: title,
            style: TEXT_STYLES.featureTitle,
          },
          {
            type: "text",
            content: subtitle,
            style: TEXT_STYLES.featureSubtitle,
          },
        ],
      },
    ],
  };
}

function createDescriptorByType(type: NodeType, index: number): NodeDescriptor {
  switch (type) {
    case "text":
      return {
        type: "text",
        name: `Text ${index}`,
        content: "Text",
        style: {
          paddingTop: SPACE.xs,
          paddingRight: SPACE.xs,
          paddingBottom: SPACE.xs,
          paddingLeft: SPACE.xs,
          backgroundColor: "transparent",
          borderColor: "transparent",
          borderWidth: 0,
          borderRadius: RADII.none,
          opacity: 1,
          rotate: 0,
          fontSize: TYPE.size.s14,
          fontWeight: TYPE.weight.regular,
          fontFamily: "sans-serif",
          color: PALETTE.slate900,
          lineHeight: 1.4,
          textAlign: "left",
        },
      };
    case "image":
      return {
        type: "image",
        name: `Image ${index}`,
        src: "",
        objectFit: "cover",
        style: {
          width: 120,
          height: 120,
          backgroundColor: PALETTE.indigo50,
          borderColor: PALETTE.indigo500,
          borderWidth: 1,
          borderRadius: RADII.sm,
          opacity: 1,
          rotate: 0,
        },
      };
    case "scrollview":
      return {
        type: "scrollview",
        name: `ScrollView ${index}`,
        scrollDirection: "vertical",
        scrollBarVisibility: "auto",
        style: {
          flex: 1,
          flexDirection: "column",
          gap: SPACE.md,
          padding: SPACE.lg,
          backgroundColor: PALETTE.white,
          borderColor: PALETTE.slate200,
          borderWidth: 1,
          borderRadius: RADII.lg,
        },
      };
    case "view":
    default:
      return {
        type: "view",
        name: `Box ${index}`,
        style: {
          flex: 1,
          backgroundColor: "transparent",
          borderColor: PALETTE.slate200,
          borderWidth: 1,
          borderRadius: RADII.none,
          opacity: 1,
          rotate: 0,
        },
      };
  }
}

function createContainerDescriptor(index: number): NodeDescriptor {
  return {
    type: "view",
    name: `Container ${index}`,
    style: {
      flex: 1,
      flexDirection: "column",
      gap: SPACE.sm,
      paddingTop: SPACE.sm,
      paddingRight: SPACE.sm,
      paddingBottom: SPACE.sm,
      paddingLeft: SPACE.sm,
      backgroundColor: PALETTE.slate900,
      borderColor: PALETTE.slate500,
      borderWidth: 1,
      borderRadius: RADII.sm,
      opacity: 1,
      rotate: 0,
    },
    children: [
      {
        type: "view",
        name: "Sub 1",
        style: {
          flex: 1,
          backgroundColor: pickColor(index + 1),
          borderColor: "transparent",
          borderWidth: 0,
          borderRadius: RADII.sm,
          opacity: 0.9,
          rotate: 0,
        },
      },
      {
        type: "view",
        name: "Sub 2",
        style: {
          flex: 1,
          backgroundColor: pickColor(index + 2),
          borderColor: "transparent",
          borderWidth: 0,
          borderRadius: RADII.sm,
          opacity: 0.9,
          rotate: 0,
        },
      },
    ],
  };
}

export function getLegacyDemoDescriptor(): NodeDescriptor {
  return createDefaultDescriptor();
}

type UseNodeTreeOptions = {
  initialDescriptor?: NodeDescriptor;
  initialTreeJSON?: string;
};

export function useNodeTree(options?: UseNodeTreeOptions) {
  const [tree, setTree] = useState<NodeTree>({ rootId: "", nodes: {} });
  const [ready, setReady] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const adapterRef = useRef<H5Adapter | null>(null);
  const managerRef = useRef<NodeTreeManager | null>(null);
  const scrollManagerRef = useRef<ScrollManager>(new ScrollManager());
  const initialOptionsRef = useRef<UseNodeTreeOptions | undefined>(options);

  const refresh = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;
    const nextTree = manager.getTree();
    computeScrollContentSizes(nextTree, scrollManagerRef.current);
    setTree(nextTree);
    setCanUndo(manager.canUndo);
    setCanRedo(manager.canRedo);
  }, []);

  const replaceDescriptor = useCallback(
    (descriptor: NodeDescriptor) => {
      const adapter = adapterRef.current;
      const prevManager = managerRef.current;
      if (!adapter) return;

      prevManager?.destroy();
      scrollManagerRef.current.reset();

      const nextManager = new NodeTreeManager(adapter);
      nextManager.buildFromDescriptor(descriptor);
      nextManager.computeLayout();
      managerRef.current = nextManager;
      refresh();
    },
    [refresh],
  );

  useEffect(() => {
    const adapter = new H5Adapter();
    const manager = new NodeTreeManager(adapter);
    const scrollManager = scrollManagerRef.current;
    adapterRef.current = adapter;
    managerRef.current = manager;

    initYoga().then(() => {
      const initOptions = initialOptionsRef.current;
      if (initOptions?.initialTreeJSON) {
        const imported = importFromJSON(initOptions.initialTreeJSON);
        manager.loadFromTree(imported);
      } else {
        manager.buildFromDescriptor(initOptions?.initialDescriptor ?? createDefaultDescriptor());
        manager.computeLayout();
      }
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

  const updateNodeName = useCallback(
    (nodeId: string, name: string) => {
      const manager = managerRef.current;
      if (!manager) return;
      manager.updateNodeName(nodeId, name);
      refresh();
    },
    [refresh],
  );

  const updateMotion = useCallback(
    (nodeId: string, motion: MotionSpec | undefined) => {
      const manager = managerRef.current;
      if (!manager) return;
      manager.updateMotion(nodeId, motion);
      refresh();
    },
    [refresh],
  );

  const updateEvents = useCallback(
    (nodeId: string, events: NodeEventBindings | undefined) => {
      const manager = managerRef.current;
      if (!manager) return;
      manager.updateEvents(nodeId, events);
      refresh();
    },
    [refresh],
  );

  const insertNodeDescriptors = useCallback(
    (parentId: string, descriptors: NodeDescriptor[], insertIndex?: number): string[] => {
      const manager = managerRef.current;
      if (!manager) return [];
      const result = manager.insertChildren(parentId, descriptors, insertIndex);
      refresh();
      return result.childIds;
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
    (
      node: CanvasNode,
      newParent: CanvasNode,
      allNodes: Record<string, CanvasNode>,
    ): FlexStyle => {
      const dir = newParent.flexStyle.flexDirection ?? "column";
      const isRow = dir === "row" || dir === "row-reverse";

      const siblings: CanvasNode[] = [];
      for (const childId of newParent.children) {
        if (childId === node.id) continue;
        const sibling = allNodes[childId];
        if (sibling) siblings.push(sibling);
      }

      const adapted: FlexStyle = { ...node.flexStyle };

      if (adapted.position === "absolute") {
        adapted.position = undefined;
        adapted.top = undefined;
        adapted.right = undefined;
        adapted.bottom = undefined;
        adapted.left = undefined;
      }

      if (siblings.length === 0) return adapted;

      const flexCount = siblings.filter(
        (sibling) => sibling.flexStyle.flex !== undefined,
      ).length;
      const growCount = siblings.filter(
        (sibling) => (sibling.flexStyle.flexGrow ?? 0) > 0,
      ).length;
      const usesFlex = flexCount >= Math.ceil(siblings.length / 2);
      const usesGrow = !usesFlex && growCount >= Math.ceil(siblings.length / 2);

      if (usesFlex) {
        const avgFlex =
          siblings.reduce(
            (sum, sibling) => sum + (sibling.flexStyle.flex ?? 0),
            0,
          ) / flexCount;
        adapted.flex = avgFlex > 0 ? Math.round(avgFlex) : 1;
        adapted.flexGrow = undefined;
        adapted.flexShrink = undefined;
        adapted.flexBasis = undefined;
        if (isRow) adapted.width = undefined;
        else adapted.height = undefined;
      } else if (usesGrow) {
        const avgGrow =
          siblings.reduce(
            (sum, sibling) => sum + (sibling.flexStyle.flexGrow ?? 0),
            0,
          ) / growCount;
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
        if (newParent.type === "text") return null;
        const oldParent = prev.nodes[node.parentId];
        if (!oldParent) return null;

        const isSameParent = node.parentId === newParentId;
        const oldChildren = oldParent.children.filter(
          (id: string) => id !== nodeId,
        );

        let newChildren: string[];
        if (isSameParent) {
          if (insertIndex === undefined) return null;
          newChildren = [...oldChildren];
          const clampedIndex = Math.min(insertIndex, newChildren.length);
          newChildren.splice(clampedIndex, 0, nodeId);
        } else {
          const targetChildren = [...newParent.children];
          if (insertIndex !== undefined) {
            targetChildren.splice(
              Math.min(insertIndex, targetChildren.length),
              0,
              nodeId,
            );
          } else {
            targetChildren.push(nodeId);
          }
          newChildren = targetChildren;
        }

        const updatedNodes = { ...prev.nodes };

        if (!isSameParent) {
          const adaptedStyle = adaptFlexStyleForParent(
            node,
            newParent,
            prev.nodes,
          );
          updatedNodes[nodeId] = {
            ...node,
            parentId: newParentId,
            flexStyle: adaptedStyle,
          };
        } else {
          updatedNodes[nodeId] = { ...node, parentId: newParentId };
        }

        updatedNodes[node.parentId] = { ...oldParent, children: oldChildren };
        if (!isSameParent) {
          updatedNodes[newParentId] = { ...newParent, children: newChildren };
        } else {
          updatedNodes[newParentId] = {
            ...updatedNodes[newParentId],
            children: newChildren,
          };
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
      if (!parent || parent.type === "text") return;
      const index = Object.keys(current.nodes).length;
      manager.addChild(parentId, createDescriptorByType(type, index));
      refresh();
    },
    [refresh],
  );

  const addChildNode = useCallback(
    (parentId: string) => addNodeByType(parentId, "view"),
    [addNodeByType],
  );

  const addContainerNode = useCallback(
    (parentId: string) => {
      const manager = managerRef.current;
      if (!manager) return;
      const current = manager.getTree();
      const parent = current.nodes[parentId];
      if (!parent || parent.type === "text") return;
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

  const moveAbsoluteNodeLive = useCallback(
    (nodeId: string, left: number, top: number) => {
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
                position: "absolute",
                left: Math.round(left),
                top: Math.round(top),
                right: undefined,
                bottom: undefined,
              },
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
              flexStyle: {
                ...root.flexStyle,
                width: config.width,
                height: config.height,
              },
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
    replaceDescriptor,
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
    moveAbsoluteNodeLive,
    commitLiveUpdate,
    updateImageProps,
    updateNodeName,
    updateMotion,
    updateEvents,
    insertNodeDescriptors,
    updateCanvasContainer,
  };
}
