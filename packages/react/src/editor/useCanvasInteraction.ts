import { useState, useCallback, useRef, useEffect } from 'react';
import type { NodeTree } from '@yoga-canvas/core';
import { hitTest, hitTestAll } from '@yoga-canvas/core';
import type { ScrollManager } from '@yoga-canvas/core';
import type { SelectionState, DropIndicator } from './types';
import { getResizeHandlePositions, getRotationHandlePosition } from './CanvasRenderer';

interface DragState {
  type: 'none' | 'pan' | 'resize' | 'rotate' | 'move' | 'absolute-move';
  startX: number;
  startY: number;
  startCanvasX: number;
  startCanvasY: number;
  resizeHandle: string | null;
  originalWidth: number;
  originalHeight: number;
  originalLeft: number;
  originalTop: number;
  originalRotation: number;
  nodeCenterX: number;
  nodeCenterY: number;
  scrollOffsetX: number;
  scrollOffsetY: number;
}

function isDescendant(tree: NodeTree, ancestorId: string, nodeId: string): boolean {
  let current = tree.nodes[nodeId];
  while (current) {
    if (current.id === ancestorId) return true;
    if (!current.parentId) return false;
    current = tree.nodes[current.parentId];
  }
  return false;
}

function findDropTarget(
  tree: NodeTree,
  x: number,
  y: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  excludeId: string
): string | null {
  const canvasX = (x - offsetX) / scale;
  const canvasY = (y - offsetY) / scale;
  return findDropTargetNode(tree, tree.rootId, canvasX, canvasY, excludeId);
}

function findDropTargetNode(
  tree: NodeTree,
  nodeId: string,
  x: number,
  y: number,
  excludeId: string
): string | null {
  if (nodeId === excludeId) return null;
  const node = tree.nodes[nodeId];
  if (!node) return null;
  const { left, top, width, height } = node.computedLayout;
  if (x < left || x > left + width || y < top || y > top + height) return null;
  for (let i = node.children.length - 1; i >= 0; i--) {
    const child = findDropTargetNode(tree, node.children[i], x, y, excludeId);
    if (child) return child;
  }
  if (node.type === 'text') return node.parentId;
  return nodeId;
}

function getAncestorScrollOffset(tree: NodeTree, nodeId: string, scrollManager: ScrollManager): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let current = tree.nodes[nodeId];
  while (current?.parentId) {
    const parent = tree.nodes[current.parentId];
    if (!parent) break;
    if (parent.type === 'scrollview') {
      const off = scrollManager.getOffset(parent.id);
      x += off.x;
      y += off.y;
    }
    current = parent;
  }
  return { x, y };
}

function hitTestRotationHandleWithScroll(
  node: NodeTree['nodes'][string],
  x: number,
  y: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  scrollOffset: { x: number; y: number }
): boolean {
  if (!node) return false;
  const canvasX = (x - offsetX) / scale + scrollOffset.x;
  const canvasY = (y - offsetY) / scale + scrollOffset.y;
  const pos = getRotationHandlePosition(node);
  const threshold = 6 / scale;
  return Math.hypot(canvasX - pos.x, canvasY - pos.y) <= threshold;
}

function hitTestResizeHandleWithScroll(
  node: NodeTree['nodes'][string],
  x: number,
  y: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  scrollOffset: { x: number; y: number }
): string | null {
  if (!node) return null;
  const canvasX = (x - offsetX) / scale + scrollOffset.x;
  const canvasY = (y - offsetY) / scale + scrollOffset.y;
  const handles = getResizeHandlePositions(node);
  const threshold = (8 / 2 + 2) / scale;
  for (const handle of handles) {
    if (Math.abs(canvasX - handle.x) <= threshold && Math.abs(canvasY - handle.y) <= threshold) {
      return handle.position;
    }
  }
  return null;
}

const INSERT_THRESHOLD = 14;

