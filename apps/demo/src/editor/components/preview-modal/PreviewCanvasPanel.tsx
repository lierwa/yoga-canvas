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
  scrollManager: ScrollManager | null;
  eventSource: YogaCanvas | null;
}) {
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const lastReportedScaleRef = useRef<number | null>(null);

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
        className="relative rounded-xl shadow-2xl overflow-hidden border border-gray-300 bg-white"
        style={{ width: frameWidth, height: frameHeight, borderRadius: 4 }}
        onClick={onCanvasClick}
      >
        <div
          className="relative"
          style={{ width: rootWidth, height: rootHeight, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          <canvas ref={canvasRef} style={{ background: '#ffffff', borderRadius: 20 }} className="block" />
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
