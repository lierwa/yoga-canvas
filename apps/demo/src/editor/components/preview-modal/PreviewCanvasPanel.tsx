import { useEffect, useMemo, useRef, useState, type RefObject, type MouseEvent as ReactMouseEvent } from 'react';
import { SelectionOverlay } from '@yoga-canvas/react';
import type { ScrollManager, YogaCanvas } from '@yoga-canvas/core';
import type { NodeTree } from '../../types';

export function PreviewCanvasPanel({
  rootWidth,
  rootHeight,
  canvasScrollRef,
  canvasFrameRef,
  canvasRef,
  onCanvasClick,
  onScaleChange,
  previewTree,
  selectedNodeId,
  pickMode,
  scrollManager,
  eventSource,
}: {
  rootWidth: number;
  rootHeight: number;
  canvasScrollRef: RefObject<HTMLDivElement>;
  canvasFrameRef: RefObject<HTMLDivElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  onCanvasClick: (e: ReactMouseEvent<HTMLDivElement>) => void;
  onScaleChange: (scale: number) => void;
  previewTree: NodeTree;
  selectedNodeId: string | null;
  pickMode: boolean;
  scrollManager: ScrollManager | null;
  eventSource: YogaCanvas | null;
}) {
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const lastReportedScaleRef = useRef<number | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const lastHoverIdRef = useRef<string | null>(null);
  const [cursor, setCursor] = useState<'default' | 'pointer'>('default');

  useEffect(() => {
    if (pickMode) return;
    lastHoverIdRef.current = null;
    setHoveredNodeId(null);
  }, [pickMode]);

  useEffect(() => {
    const el = canvasScrollRef.current;
    if (!el) return;

    const update = () => {
      setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [canvasScrollRef]);

  const scale = useMemo(() => {
    const pad = 32;
    const availW = Math.max(0, containerSize.width - pad);
    const availH = Math.max(0, containerSize.height - pad);
    if (!availW || !availH) return 1;
    if (rootWidth <= 0 || rootHeight <= 0) return 1;
    const s = Math.min(1, availW / rootWidth, availH / rootHeight);
    return Number.isFinite(s) && s > 0 ? s : 1;
  }, [containerSize.height, containerSize.width, rootHeight, rootWidth]);

  useEffect(() => {
    const prev = lastReportedScaleRef.current;
    if (prev != null && Math.abs(prev - scale) < 0.0005) return;
    lastReportedScaleRef.current = scale;
    onScaleChange(scale);
  }, [onScaleChange, scale]);

  const frameWidth = rootWidth * scale;
  const frameHeight = rootHeight * scale;

  return (
    <div ref={canvasScrollRef} className="h-full w-full flex items-center justify-center bg-gray-100 overflow-hidden">
      <div
        ref={canvasFrameRef}
        className="relative rounded shadow-2xl overflow-hidden border border-gray-300 bg-white"
        style={{ width: frameWidth, height: frameHeight, cursor }}
        onClick={onCanvasClick}
        onMouseLeave={() => {
          lastHoverIdRef.current = null;
          setHoveredNodeId(null);
          setCursor('default');
        }}
        onMouseMove={(e) => {
          const inst = eventSource;
          const canvasEl = canvasRef.current;
          if (!inst || !canvasEl) return;
          const rect = canvasEl.getBoundingClientRect();
          const x = (e.clientX - rect.left) / scale;
          const y = (e.clientY - rect.top) / scale;
          const hit = inst.dispatchPointerEvent({ type: 'pointermove', x, y, timeStamp: e.timeStamp });

          const nextHitId =
            hit.targetId && hit.targetId !== previewTree.rootId && previewTree.nodes[hit.targetId] ? hit.targetId : null;
          const isPointer = !!(nextHitId && previewTree.nodes[nextHitId]?.events?.click?.length);
          setCursor((prev) => (prev === (isPointer ? 'pointer' : 'default') ? prev : isPointer ? 'pointer' : 'default'));

          if (!pickMode) return;
          const next =
            nextHitId;
          if (next === lastHoverIdRef.current) return;
          lastHoverIdRef.current = next;
          setHoveredNodeId(next);
        }}
      >
        <div
          className="relative"
          style={{ width: rootWidth, height: rootHeight, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          <canvas ref={canvasRef} style={{ background: '#ffffff' }} className="block" />
          {pickMode && hoveredNodeId && hoveredNodeId !== selectedNodeId && (
            <SelectionOverlay
              tree={previewTree}
              nodeId={hoveredNodeId}
              scrollManager={scrollManager}
              eventSource={eventSource}
              showLabel={false}
              className="opacity-60"
            />
          )}
          {selectedNodeId && (
            <SelectionOverlay
              tree={previewTree}
              nodeId={selectedNodeId}
              scrollManager={scrollManager}
              eventSource={eventSource}
            />
          )}
        </div>
      </div>
    </div>
  );
}
