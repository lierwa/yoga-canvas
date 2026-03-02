export type {
  FlexValue,
  FlexStyle,
  VisualStyle,
  TextProps,
  ImageProps,
  ScrollViewProps,
  ComputedLayout,
  NodeType,
  CanvasNode,
  NodeTree,
} from '@yoga-canvas/core';

export interface CanvasContainerConfig {
  name: string;
  width: number;
  height: number | 'auto';
}

export const DEVICE_PRESETS: CanvasContainerConfig[] = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932 },
  { name: 'Android Small', width: 360, height: 640 },
  { name: 'Android Medium', width: 412, height: 915 },
  { name: 'iPad Mini', width: 768, height: 1024 },
  { name: 'Custom', width: 375, height: 667 },
];

export interface DropIndicator {
  parentId: string;
  index: number;
  x: number;
  y: number;
  length: number;
  isHorizontal: boolean;
}

export interface SelectionState {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  dropTargetId: string | null;
  dropIndicator: DropIndicator | null;
}

export interface ResizeHandle {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  x: number;
  y: number;
}
