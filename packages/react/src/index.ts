// React bindings — YagaCanvas component (supports both layout prop and JSX children)
export { YagaCanvasComponent as YagaCanvas } from './YagaCanvasComponent';
export type { YagaCanvasProps, YagaCanvasRef } from './YagaCanvasComponent';
export { useYagaCanvas } from './useYagaCanvas';
export type { UseYagaCanvasOptions, UseYagaCanvasReturn } from './useYagaCanvas';

// JSX marker components — primary React API
export { View, Text, Image, ScrollView } from './components';
export type {
  ViewJSXProps,
  TextJSXProps,
  ImageJSXProps,
  ScrollViewJSXProps,
} from './components';
export { SelectionOverlay, NodeTreePanel } from './components';

// JSX converter utility
export { convertChildrenToDescriptors } from './jsx/convertJSX';

// Core DSL functions — re-exported with `create` prefix for programmatic use
export {
  View as createView,
  Text as createText,
  Image as createImage,
  ScrollView as createScrollView,
  createYagaCanvas,
  YagaCanvas as YagaCanvasCore,
  initYoga,
  H5Adapter,
  hitTest,
  hitTestAll,
} from '@yaga-canvas/core';

// Core types
export type {
  NodeDescriptor,
  NodeTree,
  CanvasNode,
  StyleProps,
  FlexStyle,
  VisualStyle,
  TextStyle,
  YagaCanvasOptions,
  HitTestOptions,
  ScrollState,
} from '@yaga-canvas/core';

export { ScrollManager } from '@yaga-canvas/core';
