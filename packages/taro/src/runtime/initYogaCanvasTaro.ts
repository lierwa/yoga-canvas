import { WxAdapter, createYogaCanvas, type NodeDescriptor, type YogaCanvas, type YogaCanvasOptions } from '@yoga-canvas/core';

export type MiniCanvasNode = {
  width?: number;
  height?: number;
  getContext?: (type: '2d') => unknown;
};

function getPixelRatio(): number {
  const g = globalThis as unknown as {
    wx?: {
      getWindowInfo?: () => { pixelRatio?: number };
      getSystemInfoSync?: () => { pixelRatio?: number };
    };
    devicePixelRatio?: number;
  };
  const pr1 = g.wx?.getWindowInfo?.()?.pixelRatio;
  if (typeof pr1 === 'number' && Number.isFinite(pr1) && pr1 > 0) return pr1;
  const pr2 = g.wx?.getSystemInfoSync?.()?.pixelRatio;
  if (typeof pr2 === 'number' && Number.isFinite(pr2) && pr2 > 0) return pr2;
  const pr3 = g.devicePixelRatio;
  if (typeof pr3 === 'number' && Number.isFinite(pr3) && pr3 > 0) return pr3;
  return 2;
}

function resolveLayoutSize(
  layout: NodeDescriptor,
  node: MiniCanvasNode,
  pixelRatio: number,
): { width: number; height?: number; minHeight?: number } {
  const style = (layout as unknown as { style?: { width?: unknown; height?: unknown; minHeight?: unknown } }).style;
  const styleWidth = style?.width;
  const styleHeight = style?.height;
  const styleMinHeight = style?.minHeight;

  const widthFromStyle = typeof styleWidth === 'number' && Number.isFinite(styleWidth) ? styleWidth : undefined;
  const heightFromStyle = typeof styleHeight === 'number' && Number.isFinite(styleHeight) ? styleHeight : undefined;
  const minHeightFromStyle = typeof styleMinHeight === 'number' && Number.isFinite(styleMinHeight) ? styleMinHeight : undefined;

  const widthFromNode = typeof node.width === 'number' && Number.isFinite(node.width) && node.width > 0 ? node.width / pixelRatio : undefined;
  const heightFromNode = typeof node.height === 'number' && Number.isFinite(node.height) && node.height > 0 ? node.height / pixelRatio : undefined;

  const width = widthFromStyle ?? widthFromNode;
  const height = heightFromStyle ?? heightFromNode;

  if (!width || width <= 0) {
    throw new Error('无法推断画布宽度：请设置 layout.style.width（number）或传入 options.width');
  }

  return { width, height, minHeight: minHeightFromStyle };
}

export type InitYogaCanvasTaroResult = {
  instance: YogaCanvas;
  adapter: WxAdapter;
  canvas: MiniCanvasNode;
  pixelRatio: number;
  width: number;
  height: number;
};

export async function initYogaCanvasTaro(
  canvasNode: MiniCanvasNode,
  layout: NodeDescriptor,
  options?: Omit<YogaCanvasOptions, 'adapter' | 'width' | 'height' | 'pixelRatio'> & {
    width?: number;
    height?: number;
    pixelRatio?: number;
  },
): Promise<InitYogaCanvasTaroResult> {
  const pixelRatio = typeof options?.pixelRatio === 'number' && options.pixelRatio > 0 ? options.pixelRatio : getPixelRatio();
  const size = resolveLayoutSize(layout, canvasNode, pixelRatio);
  const width = typeof options?.width === 'number' && options.width > 0 ? options.width : size.width;
  const height = typeof options?.height === 'number' && options.height > 0 ? options.height : size.height;
  const initialHeight = typeof height === 'number' && height > 0
    ? height
    : (typeof size.minHeight === 'number' && size.minHeight > 0 ? size.minHeight : 1);

  if (typeof canvasNode.getContext === 'function') {
    try {
      canvasNode.getContext('2d');
    } catch {
      throw new Error('Canvas 2D 不可用：请确保 <Canvas type="2d" /> 且基础库支持 Canvas 2D');
    }
  }

  canvasNode.width = width * pixelRatio;
  canvasNode.height = initialHeight * pixelRatio;

  const adapter = new WxAdapter();
  const instance = createYogaCanvas(canvasNode, layout, {
    ...(options ?? {}),
    adapter,
    width,
    height,
    pixelRatio,
  } as YogaCanvasOptions);

  await instance.init();
  const rootHeight = instance.getRootNode()?.computedLayout.height;
  const finalHeight = typeof rootHeight === 'number' && Number.isFinite(rootHeight) && rootHeight > 0 ? rootHeight : initialHeight;
  if (Math.abs(finalHeight - initialHeight) > 1e-6) {
    canvasNode.height = finalHeight * pixelRatio;
  }
  instance.render();

  return { instance, adapter, canvas: canvasNode, pixelRatio, width, height: finalHeight };
}
