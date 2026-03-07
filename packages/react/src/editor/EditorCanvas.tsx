import { useEffect, useMemo, useState } from 'react';
import { hitTestAll } from '@yoga-canvas/core';
import type { NodeTree, ScrollManager } from '@yoga-canvas/core';
import { InfiniteCanvas } from '../infinite-canvas';
import type { InfiniteCanvasPlugin } from '../infinite-canvas';
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
  onMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onWheel: (e: WheelEvent) => void;
  onDoubleClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onFocusNode?: () => void;
  onSelectNode?: (nodeId: string | null) => void;
  renderTopOverlay?: (onFocusNode?: () => void) => React.ReactNode;
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
  onSelectNode,
  renderTopOverlay,
}: EditorCanvasProps) {
  const [imageLoadTick, setImageLoadTick] = useState(0);
  const [contextMenu, setContextMenu] = useState<null | { x: number; y: number; ids: string[] }>(null);

  useEffect(() => {
    const unsubscribe = setRenderCallback(() => setImageLoadTick((t) => t + 1));
    return unsubscribe;
  }, []);

  const plugins = useMemo<InfiniteCanvasPlugin[]>(
    () => [
      {
        onMouseDown: (e) => {
          if (contextMenu) setContextMenu(null);
          onMouseDown(e);
        },
        onMouseMove: (e) => onMouseMove(e),
        onMouseUp: (e) => onMouseUp(e),
        onMouseLeave: (e) => onMouseUp(e),
        onDoubleClick: onDoubleClick ? (e) => onDoubleClick(e) : undefined,
        onWheel: (e) => {
          if (contextMenu) setContextMenu(null);
          onWheel(e);
        },
        onContextMenu: (e) => {
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const worldX = (x - offset.x) / scale;
          const worldY = (y - offset.y) / scale;
          const hits = hitTestAll(tree, worldX, worldY, scrollManager ? { scrollManager } : undefined);
          const ordered = hits
            .map((id, index) => ({ id, index }))
            .filter((item) => item.id !== tree.rootId)
            .sort((a, b) => b.index - a.index)
            .map((item) => item.id);
          setContextMenu({ x, y, ids: ordered });
          return true;
        },
      },
    ],
    [contextMenu, offset.x, offset.y, onDoubleClick, onMouseDown, onMouseMove, onMouseUp, onWheel, scale, scrollManager, tree],
  );

  return (
    <InfiniteCanvas
      className="relative w-full h-full"
      canvasClassName="w-full h-full block"
      canvasStyle={{ background: '#f8fafc' }}
      view={{ scale, offset }}
      plugins={plugins}
      renderKey={`${imageLoadTick}-${renderTick ?? 0}`}
      render={({ ctx, viewport }) => {
        renderCanvas(ctx, tree, selection, viewport.width, viewport.height, scale, offset.x, offset.y, {
          showGrid,
          scrollManager,
        });
      }}
      renderOverlay={() => (
        <div className="absolute inset-0 pointer-events-none">
          {renderTopOverlay?.(onFocusNode)}
          {contextMenu ? (
            <div
              className="pointer-events-auto absolute min-w-56 max-w-[320px] bg-white/95 backdrop-blur border border-slate-200 rounded-lg shadow-lg py-1 text-xs text-slate-700"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              {contextMenu.ids.length ? (
                contextMenu.ids.map((id) => {
                  const node = tree.nodes[id];
                  const name = node?.name || id;
                  const type = node?.type || 'unknown';
                  const selected = selection.selectedNodeId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`w-full text-left px-2.5 py-1.5 hover:bg-slate-100 ${selected ? 'bg-slate-100' : ''}`}
                      onClick={() => {
                        onSelectNode?.(id);
                        setContextMenu(null);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{name}</span>
                        <span className="shrink-0 text-[11px] text-slate-400">{type}</span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-2.5 py-1.5 text-slate-400">空白</div>
              )}
              <div className="my-1 h-px bg-slate-200" />
              <button
                type="button"
                className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100"
                onClick={() => {
                  onSelectNode?.(null);
                  setContextMenu(null);
                }}
              >
                取消选择
              </button>
            </div>
          ) : null}
        </div>
      )}
    />
  );
}
