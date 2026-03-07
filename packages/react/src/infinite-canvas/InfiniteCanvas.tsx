import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import type { InfiniteCanvasApi, InfiniteCanvasPlugin, InfiniteCanvasView, InfiniteCanvasViewport, Point } from './types';

export type InfiniteCanvasProps = {
  className?: string;
  style?: React.CSSProperties;
  canvasClassName?: string;
  canvasStyle?: React.CSSProperties;
  background?: string;
  view: InfiniteCanvasView;
  onViewChange?: (nextView: InfiniteCanvasView, meta?: { source?: string }) => void;
  render: (args: { ctx: CanvasRenderingContext2D; view: InfiniteCanvasView; viewport: InfiniteCanvasViewport; api: InfiniteCanvasApi }) => void;
  renderOverlay?: (args: { view: InfiniteCanvasView; viewport: InfiniteCanvasViewport; api: InfiniteCanvasApi }) => React.ReactNode;
  plugins?: InfiniteCanvasPlugin[];
  renderKey?: number | string;
};

export function InfiniteCanvas({
  className,
  style,
  canvasClassName,
  canvasStyle,
  background,
  view,
  onViewChange,
  render,
  renderOverlay,
  plugins,
  renderKey,
}: InfiniteCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderRef = useRef(render);
  renderRef.current = render;

  const pluginsRef = useRef<InfiniteCanvasPlugin[]>(plugins ?? []);
  pluginsRef.current = plugins ?? [];

  const viewRef = useRef(view);
  viewRef.current = view;

  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;

  const [viewport, setViewport] = useState<InfiniteCanvasViewport>(() => ({
    width: 0,
    height: 0,
    dpr: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
  }));

  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  const rafIdRef = useRef<number | null>(null);

  const setView = useCallback((nextView: InfiniteCanvasView, meta?: { source?: string }) => {
    onViewChangeRef.current?.(nextView, meta);
  }, []);

  const getViewport = useCallback((): InfiniteCanvasViewport => viewportRef.current, []);
  const getView = useCallback((): InfiniteCanvasView => viewRef.current, []);
  const getCanvas = useCallback(() => canvasRef.current, []);
  const getContainer = useCallback(() => containerRef.current, []);

  const screenToWorld = useCallback((p: Point): Point => {
    const v = viewRef.current;
    return {
      x: (p.x - v.offset.x) / v.scale,
      y: (p.y - v.offset.y) / v.scale,
    };
  }, []);

  const worldToScreen = useCallback((p: Point): Point => {
    const v = viewRef.current;
    return {
      x: p.x * v.scale + v.offset.x,
      y: p.y * v.scale + v.offset.y,
    };
  }, []);

  const api = useMemo<InfiniteCanvasApi>(
    () => ({
      getCanvas,
      getContainer,
      getView,
      setView,
      invalidate: () => {},
      getViewport,
      screenToWorld,
      worldToScreen,
    }),
    [getCanvas, getContainer, getView, getViewport, screenToWorld, setView, worldToScreen],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = window.devicePixelRatio || 1;
    if (viewportRef.current.dpr !== dpr) {
      setViewport((prev) => ({ ...prev, dpr }));
    }

    const nextWidth = rect.width * dpr;
    const nextHeight = rect.height * dpr;
    if (canvas.width !== nextWidth) canvas.width = nextWidth;
    if (canvas.height !== nextHeight) canvas.height = nextHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const nextViewport: InfiniteCanvasViewport = { width: rect.width, height: rect.height, dpr };
    renderRef.current({ ctx, view: viewRef.current, viewport: nextViewport, api });
  }, [api]);

  const invalidate = useCallback(() => {
    if (rafIdRef.current != null) return;
    rafIdRef.current = window.requestAnimationFrame(() => {
      rafIdRef.current = null;
      draw();
    });
  }, [draw]);

  const apiRef = useRef<InfiniteCanvasApi>(api);
  apiRef.current = api;
  apiRef.current.invalidate = invalidate;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setViewport((prev) => {
        if (prev.width === rect.width && prev.height === rect.height) return prev;
        return { ...prev, width: rect.width, height: rect.height };
      });
      invalidate();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [invalidate]);

  useEffect(() => {
    invalidate();
  }, [invalidate, view.scale, view.offset.x, view.offset.y, renderKey, render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => {
      const list = pluginsRef.current;
      for (const p of list) {
        const handled = p.onWheel?.(e, apiRef.current);
        if (handled || e.defaultPrevented) return;
      }
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, []);

  const dispatchMouse = useCallback(
    (
      type: 'onMouseDown' | 'onMouseMove' | 'onMouseUp' | 'onMouseLeave' | 'onDoubleClick' | 'onContextMenu',
      e: React.MouseEvent<HTMLCanvasElement>,
    ) => {
      const list = pluginsRef.current;
      for (const p of list) {
        const fn = p[type];
        const handled = fn?.(e, apiRef.current as InfiniteCanvasApi);
        if (handled || e.defaultPrevented) return;
      }
    },
    [],
  );

  return (
    <div ref={containerRef} className={className} style={style}>
      <canvas
        ref={canvasRef}
        className={canvasClassName}
        style={{ background, ...canvasStyle }}
        onMouseDown={(e) => dispatchMouse('onMouseDown', e)}
        onMouseMove={(e) => dispatchMouse('onMouseMove', e)}
        onMouseUp={(e) => dispatchMouse('onMouseUp', e)}
        onMouseLeave={(e) => dispatchMouse('onMouseLeave', e)}
        onDoubleClick={(e) => dispatchMouse('onDoubleClick', e)}
        onContextMenu={(e) => dispatchMouse('onContextMenu', e)}
      />
      {renderOverlay?.({ view, viewport, api })}
    </div>
  );
}
