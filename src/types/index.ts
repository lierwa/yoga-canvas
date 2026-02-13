export type NodeType = 'box' | 'text' | 'image' | 'scrollview';

export type FlexValue = number | `${number}%` | 'auto';

export interface FlexStyle {
  width?: FlexValue;
  height?: FlexValue;
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  flexWrap?: 'nowrap' | 'wrap';
  flex?: number;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: FlexValue;
  gap?: FlexValue;
  rowGap?: FlexValue;
  columnGap?: FlexValue;
  paddingTop?: FlexValue;
  paddingRight?: FlexValue;
  paddingBottom?: FlexValue;
  paddingLeft?: FlexValue;
  marginTop?: FlexValue;
  marginRight?: FlexValue;
  marginBottom?: FlexValue;
  marginLeft?: FlexValue;
  overflow?: 'visible' | 'hidden' | 'scroll';
  positionType?: 'static' | 'relative' | 'absolute';
  positionTop?: FlexValue;
  positionRight?: FlexValue;
  positionBottom?: FlexValue;
  positionLeft?: FlexValue;
}

export interface VisualStyle {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  opacity: number;
  rotation: number;
}

export interface TextProps {
  content: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  color: string;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right';
}

export interface ImageProps {
  src: string;
  objectFit: 'cover' | 'contain' | 'fill';
}

export interface ScrollViewProps {
  scrollDirection: 'vertical' | 'horizontal';
}

export interface ComputedLayout {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CanvasNode {
  id: string;
  name: string;
  type: NodeType;
  flexStyle: FlexStyle;
  visualStyle: VisualStyle;
  textProps?: TextProps;
  imageProps?: ImageProps;
  scrollViewProps?: ScrollViewProps;
  children: string[];
  parentId: string | null;
  computedLayout: ComputedLayout;
}

export interface CanvasContainerConfig {
  name: string;
  width: number;
  height: number;
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

export interface NodeTree {
  rootId: string;
  nodes: Record<string, CanvasNode>;
}

export type InteractionMode = 'select' | 'pan';

export interface DropIndicator {
  parentId: string;
  index: number;
  // Visual position for drawing the insertion line
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