function tryInsertionInContainer(
  tree: NodeTree,
  containerId: string,
  cx: number,
  cy: number,
  excludeId: string
): DropIndicator | null {
  const container = tree.nodes[containerId];
  if (!container || container.type === 'text') return null;

  const siblings = container.children.filter((id: string) => id !== excludeId);
  if (siblings.length === 0) return null;

  const dir = container.flexStyle.flexDirection ?? 'column';
  const isRow = dir === 'row' || dir === 'row-reverse';

  for (let i = 0; i <= siblings.length; i++) {
    let gapPos: number;
    let lineX: number;
    let lineY: number;
    let lineLen: number;

    if (isRow) {
      if (i === 0) {
        const first = tree.nodes[siblings[0]];
        if (!first) continue;
        gapPos = first.computedLayout.left;
      } else if (i === siblings.length) {
        const last = tree.nodes[siblings[siblings.length - 1]];
        if (!last) continue;
        gapPos = last.computedLayout.left + last.computedLayout.width;
      } else {
        const prev = tree.nodes[siblings[i - 1]];
        const next = tree.nodes[siblings[i]];
        if (!prev || !next) continue;
        gapPos = (prev.computedLayout.left + prev.computedLayout.width + next.computedLayout.left) / 2;
      }
      if (Math.abs(cx - gapPos) < INSERT_THRESHOLD) {
        lineX = gapPos;
        lineY = container.computedLayout.top;
        lineLen = container.computedLayout.height;
        const realIndex = i === 0 ? 0 : container.children.indexOf(siblings[i - 1]) + 1;
        return { parentId: containerId, index: realIndex, x: lineX, y: lineY, length: lineLen, isHorizontal: false };
      }
    } else {
      if (i === 0) {
        const first = tree.nodes[siblings[0]];
        if (!first) continue;
        gapPos = first.computedLayout.top;
      } else if (i === siblings.length) {
        const last = tree.nodes[siblings[siblings.length - 1]];
        if (!last) continue;
        gapPos = last.computedLayout.top + last.computedLayout.height;
      } else {
        const prev = tree.nodes[siblings[i - 1]];
        const next = tree.nodes[siblings[i]];
        if (!prev || !next) continue;
        gapPos = (prev.computedLayout.top + prev.computedLayout.height + next.computedLayout.top) / 2;
      }
      if (Math.abs(cy - gapPos) < INSERT_THRESHOLD) {
        lineX = container.computedLayout.left;
        lineY = gapPos;
        lineLen = container.computedLayout.width;
        const realIndex = i === 0 ? 0 : container.children.indexOf(siblings[i - 1]) + 1;
        return { parentId: containerId, index: realIndex, x: lineX, y: lineY, length: lineLen, isHorizontal: true };
      }
    }
  }
  return null;
}

function findInsertionPoint(
  tree: NodeTree,
  screenX: number,
  screenY: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  excludeId: string
): DropIndicator | null {
  const cx = (screenX - offsetX) / scale;
  const cy = (screenY - offsetY) / scale;

  const deepestId = findDropTargetNode(tree, tree.rootId, cx, cy, excludeId);
  if (!deepestId) return null;

  let currentId: string | null = deepestId;
  while (currentId) {
    const result = tryInsertionInContainer(tree, currentId, cx, cy, excludeId);
    if (result) return result;
    currentId = tree.nodes[currentId]?.parentId ?? null;
  }
  return null;
}

export type CanvasInteractionOptions = {
  panOn?: 'empty' | 'root' | 'any';
  selectionEnabled?: boolean;
  transformEnabled?: boolean;
};

