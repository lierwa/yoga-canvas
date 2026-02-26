// React bindings — YogaCanvas component (supports both layout prop and JSX children)
export { YogaCanvasComponent as YogaCanvas } from './YogaCanvasComponent';
export type { YogaCanvasProps, YogaCanvasRef } from './YogaCanvasComponent';
export { useYogaCanvas } from './useYogaCanvas';
export type { UseYogaCanvasOptions, UseYogaCanvasReturn } from './useYogaCanvas';

// JSX marker components — primary React API
export { View, Text, Image, ScrollView } from './components';
export type {
  ViewJSXProps,
  TextJSXProps,
  ImageJSXProps,
  ScrollViewJSXProps,
} from './components';
export { SelectionOverlay, NodeTreePanel, ResizablePanels } from './components';
export { EditorCanvas } from './editor/EditorCanvas';
export { useCanvasInteraction } from './editor/useCanvasInteraction';
export type { SelectionState, DropIndicator } from './editor/types';

// JSX converter utility
export { convertChildrenToDescriptors } from './jsx/convertJSX';

// Core DSL functions — re-exported with `create` prefix for programmatic use
export {
  View as createView,
  Text as createText,
  Image as createImage,
  ScrollView as createScrollView,
  createYogaCanvas,
  YogaCanvas as YogaCanvasCore,
  initYoga,
  H5Adapter,
  hitTest,
  hitTestAll,
} from '@yoga-canvas/core';

// Core types
export type {
  NodeDescriptor,
  NodeTree,
  CanvasNode,
  StyleProps,
  FlexStyle,
  VisualStyle,
  TextStyle,
  YogaCanvasOptions,
  HitTestOptions,
  ScrollState,
} from '@yoga-canvas/core';

export { ScrollManager } from '@yoga-canvas/core';
