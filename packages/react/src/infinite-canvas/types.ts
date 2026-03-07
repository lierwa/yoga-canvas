import type React from 'react';

export type Point = { x: number; y: number };

export type InfiniteCanvasView = {
  scale: number;
  offset: Point;
};

export type InfiniteCanvasViewport = {
  width: number;
  height: number;
  dpr: number;
};

export type InfiniteCanvasApi = {
  getCanvas: () => HTMLCanvasElement | null;
  getContainer: () => HTMLDivElement | null;
  getView: () => InfiniteCanvasView;
  setView: (nextView: InfiniteCanvasView, meta?: { source?: string }) => void;
  invalidate: () => void;
  getViewport: () => InfiniteCanvasViewport;
  screenToWorld: (p: Point) => Point;
  worldToScreen: (p: Point) => Point;
};

export type InfiniteCanvasMouseHandler = (
  e: React.MouseEvent<HTMLCanvasElement>,
  api: InfiniteCanvasApi,
) => boolean | void;

export type InfiniteCanvasWheelHandler = (e: WheelEvent, api: InfiniteCanvasApi) => boolean | void;

export type InfiniteCanvasContextMenuHandler = (
  e: React.MouseEvent<HTMLCanvasElement>,
  api: InfiniteCanvasApi,
) => boolean | void;

export type InfiniteCanvasPlugin = {
  onMouseDown?: InfiniteCanvasMouseHandler;
  onMouseMove?: InfiniteCanvasMouseHandler;
  onMouseUp?: InfiniteCanvasMouseHandler;
  onMouseLeave?: InfiniteCanvasMouseHandler;
  onDoubleClick?: InfiniteCanvasMouseHandler;
  onContextMenu?: InfiniteCanvasContextMenuHandler;
  onWheel?: InfiniteCanvasWheelHandler;
};
