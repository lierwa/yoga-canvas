import { useState, useCallback, useRef } from 'react';
import type { SelectionState, NodeTree } from '../types';
import { hitTest, hitTestResizeHandle } from '../core/CanvasRenderer';

interface DragState {
  type: 'none' | 'pan' | 'resize';
  startX: number;
  startY: number;
  resizeHandle: string | null;
  originalWidth: number;
  originalHeight: number;
}

export function useCanvasInteraction(
  tree: NodeTree,
  onResize: (nodeId: string, width: number, height: number) => void
) {
  const [selection, setSelection] = useState<SelectionState>({
    selectedNodeId: null,
    hoveredNodeId: null,
  });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 100, y: 100 });
  const dragRef = useRef<DragState>({
    type: 'none',
    startX: 0,
    startY: 0,
    resizeHandle: null,
    originalWidth: 0,
    originalHeight: 0,
  });
  const lastOffsetRef = useRef({ x: 100, y: 100 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check resize handle first
      if (selection.selectedNodeId) {
        const selectedNode = tree.nodes[selection.selectedNodeId];
        if (selectedNode) {
          const handle = hitTestResizeHandle(selectedNode, x, y, scale, offset.x, offset.y);
          if (handle) {
            dragRef.current = {
              type: 'resize',
              startX: x,
              startY: y,
              resizeHandle: handle,
              originalWidth: selectedNode.computedLayout.width,
              originalHeight: selectedNode.computedLayout.height,
            };
            return;
          }
        }
      }

      // Hit test for node selection
      const hitNodeId = hitTest(tree, x, y, scale, offset.x, offset.y);
      if (hitNodeId) {
        setSelection((prev) => ({ ...prev, selectedNodeId: hitNodeId }));
      } else {
        setSelection((prev) => ({ ...prev, selectedNodeId: null }));
        // Start panning
        dragRef.current = {
          type: 'pan',
          startX: x,
          startY: y,
          resizeHandle: null,
          originalWidth: 0,
          originalHeight: 0,
        };
        lastOffsetRef.current = { ...offset };
      }
    },
    [tree, scale, offset, selection.selectedNodeId]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (dragRef.current.type === 'pan') {
        const dx = x - dragRef.current.startX;
        const dy = y - dragRef.current.startY;
        setOffset({
          x: lastOffsetRef.current.x + dx,
          y: lastOffsetRef.current.y + dy,
        });
        return;
      }

      if (dragRef.current.type === 'resize' && selection.selectedNodeId) {
        const dx = (x - dragRef.current.startX) / scale;
        const dy = (y - dragRef.current.startY) / scale;
        const handle = dragRef.current.resizeHandle;

        let newWidth = dragRef.current.originalWidth;
        let newHeight = dragRef.current.originalHeight;

        if (handle?.includes('right')) newWidth += dx;
        if (handle?.includes('left')) newWidth -= dx;
        if (handle?.includes('bottom')) newHeight += dy;
        if (handle?.includes('top')) newHeight -= dy;

        onResize(selection.selectedNodeId, newWidth, newHeight);
        return;
      }

      // Hover detection
      const hitNodeId = hitTest(tree, x, y, scale, offset.x, offset.y);
      setSelection((prev) => {
        if (prev.hoveredNodeId !== hitNodeId) {
          return { ...prev, hoveredNodeId: hitNodeId };
        }
        return prev;
      });

      // Update cursor
      if (selection.selectedNodeId) {
        const selectedNode = tree.nodes[selection.selectedNodeId];
        if (selectedNode) {
          const handle = hitTestResizeHandle(selectedNode, x, y, scale, offset.x, offset.y);
          if (handle) {
            if (handle === 'top-left' || handle === 'bottom-right') {
              e.currentTarget.style.cursor = 'nwse-resize';
            } else {
              e.currentTarget.style.cursor = 'nesw-resize';
            }
            return;
          }
        }
      }
      e.currentTarget.style.cursor = hitNodeId ? 'pointer' : 'grab';
    },
    [tree, scale, offset, selection.selectedNodeId, onResize]
  );

  const handleMouseUp = useCallback(() => {
    dragRef.current = {
      type: 'none',
      startX: 0,
      startY: 0,
      resizeHandle: null,
      originalWidth: 0,
      originalHeight: 0,
    };
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(Math.max(scale * zoomFactor, 0.1), 5);

      const newOffsetX = mouseX - (mouseX - offset.x) * (newScale / scale);
      const newOffsetY = mouseY - (mouseY - offset.y) * (newScale / scale);

      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
    },
    [scale, offset]
  );

  const selectNode = useCallback((nodeId: string | null) => {
    setSelection((prev) => ({ ...prev, selectedNodeId: nodeId }));
  }, []);

  return {
    selection,
    scale,
    offset,
    selectNode,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
  };
}
