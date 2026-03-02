import type { RefObject, MouseEvent as ReactMouseEvent } from 'react';
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
  previewTree: NodeTree;
  selectedNodeId: string | null;
  scrollManager: ScrollManager | null;
  eventSource: YogaCanvas | null;
}) {
  return (
    <div ref={canvasScrollRef} className="flex-1 flex items-center justify-center bg-gray-100 overflow-auto">
      <div
        ref={canvasFrameRef}
        className="relative rounded-xl shadow-2xl overflow-hidden border border-gray-300 bg-white"
        style={{ width: rootWidth, height: rootHeight, borderRadius: 4 }}
        onClick={onCanvasClick}
      >
        <div className="relative" style={{ width: rootWidth, height: rootHeight }}>
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
