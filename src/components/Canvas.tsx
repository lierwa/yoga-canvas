import { useRef, useEffect } from 'react';
import { renderCanvas } from '../core/CanvasRenderer';
import type { NodeTree, SelectionState } from '../types';

interface CanvasProps {
  tree: NodeTree;
  selection: SelectionState;
  scale: number;
  offset: { x: number; y: number };
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: () => void;
  onWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
}

export default function Canvas({
  tree,
  selection,
  scale,
  offset,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      renderCanvas(ctx, tree, selection, rect.width, rect.height, scale, offset.x, offset.y);
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [tree, selection, scale, offset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    renderCanvas(ctx, tree, selection, rect.width, rect.height, scale, offset.x, offset.y);
  }, [tree, selection, scale, offset]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ background: '#f8fafc' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
    />
  );
}
