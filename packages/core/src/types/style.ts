/**
 * Flex value: number (px), percentage string, or 'auto'.
 */
export type FlexValue = number | `${number}%` | 'auto';

export interface ShadowStyle {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
}

export interface BoxShadowStyle extends ShadowStyle {
  spread?: number;
}

export interface LinearGradientStop {
  offset: number;
  color: string;
}

export interface LinearGradientStyle {
  start: { x: number; y: number };
  end: { x: number; y: number };
  colors: LinearGradientStop[];
}

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

  overflow?: 'visible' | 'hidden';

  position?: 'static' | 'relative' | 'absolute';
  top?: FlexValue;
  right?: FlexValue;
  bottom?: FlexValue;
  left?: FlexValue;
}

/**
 * Visual style properties (applied on canvas draw, not layout).
 */
export interface VisualStyle {
  backgroundColor?: string;
  linearGradient?: LinearGradientStyle | null;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  rotate?: number;
  boxShadow?: BoxShadowStyle | null;
  zIndex?: number;
}

/**
 * Text-specific style properties.
 */
export interface TextStyle {
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  fontFamily?: string;
  color?: string;
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right';
  whiteSpace?: 'normal' | 'nowrap';
  textShadow?: ShadowStyle | null;
}

export interface CSSStyleProps {
  'min-width'?: FlexValue;
  'min-height'?: FlexValue;
  'max-width'?: FlexValue;
  'max-height'?: FlexValue;

  'flex-direction'?: FlexStyle['flexDirection'];
  'justify-content'?: FlexStyle['justifyContent'];
  'align-items'?: FlexStyle['alignItems'];
  'align-self'?: FlexStyle['alignSelf'];
  'flex-wrap'?: FlexStyle['flexWrap'];

  'flex-grow'?: number;
  'flex-shrink'?: number;
  'flex-basis'?: FlexValue;

  'row-gap'?: FlexValue;
  'column-gap'?: FlexValue;

  'padding-top'?: FlexValue;
  'padding-right'?: FlexValue;
  'padding-bottom'?: FlexValue;
  'padding-left'?: FlexValue;

  'margin-top'?: FlexValue;
  'margin-right'?: FlexValue;
  'margin-bottom'?: FlexValue;
  'margin-left'?: FlexValue;

  'background-color'?: string;
  'border-color'?: string;
  'border-width'?: number;
  'border-radius'?: number;

  'font-size'?: number;
  'font-weight'?: TextStyle['fontWeight'];
  'font-style'?: TextStyle['fontStyle'];
  'font-family'?: string;
  'line-height'?: number;
  'text-align'?: TextStyle['textAlign'];
  'white-space'?: TextStyle['whiteSpace'];
  'z-index'?: number;
}

export interface LegacyStyleProps {
  positionType?: FlexStyle['position'];
  positionTop?: FlexValue;
  positionRight?: FlexValue;
  positionBottom?: FlexValue;
  positionLeft?: FlexValue;
  rotation?: number;
}

/**
 * Unified style props — combines flex, visual, and text styles.
 * Used by the component DSL for a CSS-like developer experience.
 */
export type StyleProps = FlexStyle & VisualStyle & TextStyle & CSSStyleProps & LegacyStyleProps;

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
  const normalized = normalizeStyleProps(style);
  const expanded = expandShorthand(normalized);

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
    'overflow', 'position', 'top', 'right', 'bottom', 'left',
  ];

  const visualKeys: (keyof VisualStyle)[] = [
    'backgroundColor', 'linearGradient', 'borderColor', 'borderWidth', 'borderRadius', 'opacity', 'rotate', 'boxShadow', 'zIndex',
  ];

  const textKeys: (keyof TextStyle)[] = [
    'fontSize', 'fontWeight', 'fontStyle', 'fontFamily', 'color', 'lineHeight', 'textAlign', 'whiteSpace', 'textShadow',
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

function normalizeStyleProps(style: StyleProps): StyleProps {
  const s = style as Record<string, unknown>;
  const next: Record<string, unknown> = { ...s };

  const kebabToCamel: Array<[from: string, to: string]> = [
    ['min-width', 'minWidth'],
    ['min-height', 'minHeight'],
    ['max-width', 'maxWidth'],
    ['max-height', 'maxHeight'],
    ['flex-direction', 'flexDirection'],
    ['justify-content', 'justifyContent'],
    ['align-items', 'alignItems'],
    ['align-self', 'alignSelf'],
    ['flex-wrap', 'flexWrap'],
    ['flex-grow', 'flexGrow'],
    ['flex-shrink', 'flexShrink'],
    ['flex-basis', 'flexBasis'],
    ['row-gap', 'rowGap'],
    ['column-gap', 'columnGap'],
    ['padding-top', 'paddingTop'],
    ['padding-right', 'paddingRight'],
    ['padding-bottom', 'paddingBottom'],
    ['padding-left', 'paddingLeft'],
    ['margin-top', 'marginTop'],
    ['margin-right', 'marginRight'],
    ['margin-bottom', 'marginBottom'],
    ['margin-left', 'marginLeft'],
    ['background-color', 'backgroundColor'],
    ['border-color', 'borderColor'],
    ['border-width', 'borderWidth'],
    ['border-radius', 'borderRadius'],
    ['font-size', 'fontSize'],
    ['font-weight', 'fontWeight'],
    ['font-style', 'fontStyle'],
    ['font-family', 'fontFamily'],
    ['line-height', 'lineHeight'],
    ['text-align', 'textAlign'],
    ['white-space', 'whiteSpace'],
    ['z-index', 'zIndex'],
  ];
  for (const [from, to] of kebabToCamel) {
    if (next[to] === undefined && next[from] !== undefined) {
      next[to] = next[from];
    }
    delete next[from];
  }

  if (next.position === undefined && next.positionType !== undefined) {
    next.position = next.positionType;
  }
  if (next.top === undefined && next.positionTop !== undefined) {
    next.top = next.positionTop;
  }
  if (next.right === undefined && next.positionRight !== undefined) {
    next.right = next.positionRight;
  }
  if (next.bottom === undefined && next.positionBottom !== undefined) {
    next.bottom = next.positionBottom;
  }
  if (next.left === undefined && next.positionLeft !== undefined) {
    next.left = next.positionLeft;
  }
  if (next.rotate === undefined && next.rotation !== undefined) {
    next.rotate = next.rotation;
  }

  delete next.positionType;
  delete next.positionTop;
  delete next.positionRight;
  delete next.positionBottom;
  delete next.positionLeft;
  delete next.rotation;

  return next as StyleProps;
}
