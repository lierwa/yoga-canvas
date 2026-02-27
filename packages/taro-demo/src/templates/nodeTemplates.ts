import type { NodeDescriptor, StyleProps } from "@yoga-canvas/core";
import { createElement, type ReactNode } from "react";
import {
  View as YogaView,
  Text as YogaText,
  Image as YogaImage,
  ScrollView as YogaScrollView,
} from "@yoga-canvas/react";

type TemplateOptions = {
  width: number;
  height: number;
};

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

type Rgb = { r: number; g: number; b: number };

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

export function createNodeTemplateDescriptor({
  width,
  height,
}: TemplateOptions): NodeDescriptor {
  return {
    type: "view",
    name: "Root",
    style: {
      width,
      height,
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
                style: {
                  fontSize: 20,
                  fontWeight: "bold",
                  color: PALETTE.violet500,
                },
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
                    style: {
                      ...TEXT_STYLES.badgeBase,
                      color: PALETTE.amber900,
                    },
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
                style: {
                  fontSize: 20,
                  fontWeight: "bold",
                  color: PALETTE.cyan500,
                },
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
                style: {
                  fontSize: 20,
                  fontWeight: "bold",
                  color: PALETTE.green500,
                },
              },
              {
                type: "text",
                name: "FPSLabel",
                content: "FPS",
                style: { ...TEXT_STYLES.label },
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
                style: { flexBasis: "50%", gap: SPACE.sm },
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
                style: { flexBasis: "25%", gap: SPACE.sm },
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
              {
                type: "view",
                name: "ContainCard",
                style: { flexBasis: "25%", gap: SPACE.sm },
                children: [
                  {
                    type: "image",
                    name: "ContainImage",
                    src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=400&auto=format&fit=crop",
                    objectFit: "fill",
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
          featureRowDescriptor(
            "View",
            "Flex container with all CSS props",
            PALETTE.indigo500,
            withAlpha(PALETTE.indigo500, 0.04),
          ),
          featureRowDescriptor(
            "Text",
            "Auto word-wrapping text node",
            PALETTE.amber500,
            withAlpha(PALETTE.amber500, 0.04),
          ),
          featureRowDescriptor(
            "Image",
            "Cover / Contain / Fill modes",
            PALETTE.pink500,
            withAlpha(PALETTE.pink500, 0.04),
          ),
          featureRowDescriptor(
            "ScrollView",
            "Real scrolling with wheel events!",
            PALETTE.teal500,
            withAlpha(PALETTE.teal500, 0.04),
          ),
          featureRowDescriptor(
            "Export",
            "JSON / DataURL / DOM string",
            PALETTE.violet500,
            withAlpha(PALETTE.violet500, 0.04),
          ),
          featureRowDescriptor(
            "Hit Test",
            "Click to select nodes",
            PALETTE.red500,
            withAlpha(PALETTE.red500, 0.04),
          ),
          featureRowDescriptor(
            "JSX API",
            "Write layouts as React components",
            PALETTE.green500,
            withAlpha(PALETTE.green500, 0.04),
          ),
        ],
      },
    ],
  };
}

type NodeTemplateJSX = {
  rootName?: string;
  rootStyle?: StyleProps;
  children: ReactNode;
};

export function createNodeTemplateJSX(
  options: TemplateOptions,
): NodeTemplateJSX {
  const root = createNodeTemplateDescriptor(options);
  return {
    rootName: root.name,
    rootStyle: root.style,
    children: renderDescriptorChildren(root.children ?? []),
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

function renderDescriptorChildren(children: NodeDescriptor[]): ReactNode {
  return children.map((child, index) =>
    renderDescriptorNode(child, `node-${index}`),
  );
}

function renderDescriptorNode(node: NodeDescriptor, key: string): ReactNode {
  const commonProps = {
    key,
    name: node.name,
    style: node.style,
  };
  if (node.type === "text") {
    return createElement(YogaText, commonProps, node.content ?? "");
  }
  if (node.type === "image") {
    return createElement(YogaImage, {
      ...commonProps,
      src: node.src ?? "",
      objectFit: node.objectFit ?? "cover",
    });
  }
  if (node.type === "scrollview") {
    const children = renderDescriptorChildren(node.children ?? []);
    return createElement(
      YogaScrollView,
      {
        ...commonProps,
        scrollDirection: node.scrollDirection ?? "vertical",
        scrollBarVisibility: node.scrollBarVisibility ?? "auto",
      },
      children,
    );
  }
  const children = renderDescriptorChildren(node.children ?? []);
  return createElement(YogaView, commonProps, children);
}
