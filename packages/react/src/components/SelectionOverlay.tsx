import { useEffect, useState } from 'react';
import type { CanvasNode, NodeTree } from '@yaga-canvas/core';
import type { ScrollManager } from '@yaga-canvas/core';

export function SelectionOverlay({
  tree,
  nodeId,
  scrollManager,
  eventSource,
  showLabel = true,
  className,
}: {
  tree: NodeTree;
  nodeId: string;
  scrollManager?: ScrollManager | null;
  eventSource?: { on: (event: string, handler: (...args: unknown[]) => void) => void; off: (event: string, handler: (...args: unknown[]) => void) => void } | null;
  showLabel?: boolean;
  className?: string;
}): React.ReactElement | null {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!eventSource) return;
    const handler = () => forceUpdate((v) => v + 1);
    eventSource.on('scroll', handler);
    eventSource.on('render', handler);
    return () => {
      eventSource.off('scroll', handler);
      eventSource.off('render', handler);
    };
  }, [eventSource]);

  const node = tree.nodes[nodeId];
  const rect = node?.computedLayout;
  const scrollOffset = scrollManager && node ? getAncestorScrollOffset(tree, nodeId, scrollManager) : { x: 0, y: 0 };

  if (!node || !rect) return null;

  const LABEL_OFFSET_Y = 20;

  const left = rect.left - scrollOffset.x;
  const top = rect.top - scrollOffset.y;
  const width = rect.width;
  const height = rect.height;
  const clipRect = scrollManager ? getScrollViewClipRect(tree, nodeId, scrollManager) : null;
  const wrapperRect = { left, top: top - LABEL_OFFSET_Y, width, height: height + LABEL_OFFSET_Y };
  const clipStyle = clipRect ? getClipStyleFromIntersection(wrapperRect, clipRect) : null;

  return (
    <div
      className={`absolute pointer-events-none ${className ?? ''}`}
      style={{ left: wrapperRect.left, top: wrapperRect.top, width: wrapperRect.width, height: wrapperRect.height, ...(clipStyle ?? {}) }}
    >
      {showLabel && (
        <div
          className="absolute left-0 top-0 bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded-sm whitespace-nowrap font-medium"
        >
          {node.name} ({Math.round(width)}x{Math.round(height)})
        </div>
      )}
      <div
        className="absolute border-2 border-indigo-500 rounded-xs"
        style={{ left: 0, top: LABEL_OFFSET_Y, width, height, boxShadow: '0 0 0 1px rgba(99, 102, 241, 0.2)' }}
      />
    </div>
  );
}

function getScrollViewClipRect(tree: NodeTree, nodeId: string, scrollManager: ScrollManager): { left: number; top: number; right: number; bottom: number } | null {
  let clip: { left: number; top: number; right: number; bottom: number } | null = null;
  let current: CanvasNode | undefined = tree.nodes[nodeId];

  while (current?.parentId) {
    const pid = current.parentId as string;
    const parentNode: CanvasNode | undefined = tree.nodes[pid];
    if (!parentNode) break;

    if (parentNode.type === 'scrollview') {
      const offsetAbove = getAncestorScrollOffset(tree, parentNode.id, scrollManager);
      const viewportLeft = parentNode.computedLayout.left - offsetAbove.x;
      const viewportTop = parentNode.computedLayout.top - offsetAbove.y;
      const viewportRight = viewportLeft + parentNode.computedLayout.width;
      const viewportBottom = viewportTop + parentNode.computedLayout.height;
      const viewport = { left: viewportLeft, top: viewportTop, right: viewportRight, bottom: viewportBottom };

      clip = clip ? intersectRect(clip, viewport) : viewport;
    }

    current = parentNode;
  }

  return clip;
}

function intersectRect(a: { left: number; top: number; right: number; bottom: number }, b: { left: number; top: number; right: number; bottom: number }) {
  return {
    left: Math.max(a.left, b.left),
    top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom),
  };
}

function getClipStyleFromIntersection(
  rect: { left: number; top: number; width: number; height: number },
  clip: { left: number; top: number; right: number; bottom: number },
): { clipPath: string } {
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;

  const insetLeft = Math.max(0, clip.left - rect.left);
  const insetTop = Math.max(0, clip.top - rect.top);
  const insetRight = Math.max(0, right - clip.right);
  const insetBottom = Math.max(0, bottom - clip.bottom);

  return { clipPath: `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)` };
}

function getAncestorScrollOffset(tree: NodeTree, nodeId: string, scrollManager: ScrollManager): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let current: CanvasNode | undefined = tree.nodes[nodeId];

  while (current?.parentId) {
    const pid: string = current.parentId as string;
    const parentNode: CanvasNode | undefined = tree.nodes[pid];
    if (!parentNode) break;
    if (parentNode.type === 'scrollview') {
      const offset = scrollManager.getOffset(parentNode.id);
      x += offset.x;
      y += offset.y;
    }
    current = parentNode;
  }

  return { x, y };
}
