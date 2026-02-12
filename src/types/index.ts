export interface FlexStyle {
  width?: number;
  height?: number;
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  flexWrap?: 'nowrap' | 'wrap';
  flex?: number;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | 'auto';
  gap?: number;
  rowGap?: number;
  columnGap?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
}

export interface VisualStyle {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  opacity: number;
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
  flexStyle: FlexStyle;
  visualStyle: VisualStyle;
  children: string[];
  parentId: string | null;
  computedLayout: ComputedLayout;
}

export interface NodeTree {
  rootId: string;
  nodes: Record<string, CanvasNode>;
}

export type InteractionMode = 'select' | 'pan';

export interface SelectionState {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
}

export interface ResizeHandle {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  x: number;
  y: number;
}