export function useCanvasInteraction(
  tree: NodeTree,
  onResize: (nodeId: string, width: number, height: number) => void,
  onRotate?: (nodeId: string, rotation: number) => void,
  onMove?: (nodeId: string, newParentId: string, insertIndex?: number) => void,
  onDragEnd?: () => void,
  scrollManager?: ScrollManager,
  onMoveAbsolute?: (nodeId: string, left: number, top: number) => void,
  options?: CanvasInteractionOptions
) {
  const panOn = options?.panOn ?? 'empty';
  const selectionEnabled = options?.selectionEnabled ?? true;
  const transformEnabled = options?.transformEnabled ?? true;

  const [selection, setSelection] = useState<SelectionState>({
    selectedNodeId: null,
    hoveredNodeId: null,
    dropTargetId: null,
    dropIndicator: null,
  });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scrollTick, setScrollTick] = useState(0);
  const animationRef = useRef<{ raf: number | null } | null>(null);
  const dragRef = useRef<DragState>({
    type: 'none',
    startX: 0,
    startY: 0,
    startCanvasX: 0,
    startCanvasY: 0,
    resizeHandle: null,
    originalWidth: 0,
    originalHeight: 0,
    originalLeft: 0,
    originalTop: 0,
    originalRotation: 0,
    nodeCenterX: 0,
    nodeCenterY: 0,
    scrollOffsetX: 0,
    scrollOffsetY: 0,
  });
  const lastOffsetRef = useRef({ x: 0, y: 0 });
  const scrollFadeTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const cancelViewAnimation = useCallback(() => {
    const anim = animationRef.current;
    if (anim?.raf != null) cancelAnimationFrame(anim.raf);
    animationRef.current = null;
  }, []);

  const animateViewTo = useCallback(
    (target: { scale: number; offset: { x: number; y: number } }, options?: { durationMs?: number }) => {
      cancelViewAnimation();

      const durationMs = options?.durationMs ?? 260;
      const fromScale = scale;
      const fromOffset = { ...offset };
      const toScale = target.scale;
      const toOffset = target.offset;
      const start = performance.now();

      const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

      const tick = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(1, elapsed / durationMs);
        const k = easeInOut(t);

        const nextScale = fromScale + (toScale - fromScale) * k;
        const nextOffset = {
          x: fromOffset.x + (toOffset.x - fromOffset.x) * k,
          y: fromOffset.y + (toOffset.y - fromOffset.y) * k,
        };
        setScale(nextScale);
        setOffset(nextOffset);

        if (t < 1) {
          const raf = requestAnimationFrame(tick);
          animationRef.current = { raf };
        } else {
          animationRef.current = null;
        }
      };

      const raf = requestAnimationFrame(tick);
      animationRef.current = { raf };
    },
    [cancelViewAnimation, offset, scale]
  );

  useEffect(() => {
    const timeouts = scrollFadeTimeoutsRef.current;
    return () => {
      for (const timeout of timeouts.values()) clearTimeout(timeout);
      timeouts.clear();
      cancelViewAnimation();
    };
  }, [cancelViewAnimation]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      cancelViewAnimation();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (transformEnabled && selectionEnabled && selection.selectedNodeId) {
        const selectedNode = tree.nodes[selection.selectedNodeId];
        if (selectedNode) {
          const scrollOffset = scrollManager
            ? getAncestorScrollOffset(tree, selection.selectedNodeId, scrollManager)
            : { x: 0, y: 0 };
          if (hitTestRotationHandleWithScroll(selectedNode, x, y, scale, offset.x, offset.y, scrollOffset)) {
            const { left, top, width, height } = selectedNode.computedLayout;
            dragRef.current = {
              type: 'rotate',
              startX: x,
              startY: y,
              startCanvasX: 0,
              startCanvasY: 0,
              resizeHandle: null,
              originalWidth: 0,
              originalHeight: 0,
              originalLeft: 0,
              originalTop: 0,
              originalRotation: selectedNode.visualStyle.rotate || 0,
              nodeCenterX: left + width / 2,
              nodeCenterY: top + height / 2,
              scrollOffsetX: 0,
              scrollOffsetY: 0,
            };
            return;
          }
          const handle = hitTestResizeHandleWithScroll(selectedNode, x, y, scale, offset.x, offset.y, scrollOffset);
          if (handle) {
            dragRef.current = {
              type: 'resize',
              startX: x,
              startY: y,
              startCanvasX: 0,
              startCanvasY: 0,
              resizeHandle: handle,
              originalWidth: selectedNode.computedLayout.width,
              originalHeight: selectedNode.computedLayout.height,
              originalLeft: 0,
              originalTop: 0,
              originalRotation: 0,
              nodeCenterX: 0,
              nodeCenterY: 0,
              scrollOffsetX: 0,
              scrollOffsetY: 0,
            };
            return;
          }
        }
      }

      const canvasX = (x - offset.x) / scale;
      const canvasY = (y - offset.y) / scale;
      const hitNodeId = hitTest(tree, canvasX, canvasY, scrollManager ? { scrollManager } : undefined);

      const shouldPan =
        panOn === 'any' ? true : panOn === 'root' ? !hitNodeId || hitNodeId === tree.rootId : !hitNodeId;

      if (shouldPan) {
        if (selectionEnabled) setSelection((prev) => ({ ...prev, selectedNodeId: null }));
        dragRef.current = {
          type: 'pan',
          startX: x,
          startY: y,
          startCanvasX: 0,
          startCanvasY: 0,
          resizeHandle: null,
          originalWidth: 0,
          originalHeight: 0,
          originalLeft: 0,
          originalTop: 0,
          originalRotation: 0,
          nodeCenterX: 0,
          nodeCenterY: 0,
          scrollOffsetX: 0,
          scrollOffsetY: 0,
        };
        lastOffsetRef.current = { ...offset };
        e.currentTarget.style.cursor = 'grabbing';
        return;
      }

      if (hitNodeId) {
        if (transformEnabled && selectionEnabled && hitNodeId === selection.selectedNodeId && hitNodeId !== tree.rootId) {
          const node = tree.nodes[hitNodeId];
          const isAbsolute = node?.flexStyle?.position === 'absolute';
          if (isAbsolute && onMoveAbsolute) {
            const scrollOffset = scrollManager ? getAncestorScrollOffset(tree, hitNodeId, scrollManager) : { x: 0, y: 0 };
            const startCanvasX = (x - offset.x) / scale + scrollOffset.x;
            const startCanvasY = (y - offset.y) / scale + scrollOffset.y;
            const parent = node?.parentId ? tree.nodes[node.parentId] : null;
            const derivedLeft = node && parent ? node.computedLayout.left - parent.computedLayout.left : node?.computedLayout.left ?? 0;
            const derivedTop = node && parent ? node.computedLayout.top - parent.computedLayout.top : node?.computedLayout.top ?? 0;
            const originalLeft = typeof node?.flexStyle?.left === 'number' ? node.flexStyle.left : derivedLeft;
            const originalTop = typeof node?.flexStyle?.top === 'number' ? node.flexStyle.top : derivedTop;

            dragRef.current = {
              type: 'absolute-move',
              startX: x,
              startY: y,
              startCanvasX,
              startCanvasY,
              resizeHandle: null,
              originalWidth: 0,
              originalHeight: 0,
              originalLeft,
              originalTop,
              originalRotation: 0,
              nodeCenterX: 0,
              nodeCenterY: 0,
              scrollOffsetX: scrollOffset.x,
              scrollOffsetY: scrollOffset.y,
            };
            e.currentTarget.style.cursor = 'move';
            return;
          }

          dragRef.current = {
            type: 'move',
            startX: x,
            startY: y,
            startCanvasX: 0,
            startCanvasY: 0,
            resizeHandle: null,
            originalWidth: 0,
            originalHeight: 0,
            originalLeft: 0,
            originalTop: 0,
            originalRotation: 0,
            nodeCenterX: 0,
            nodeCenterY: 0,
            scrollOffsetX: 0,
            scrollOffsetY: 0,
          };
          return;
        }
        if (selectionEnabled) setSelection((prev) => ({ ...prev, selectedNodeId: hitNodeId, dropTargetId: null }));
      } else {
        if (selectionEnabled) setSelection((prev) => ({ ...prev, selectedNodeId: null }));
      }
    },
    [
      cancelViewAnimation,
      tree,
      scale,
      offset,
      selection.selectedNodeId,
      scrollManager,
      onMoveAbsolute,
      panOn,
      selectionEnabled,
      transformEnabled,
    ]
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
        e.currentTarget.style.cursor = 'grabbing';
        return;
      }

      if (transformEnabled && dragRef.current.type === 'absolute-move' && selection.selectedNodeId && onMoveAbsolute) {
        const canvasX = (x - offset.x) / scale + dragRef.current.scrollOffsetX;
        const canvasY = (y - offset.y) / scale + dragRef.current.scrollOffsetY;
        const dx = canvasX - dragRef.current.startCanvasX;
        const dy = canvasY - dragRef.current.startCanvasY;
        onMoveAbsolute(selection.selectedNodeId, Math.round(dragRef.current.originalLeft + dx), Math.round(dragRef.current.originalTop + dy));
        e.currentTarget.style.cursor = 'move';
        return;
      }

      if (transformEnabled && dragRef.current.type === 'move' && selection.selectedNodeId) {
        const insertion = findInsertionPoint(tree, x, y, scale, offset.x, offset.y, selection.selectedNodeId);
        if (insertion && !isDescendant(tree, selection.selectedNodeId, insertion.parentId)) {
          setSelection((prev) => ({ ...prev, dropTargetId: null, dropIndicator: insertion }));
          e.currentTarget.style.cursor = 'copy';
          return;
        }
        const dropId = findDropTarget(tree, x, y, scale, offset.x, offset.y, selection.selectedNodeId);
        const validDrop =
          dropId &&
          dropId !== selection.selectedNodeId &&
          !isDescendant(tree, selection.selectedNodeId, dropId) &&
          dropId !== tree.nodes[selection.selectedNodeId]?.parentId;
        setSelection((prev) => {
          const newDropId = validDrop ? dropId : null;
          return { ...prev, dropTargetId: newDropId, dropIndicator: null };
        });
        e.currentTarget.style.cursor = validDrop ? 'copy' : 'move';
        return;
      }

      if (transformEnabled && dragRef.current.type === 'rotate' && selection.selectedNodeId && onRotate) {
        const canvasX = (x - offset.x) / scale;
        const canvasY = (y - offset.y) / scale;
        const { nodeCenterX, nodeCenterY, originalRotation } = dragRef.current;
        const startAngle = Math.atan2(
          (dragRef.current.startY - offset.y) / scale - nodeCenterY,
          (dragRef.current.startX - offset.x) / scale - nodeCenterX
        );
        const currentAngle = Math.atan2(canvasY - nodeCenterY, canvasX - nodeCenterX);
        const delta = ((currentAngle - startAngle) * 180) / Math.PI;
        const newRotation = Math.round(originalRotation + delta);
        onRotate(selection.selectedNodeId, newRotation);
        return;
      }

      if (transformEnabled && dragRef.current.type === 'resize' && selection.selectedNodeId) {
        const dx = (x - dragRef.current.startX) / scale;
        const dy = (y - dragRef.current.startY) / scale;
        const handle = dragRef.current.resizeHandle;

        let newWidth = dragRef.current.originalWidth;
        let newHeight = dragRef.current.originalHeight;

        if (handle === 'mid-left') newWidth -= dx;
        else if (handle === 'mid-right') newWidth += dx;
        else if (handle === 'mid-top') newHeight -= dy;
        else if (handle === 'mid-bottom') newHeight += dy;
        else {
          if (handle?.includes('right')) newWidth += dx;
          if (handle?.includes('left')) newWidth -= dx;
          if (handle?.includes('bottom')) newHeight += dy;
          if (handle?.includes('top')) newHeight -= dy;
        }

        onResize(selection.selectedNodeId, newWidth, newHeight);
        return;
      }

      if (selectionEnabled) {
        const canvasX = (x - offset.x) / scale;
        const canvasY = (y - offset.y) / scale;
        const hitNodeId = hitTest(tree, canvasX, canvasY, scrollManager ? { scrollManager } : undefined);
        setSelection((prev) => {
          if (prev.hoveredNodeId !== hitNodeId) {
            return { ...prev, hoveredNodeId: hitNodeId };
          }
          return prev;
        });

        if (transformEnabled && selection.selectedNodeId) {
          const selectedNode = tree.nodes[selection.selectedNodeId];
          if (selectedNode) {
            const scrollOffset = scrollManager
              ? getAncestorScrollOffset(tree, selection.selectedNodeId, scrollManager)
              : { x: 0, y: 0 };
            const handle = hitTestResizeHandleWithScroll(selectedNode, x, y, scale, offset.x, offset.y, scrollOffset);
            if (hitTestRotationHandleWithScroll(selectedNode, x, y, scale, offset.x, offset.y, scrollOffset)) {
              e.currentTarget.style.cursor = 'grab';
              return;
            }
            if (handle) {
              if (handle === 'top-left' || handle === 'bottom-right') {
                e.currentTarget.style.cursor = 'nwse-resize';
              } else if (handle === 'top-right' || handle === 'bottom-left') {
                e.currentTarget.style.cursor = 'nesw-resize';
              } else if (handle === 'mid-top' || handle === 'mid-bottom') {
                e.currentTarget.style.cursor = 'ns-resize';
              } else if (handle === 'mid-left' || handle === 'mid-right') {
                e.currentTarget.style.cursor = 'ew-resize';
              }
              return;
            }

            const hitNodeId = selection.hoveredNodeId;
            if (selectedNode.flexStyle.position === 'absolute' && hitNodeId === selection.selectedNodeId) {
              e.currentTarget.style.cursor = 'move';
              return;
            }
          }
        }

        e.currentTarget.style.cursor = selection.hoveredNodeId ? 'pointer' : 'grab';
        return;
      }

      e.currentTarget.style.cursor = 'grab';
    },
    [
      tree,
      scale,
      offset,
      selection.selectedNodeId,
      selection.hoveredNodeId,
      onResize,
      onRotate,
      scrollManager,
      onMoveAbsolute,
      selectionEnabled,
      transformEnabled,
    ]
  );

  const handleMouseUp = useCallback(() => {
    const dragType = dragRef.current.type;

    if (transformEnabled && dragType === 'move' && selection.selectedNodeId && onMove) {
      if (selection.dropIndicator) {
        onMove(selection.selectedNodeId, selection.dropIndicator.parentId, selection.dropIndicator.index);
      } else if (selection.dropTargetId) {
        onMove(selection.selectedNodeId, selection.dropTargetId);
      }
    }

    if (transformEnabled && (dragType === 'resize' || dragType === 'rotate') && onDragEnd) {
      onDragEnd();
    }

    if (transformEnabled && dragType === 'absolute-move' && onDragEnd) {
      onDragEnd();
    }

    if (selectionEnabled) {
      setSelection((prev) => {
        if (prev.dropTargetId || prev.dropIndicator) {
          return { ...prev, dropTargetId: null, dropIndicator: null };
        }
        return prev;
      });
    }
    dragRef.current = {
      type: 'none',
      startX: 0,
      startY: 0,
      startCanvasX: 0,
      startCanvasY: 0,
      resizeHandle: null,
      originalWidth: 0,
      originalHeight: 0,
      originalLeft: 0,
      originalTop: 0,
      originalRotation: 0,
      nodeCenterX: 0,
      nodeCenterY: 0,
      scrollOffsetX: 0,
      scrollOffsetY: 0,
    };
  }, [selection.selectedNodeId, selection.dropTargetId, selection.dropIndicator, onMove, onDragEnd, selectionEnabled, transformEnabled]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      cancelViewAnimation();
      const target = e.target as HTMLCanvasElement;
      const rect = target.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const canvasX = (mouseX - offset.x) / scale;
      const canvasY = (mouseY - offset.y) / scale;

      if (scrollManager) {
        const hitPath = hitTestAll(tree, canvasX, canvasY, { scrollManager });
        let scrollViewId: string | null = null;
        for (let i = hitPath.length - 1; i >= 0; i--) {
          const id = hitPath[i];
          if (tree.nodes[id]?.type === 'scrollview') {
            scrollViewId = id;
            break;
          }
        }

        if (scrollViewId) {
          const sv = tree.nodes[scrollViewId];
          const dir = sv?.scrollViewProps?.scrollDirection ?? 'vertical';
          const state = scrollManager.getState(scrollViewId);
          const canScroll =
            dir === 'horizontal'
              ? state.contentWidth > state.viewportWidth
              : state.contentHeight > state.viewportHeight;

          if (canScroll) {
            e.preventDefault();
            scrollManager.showScrollBar(scrollViewId);
            const dx = dir === 'horizontal' ? (e.deltaX || e.deltaY) : 0;
            const dy = dir === 'horizontal' ? 0 : (e.deltaY || e.deltaX);
            scrollManager.scroll(scrollViewId, dx, dy);

            const existing = scrollFadeTimeoutsRef.current.get(scrollViewId);
            if (existing) clearTimeout(existing);
            const timeout = setTimeout(() => {
              scrollManager.setScrollBarOpacity(scrollViewId, 0);
              setScrollTick((t) => t + 1);
            }, 800);
            scrollFadeTimeoutsRef.current.set(scrollViewId, timeout);

            setScrollTick((t) => t + 1);
            return;
          }
        }
      }

      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(Math.max(scale * zoomFactor, 0.1), 5);

      const newOffsetX = mouseX - (mouseX - offset.x) * (newScale / scale);
      const newOffsetY = mouseY - (mouseY - offset.y) * (newScale / scale);

      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
    },
    [cancelViewAnimation, scale, offset, tree, scrollManager]
  );

  const selectNode = useCallback(
    (nodeId: string | null) => {
      if (!selectionEnabled) return;
      setSelection((prev) => ({ ...prev, selectedNodeId: nodeId }));
    },
    [selectionEnabled]
  );

  const setScaleAt = useCallback(
    (nextScale: number, screenX: number, screenY: number) => {
      const canvasX = (screenX - offset.x) / scale;
      const canvasY = (screenY - offset.y) / scale;

      const newOffsetX = screenX - canvasX * nextScale;
      const newOffsetY = screenY - canvasY * nextScale;
      setScale(nextScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
    },
    [offset, scale]
  );

  const resetView = useCallback(
    (
      viewportWidth: number,
      viewportHeight: number,
      options?: { scale?: number; targetId?: string; animate?: boolean; durationMs?: number }
    ): { scale: number; offset: { x: number; y: number } } => {
      const nextScale = options?.scale ?? 1;
      const targetId = options?.targetId ?? tree.rootId;
      const node = tree.nodes[targetId];
      const centerX = node ? node.computedLayout.left + node.computedLayout.width / 2 : 0;
      const centerY = node ? node.computedLayout.top + node.computedLayout.height / 2 : 0;
      const nextOffset = {
        x: viewportWidth / 2 - centerX * nextScale,
        y: viewportHeight / 2 - centerY * nextScale,
      };
      if (options?.animate) animateViewTo({ scale: nextScale, offset: nextOffset }, { durationMs: options.durationMs });
      else {
        setScale(nextScale);
        setOffset(nextOffset);
      }
      return { scale: nextScale, offset: nextOffset };
    },
    [animateViewTo, tree]
  );

  const focusNode = useCallback(
    (nodeId: string, canvasWidth: number, canvasHeight: number, options?: { animate?: boolean; durationMs?: number }) => {
      const node = tree.nodes[nodeId];
      if (!node) return;
      const { left, top, width, height } = node.computedLayout;

      const padding = 60;
      const scaleX = (canvasWidth - padding * 2) / width;
      const scaleY = (canvasHeight - padding * 2) / height;
      const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.1), 5);

      const centerX = left + width / 2;
      const centerY = top + height / 2;
      const newOffsetX = canvasWidth / 2 - centerX * newScale;
      const newOffsetY = canvasHeight / 2 - centerY * newScale;

      if (options?.animate) animateViewTo({ scale: newScale, offset: { x: newOffsetX, y: newOffsetY } }, { durationMs: options.durationMs });
      else {
        setScale(newScale);
        setOffset({ x: newOffsetX, y: newOffsetY });
      }
    },
    [animateViewTo, tree.nodes]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!selectionEnabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const canvasX = (x - offset.x) / scale;
      const canvasY = (y - offset.y) / scale;
      const allHit = hitTestAll(tree, canvasX, canvasY, scrollManager ? { scrollManager } : undefined);
      if (allHit.length === 0) return;

      if (selection.selectedNodeId) {
        const idx = allHit.indexOf(selection.selectedNodeId);
        if (idx > 0) {
          setSelection((prev) => ({ ...prev, selectedNodeId: allHit[idx - 1] }));
          return;
        }
      }
      setSelection((prev) => ({ ...prev, selectedNodeId: allHit[allHit.length - 1] }));
    },
    [tree, selection.selectedNodeId, scale, offset, scrollManager, selectionEnabled]
  );

  return {
    selection,
    scale,
    offset,
    scrollTick,
    selectNode,
    focusNode,
    setScaleAt,
    resetView,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleDoubleClick,
  };
}
