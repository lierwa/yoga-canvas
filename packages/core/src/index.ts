// === Core Entry Point ===
export { createYagaCanvas, YagaCanvas } from './YagaCanvas';
export type { YagaCanvasOptions } from './YagaCanvas';

// === Component DSL ===
export { View, Text, Image, ScrollView } from './nodes';
export type { ViewProps, TextNodeProps, ImageNodeProps } from './nodes';
export type { ScrollViewProps as ScrollViewNodeProps } from './nodes';

// === Types ===
export type {
  FlexValue,
  FlexStyle,
  VisualStyle,
  TextStyle,
  StyleProps,
  NodeType,
  TextProps,
  ImageProps,
  ScrollBarVisibility,
  ScrollViewProps,
  ComputedLayout,
  CanvasNode,
  NodeTree,
  NodeDescriptor,
  CanvasImageLike,
  CanvasContextLike,
  TextMeasureOptions,
  PlatformAdapter,
} from './types';
export { expandShorthand, splitStyle } from './types';

// === Layout Engine ===
export { initYoga, isYogaReady, computeScrollContentSizes } from './layout';

// === Renderer ===
export { renderTree } from './renderer';
export type { RendererOptions } from './renderer';

// === Platform Adapters ===
export { H5Adapter } from './platform/H5Adapter';
export { WxAdapter } from './platform/WxAdapter';

// === Tree Manager ===
export { NodeTreeManager } from './tree';
export { History } from './tree';

// === Scroll ===
export { ScrollManager } from './scroll';
export type { ScrollState } from './scroll';

// === Events ===
export { EventEmitter, hitTest, hitTestAll } from './events';
export type { EventHandler, HitTestOptions } from './events';

// === Export Utilities ===
export {
  exportToJSON,
  importFromJSON,
  exportToDataURL,
  exportToTempFilePath,
  exportToDOMString,
} from './export';
export type { SerializedNode } from './export';
