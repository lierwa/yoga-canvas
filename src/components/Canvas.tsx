import { useRef, useEffect, useState, useCallback } from 'react';
import { Crosshair } from 'lucide-react';
import { renderCanvas, setRenderCallback } from '../core/CanvasRenderer';
import type { NodeTree, SelectionState } from '../types';
import type { ScrollManager } from '@yoga-canvas/core';

interface CanvasProps {
  tree: NodeTree;
  selection: SelectionState;
  scale: number;
  offset: { x: number; y: number };
  scrollManager: ScrollManager;
  renderTick?: number;
  showGrid?: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: () => void;
  onWheel: (e: WheelEvent) => void;
  onDoubleClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onFocusNode?: () => void;
}

export default function Canvas({
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
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoadTick, setImageLoadTick] = useState(0);

  // Register callback so image cache loads trigger canvas re-render
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
      {onFocusNode && selection.selectedNodeId && (
        <button
          onClick={onFocusNode}
          className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5
            bg-white/90 backdrop-blur border border-gray-200 rounded-lg shadow-sm
            text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300
            transition-colors"
          title="Focus selected node"
        >
          <Crosshair size={14} />
          <span>Locate</span>
        </button>
      )}
    </div>
  );
}
