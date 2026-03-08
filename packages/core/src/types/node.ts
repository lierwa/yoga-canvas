import type { FlexStyle, VisualStyle, StyleProps } from './style';

/**
 * Supported node types.
 */
export type NodeType = 'view' | 'text' | 'image' | 'scrollview';

/**
 * Text-specific properties on a node.
 */
export interface TextProps {
  content: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
  fontStyle: 'normal' | 'italic' | 'oblique';
  fontFamily: string;
  color: string;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right';
  whiteSpace: 'normal' | 'nowrap';
  lineClamp?: number;
  textShadow: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
  } | null;
}

/**
 * Image-specific properties on a node.
 */
export interface ImageProps {
  src: string;
  objectFit: 'cover' | 'contain' | 'fill';
}

/**
 * ScrollView-specific properties on a node.
 */
export type ScrollBarVisibility = 'always' | 'auto' | 'hidden';

export interface ScrollViewProps {
  scrollDirection: 'vertical' | 'horizontal';
  scrollBarVisibility: ScrollBarVisibility;
}

/**
 * Computed layout output from the layout engine.
 */
export interface ComputedLayout {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * A node in the canvas tree — the internal representation after the DSL
 * descriptor is resolved.
 */
export interface CanvasNode {
  id: string;
  name: string;
  type: NodeType;
  flexStyle: FlexStyle;
  visualStyle: Required<VisualStyle>;
  textProps?: TextProps;
  imageProps?: ImageProps;
  scrollViewProps?: ScrollViewProps;
  motion?: MotionSpec;
  events?: NodeEventBindings;
  children: string[];
  parentId: string | null;
  computedLayout: ComputedLayout;
}

/**
 * Flat node tree: a root id + a record of all nodes keyed by id.
 */
export interface NodeTree {
  rootId: string;
  nodes: Record<string, CanvasNode>;
}

export type MotionEasing =
  | 'linear'
  | 'quadIn'
  | 'quadOut'
  | 'quadInOut'
  | 'cubicIn'
  | 'cubicOut'
  | 'cubicInOut'
  | 'sinIn'
  | 'sinOut'
  | 'sinInOut';

export interface MotionTransition {
  duration?: number;
  delay?: number;
  easing?: MotionEasing;
  repeat?: number;
  yoyo?: boolean;
  autoStart?: boolean;
  autoClear?: boolean;
  restoreOnFinish?: boolean;
}

export interface MotionSpec {
  initial?: {
    visualStyle?: Partial<VisualStyle>;
    textProps?: Partial<TextProps>;
    imageProps?: Partial<ImageProps>;
  };
  animate?: {
    visualStyle?: Partial<VisualStyle>;
    textProps?: Partial<TextProps>;
    imageProps?: Partial<ImageProps>;
  };
  transition?: MotionTransition;
}

export type NodeActionTargetRef = { id?: string; name?: string };

export type NodeAnimateOptions = {
  duration?: number;
  delay?: number;
  easing?: MotionEasing;
  repeat?: number;
  yoyo?: boolean;
  autoClear?: boolean;
  restoreOnFinish?: boolean;
};

export type NodeAction =
  | {
      type: 'animate';
      target: NodeActionTargetRef;
      patch: {
        visualStyle?: Partial<VisualStyle>;
        textProps?: Partial<TextProps>;
        imageProps?: Partial<ImageProps>;
      };
      options?: NodeAnimateOptions;
    }
  | {
      type: 'playMotion';
      target: NodeActionTargetRef;
      options?: NodeAnimateOptions;
    }
  | {
      type: 'emit';
      event: string;
      payload?: unknown;
    };

export type NodeEventType =
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointercancel'
  | 'click'
  | 'wheel';

export type NodeEventBindings = Partial<Record<NodeEventType, NodeAction[]>>;

/**
 * Descriptor returned by the component DSL functions (View, Text, Image, etc.).
 * This is the user-facing declarative description before it is compiled into CanvasNode.
 */
export interface NodeDescriptor {
  type: NodeType;
  id?: string;
  name?: string;
  style: StyleProps;
  children?: NodeDescriptor[];
  motion?: MotionSpec;
  events?: NodeEventBindings;
  onClick?: (e: unknown) => void;
  // Type-specific props
  content?: string;          // Text
  src?: string;              // Image
  objectFit?: 'cover' | 'contain' | 'fill';  // Image
  scrollDirection?: 'vertical' | 'horizontal'; // ScrollView
  scrollBarVisibility?: ScrollBarVisibility; // ScrollView
}
