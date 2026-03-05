import { useRef, useEffect, useState, useCallback } from 'react';
import type { NodeTree } from '@yoga-canvas/core';
import type { ScrollManager } from '@yoga-canvas/core';
import type { SelectionState } from './types';
import { renderCanvas, setRenderCallback } from './CanvasRenderer';

interface EditorCanvasProps {
  tree: NodeTree;
  selection: SelectionState;
  scale: number;
  offset: { x: number; y: number };
  scrollManager: ScrollManager | null;
  renderTick?: number;
  showGrid?: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: () => void;
  onWheel: (e: WheelEvent) => void;
  onDoubleClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onFocusNode?: () => void;
  renderFocusAction?: (onFocusNode: () => void) => React.ReactNode;
}

export function EditorCanvas({
  tree,
  selection,
  scale,
  offset,
  scrollManager,
  renderTick,
  showGrid,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
  onDoubleClick,
  onFocusNode,
  renderFocusAction,
}: EditorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoadTick, setImageLoadTick] = useState(0);

  useEffect(() => {
    const unsubscribe = setRenderCallback(() => setImageLoadTick((t) => t + 1));
    return unsubscribe;
  }, []);

  const draw = useCallback(() => {
    void imageLoadTick;
    void renderTick;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    renderCanvas(ctx, tree, selection, rect.width, rect.height, scale, offset.x, offset.y, {
      showGrid,
      scrollManager,
    });
  }, [tree, selection, scale, offset, imageLoadTick, renderTick, showGrid, scrollManager]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeObserver = new ResizeObserver(() => draw());
    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => onWheel(e);
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, [onWheel]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ background: '#f8fafc' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onDoubleClick={onDoubleClick}
      />
      {renderFocusAction && onFocusNode ? renderFocusAction(onFocusNode) : null}
    </div>
  );
}
