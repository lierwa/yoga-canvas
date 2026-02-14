/**
 * Flex value: number (px), percentage string, or 'auto'.
 */
export type FlexValue = number | `${number}%` | 'auto';

/**
 * Flex layout style properties (maps to yoga-layout).
 */
export interface FlexStyle {
  width?: FlexValue;
  height?: FlexValue;
  minWidth?: FlexValue;
  minHeight?: FlexValue;
  maxWidth?: FlexValue;
  maxHeight?: FlexValue;

  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  alignSelf?: 'auto' | 'flex-start' | 'center' | 'flex-end' | 'stretch';
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
  padding?: FlexValue;

  marginTop?: FlexValue;
  marginRight?: FlexValue;
  marginBottom?: FlexValue;
  marginLeft?: FlexValue;
  margin?: FlexValue;

  overflow?: 'visible' | 'hidden' | 'scroll';

  positionType?: 'static' | 'relative' | 'absolute';
  positionTop?: FlexValue;
  positionRight?: FlexValue;
  positionBottom?: FlexValue;
  positionLeft?: FlexValue;
}

/**
 * Visual style properties (applied on canvas draw, not layout).
 */
export interface VisualStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  rotation?: number;
}

/**
 * Text-specific style properties.
 */
export interface TextStyle {
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontFamily?: string;
  color?: string;
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right';
}

/**
 * Unified style props — combines flex, visual, and text styles.
 * Used by the component DSL for a CSS-like developer experience.
 */
export type StyleProps = FlexStyle & VisualStyle & TextStyle;

/**
 * Expand shorthand properties (padding, margin) into individual edges.
 */
export function expandShorthand(style: StyleProps): StyleProps {
  const result = { ...style };

  if (result.padding !== undefined) {
    if (result.paddingTop === undefined) result.paddingTop = result.padding;
    if (result.paddingRight === undefined) result.paddingRight = result.padding;
    if (result.paddingBottom === undefined) result.paddingBottom = result.padding;
    if (result.paddingLeft === undefined) result.paddingLeft = result.padding;
    delete result.padding;
  }

  if (result.margin !== undefined) {
    if (result.marginTop === undefined) result.marginTop = result.margin;
    if (result.marginRight === undefined) result.marginRight = result.margin;
    if (result.marginBottom === undefined) result.marginBottom = result.margin;
    if (result.marginLeft === undefined) result.marginLeft = result.margin;
    delete result.margin;
  }

  return result;
}

/**
 * Split unified StyleProps into FlexStyle, VisualStyle, and TextStyle.
 */
export function splitStyle(style: StyleProps): {
  flexStyle: FlexStyle;
  visualStyle: VisualStyle;
  textStyle: TextStyle;
} {
  const expanded = expandShorthand(style);

  const flexStyle: FlexStyle = {};
  const visualStyle: VisualStyle = {};
  const textStyle: TextStyle = {};

  const flexKeys: (keyof FlexStyle)[] = [
    'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
    'flexDirection', 'justifyContent', 'alignItems', 'alignSelf', 'flexWrap',
    'flex', 'flexGrow', 'flexShrink', 'flexBasis',
    'gap', 'rowGap', 'columnGap',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'overflow', 'positionType', 'positionTop', 'positionRight', 'positionBottom', 'positionLeft',
  ];

  const visualKeys: (keyof VisualStyle)[] = [
    'backgroundColor', 'borderColor', 'borderWidth', 'borderRadius', 'opacity', 'rotation',
  ];

  const textKeys: (keyof TextStyle)[] = [
    'fontSize', 'fontWeight', 'fontFamily', 'color', 'lineHeight', 'textAlign',
  ];

  const src = expanded as Record<string, unknown>;
  const flex = flexStyle as Record<string, unknown>;
  const visual = visualStyle as Record<string, unknown>;
  const text = textStyle as Record<string, unknown>;

  for (const key of flexKeys) {
    if (src[key] !== undefined) {
      flex[key] = src[key];
    }
  }
  for (const key of visualKeys) {
    if (src[key] !== undefined) {
      visual[key] = src[key];
    }
  }
  for (const key of textKeys) {
    if (src[key] !== undefined) {
      text[key] = src[key];
    }
  }

  return { flexStyle, visualStyle, textStyle };
}
