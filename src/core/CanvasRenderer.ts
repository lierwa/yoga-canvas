import type { CanvasNode, NodeTree, SelectionState, FlexValue } from '../types';
import type { ScrollManager } from '@yoga-canvas/core';

const HANDLE_SIZE = 8;
const ROTATION_HANDLE_OFFSET = 24;
const ROTATION_HANDLE_RADIUS = 6;

// Image cache for canvas rendering
const imageCache = new Map<string, HTMLImageElement>();
const renderCallbacks = new Set<() => void>();

export function setRenderCallback(cb: () => void) {
  renderCallbacks.add(cb);
  return () => {
    renderCallbacks.delete(cb);
  };
}

function getCachedImage(src: string): HTMLImageElement | null {
  if (!src) return null;
  const cached = imageCache.get(src);
  if (cached && cached.complete) return cached;
  if (!cached) {
    const img = new Image();
    img.onload = () => {
      for (const cb of renderCallbacks) cb();
    };
    img.src = src;
    imageCache.set(src, img);
  }
  return null;
}

export function renderCanvas(
  ctx: CanvasRenderingContext2D,
  tree: NodeTree,
  selection: SelectionState,
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  options?: { showGrid?: boolean; scrollManager?: ScrollManager | null }
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Draw background grid
  if (options?.showGrid !== false) {
    drawGrid(ctx, canvasWidth, canvasHeight, scale, offsetX, offsetY);
  }

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Render nodes recursively
  renderNode(ctx, tree, tree.rootId, selection, options?.scrollManager ?? null);

  ctx.restore();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  offsetX: number,
  offsetY: number
): void {
  const gridSize = 20 * scale;
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 0.5;

  const startX = offsetX % gridSize;
  const startY = offsetY % gridSize;

  for (let x = startX; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = startY; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function renderNode(
  ctx: CanvasRenderingContext2D,
  tree: NodeTree,
  nodeId: string,
  selection: SelectionState,
  scrollManager: ScrollManager | null
): void {
  const node = tree.nodes[nodeId];
  if (!node) return;

  const { left, top, width, height } = node.computedLayout;
  const { backgroundColor, borderColor, borderWidth, borderRadius, opacity } = node.visualStyle;

  ctx.save();
  ctx.globalAlpha = opacity;

  // Apply rotation (visual only, around node center)
  const rotate = node.visualStyle.rotate || 0;
  if (rotate !== 0) {
    const cx = left + width / 2;
    const cy = top + height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  // Draw background
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    if (borderRadius > 0) {
      drawRoundedRect(ctx, left, top, width, height, borderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(left, top, width, height);
    }
  }

  // Draw border
  if (borderWidth > 0) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    if (borderRadius > 0) {
      drawRoundedRect(ctx, left, top, width, height, borderRadius);
      ctx.stroke();
    } else {
      ctx.strokeRect(left, top, width, height);
    }
  }

  // Draw type-specific content
  switch (node.type) {
    case 'text':
      drawTextContent(ctx, node);
      break;
    case 'image':
      drawImageContent(ctx, node);
      break;
    case 'scrollview':
      if (!scrollManager) drawScrollViewIndicator(ctx, node);
      break;
    default:
      break;
  }

  ctx.restore();

  // Draw children (clip for scrollview)
  if (node.type === 'scrollview') {
    const scrollOffset = scrollManager?.getOffset(nodeId) ?? { x: 0, y: 0 };
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, width, height);
    ctx.clip();
    ctx.translate(-scrollOffset.x, -scrollOffset.y);
    for (const childId of node.children) {
      renderNode(ctx, tree, childId, selection, scrollManager);
    }
    ctx.restore();

    if (scrollManager) {
      const state = scrollManager.getState(nodeId);
      const scrollBarOpacity = scrollManager.getScrollBarOpacity(nodeId);
      drawScrollViewScrollbar(ctx, node, state, scrollBarOpacity);
    }
  } else {
    for (const childId of node.children) {
      renderNode(ctx, tree, childId, selection, scrollManager);
    }
  }

  // Draw insertion line indicator
  if (selection.dropIndicator && selection.dropIndicator.parentId === nodeId) {
    const ind = selection.dropIndicator;
    ctx.save();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (ind.isHorizontal) {
      ctx.moveTo(ind.x, ind.y);
      ctx.lineTo(ind.x + ind.length, ind.y);
    } else {
      ctx.moveTo(ind.x, ind.y);
      ctx.lineTo(ind.x, ind.y + ind.length);
    }
    ctx.stroke();
    // Draw small circles at endpoints
    ctx.fillStyle = '#22c55e';
    if (ind.isHorizontal) {
      ctx.beginPath(); ctx.arc(ind.x, ind.y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ind.x + ind.length, ind.y, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(ind.x, ind.y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ind.x, ind.y + ind.length, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Draw drop target highlight
  if (selection.dropTargetId === nodeId) {
    ctx.save();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(left, top, width, height);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
    ctx.fillRect(left, top, width, height);
    ctx.restore();
  }

  // Draw hover highlight
  if (selection.hoveredNodeId === nodeId && selection.selectedNodeId !== nodeId) {
    ctx.save();
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(left, top, width, height);
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Draw selection
  if (selection.selectedNodeId === nodeId) {
    drawSelection(ctx, node);
  }
}

function drawSelection(ctx: CanvasRenderingContext2D, node: CanvasNode): void {
  const { left, top, width, height } = node.computedLayout;

  ctx.save();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.strokeRect(left, top, width, height);

  // Draw resize handles
  const handles = getResizeHandlePositions(node);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;
  for (const handle of handles) {
    const isMid = handle.position.startsWith('mid-');
    const size = isMid ? HANDLE_SIZE - 2 : HANDLE_SIZE;
    ctx.beginPath();
    if (isMid) {
      ctx.arc(handle.x, handle.y, size / 2, 0, Math.PI * 2);
    } else {
      ctx.rect(
        handle.x - size / 2,
        handle.y - size / 2,
        size,
        size
      );
    }
    ctx.fill();
    ctx.stroke();
  }

  // Draw rotation handle (circle above top-center, connected by a line)
  const rotHandleY = top - ROTATION_HANDLE_OFFSET;
  const rotHandleX = left + width / 2;
  ctx.beginPath();
  ctx.moveTo(rotHandleX, top);
  ctx.lineTo(rotHandleX, rotHandleY);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(rotHandleX, rotHandleY, ROTATION_HANDLE_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;
  ctx.fill();
  ctx.stroke();

  // Draw rotation icon (↻ arc arrow) inside handle
  ctx.beginPath();
  ctx.arc(rotHandleX, rotHandleY, 3, -Math.PI * 0.8, Math.PI * 0.5);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Draw dimension label
  const dimLabel = `${Math.round(width)} × ${Math.round(height)}`;
  ctx.fillStyle = '#3b82f6';
  ctx.font = 'bold 10px Inter, sans-serif';
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'center';
  ctx.fillText(dimLabel, left + width / 2, top - ROTATION_HANDLE_OFFSET - ROTATION_HANDLE_RADIUS - 4);

  ctx.restore();
}

export function getResizeHandlePositions(node: CanvasNode) {
  const { left, top, width, height } = node.computedLayout;
  return [
    { position: 'top-left' as const, x: left, y: top },
    { position: 'top-right' as const, x: left + width, y: top },
    { position: 'bottom-left' as const, x: left, y: top + height },
    { position: 'bottom-right' as const, x: left + width, y: top + height },
    { position: 'mid-top' as const, x: left + width / 2, y: top },
    { position: 'mid-right' as const, x: left + width, y: top + height / 2 },
    { position: 'mid-bottom' as const, x: left + width / 2, y: top + height },
    { position: 'mid-left' as const, x: left, y: top + height / 2 },
  ];
}

function flexValueToPx(value: FlexValue | undefined, fallback = 0): number {
  if (value === undefined || value === 'auto') return fallback;
  if (typeof value === 'number') return value;
  return fallback;
}

function drawTextContent(ctx: CanvasRenderingContext2D, node: CanvasNode): void {
  if (!node.textProps) return;
  const { left, top, width } = node.computedLayout;
  const { content, fontSize, fontWeight, color, lineHeight, textAlign } = node.textProps;
  const pad = flexValueToPx(node.flexStyle.paddingLeft);
  const padRight = flexValueToPx(node.flexStyle.paddingRight);
  const padTop = flexValueToPx(node.flexStyle.paddingTop);
  const maxWidth = width - pad - padRight;
  if (maxWidth <= 0) return;

  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${fontWeight === 'bold' ? 'bold ' : ''}${fontSize}px Inter, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.textAlign = textAlign;

  const lines = content.split('\n');
  const lineH = fontSize * lineHeight;
  const halfLeading = (lineH - fontSize) / 2;
  let y = top + padTop + halfLeading;
  let textX = left + pad;
  if (textAlign === 'center') textX = left + width / 2;
  else if (textAlign === 'right') textX = left + width - padRight;

  for (const line of lines) {
    // Word wrap
    const words = line.split(' ');
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const tw = ctx.measureText(testLine).width;
      if (tw > maxWidth && currentLine) {
        ctx.fillText(currentLine, textX, y);
        currentLine = word;
        y += lineH;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      ctx.fillText(currentLine, textX, y);
      y += lineH;
    }
  }
  ctx.restore();
}

function drawImageContent(ctx: CanvasRenderingContext2D, node: CanvasNode): void {
  const { left, top, width, height } = node.computedLayout;
  const src = node.imageProps?.src;
  const objectFit = node.imageProps?.objectFit ?? 'cover';

  if (src) {
    const img = getCachedImage(src);
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, top, width, height);
      ctx.clip();

      let dx = left, dy = top, dw = width, dh = height;
      if (objectFit === 'contain' || objectFit === 'cover') {
        const imgRatio = img.naturalWidth / img.naturalHeight;
        const boxRatio = width / height;
        const useWidth = objectFit === 'cover' ? imgRatio < boxRatio : imgRatio > boxRatio;
        if (useWidth) {
          dw = width;
          dh = width / imgRatio;
        } else {
          dh = height;
          dw = height * imgRatio;
        }
        dx = left + (width - dw) / 2;
        dy = top + (height - dh) / 2;
      }
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
      return;
    }
  }

  // Fallback placeholder
  ctx.save();
  ctx.strokeStyle = '#a5b4fc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left + width, top + height);
  ctx.moveTo(left + width, top);
  ctx.lineTo(left, top + height);
  ctx.stroke();

  const iconSize = Math.min(32, width * 0.4, height * 0.4);
  const cx = left + width / 2;
  const cy = top + height / 2;
  ctx.fillStyle = '#818cf8';
  ctx.font = `${iconSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🖼', cx, cy);
  ctx.restore();
}

function drawScrollViewIndicator(ctx: CanvasRenderingContext2D, node: CanvasNode): void {
  const { left, top, width, height } = node.computedLayout;
  const isVertical = node.scrollViewProps?.scrollDirection !== 'horizontal';

  ctx.save();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);

  if (isVertical) {
    // Right edge scrollbar track
    const barX = left + width - 4;
    const barH = Math.min(height * 0.3, 40);
    ctx.beginPath();
    ctx.roundRect(barX, top + 4, 3, barH, 1.5);
    ctx.stroke();
    // Arrow at bottom
    const arrowY = top + height - 10;
    ctx.beginPath();
    ctx.moveTo(left + width / 2 - 6, arrowY);
    ctx.lineTo(left + width / 2, arrowY + 6);
    ctx.lineTo(left + width / 2 + 6, arrowY);
    ctx.stroke();
  } else {
    // Bottom edge scrollbar track
    const barY = top + height - 4;
    const barW = Math.min(width * 0.3, 40);
    ctx.beginPath();
    ctx.roundRect(left + 4, barY, barW, 3, 1.5);
    ctx.stroke();
    // Arrow at right
    const arrowX = left + width - 10;
    ctx.beginPath();
    ctx.moveTo(arrowX, top + height / 2 - 6);
    ctx.lineTo(arrowX + 6, top + height / 2);
    ctx.lineTo(arrowX, top + height / 2 + 6);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.restore();
}

function drawScrollViewScrollbar(
  ctx: CanvasRenderingContext2D,
  node: CanvasNode,
  scrollState: { offsetX: number; offsetY: number; contentWidth: number; contentHeight: number; viewportWidth: number; viewportHeight: number },
  scrollBarOpacity = 1
): void {
  if (scrollBarOpacity <= 0) return;
  const { left, top, width, height } = node.computedLayout;
  const isVertical = node.scrollViewProps?.scrollDirection !== 'horizontal';

  const SCROLLBAR_SIZE = 4;
  const SCROLLBAR_MIN_THUMB = 20;
  const SCROLLBAR_PADDING = 2;
  const SCROLLBAR_RADIUS = 2;

  const color = `rgba(0, 0, 0, ${0.25 * scrollBarOpacity})`;

  ctx.save();
  ctx.fillStyle = color;

  if (isVertical && scrollState.contentHeight > scrollState.viewportHeight) {
    const trackHeight = height - SCROLLBAR_PADDING * 2;
    const ratio = scrollState.viewportHeight / scrollState.contentHeight;
    const thumbHeight = Math.max(trackHeight * ratio, SCROLLBAR_MIN_THUMB);
    const maxScroll = scrollState.contentHeight - scrollState.viewportHeight;
    const scrollRatio = maxScroll > 0 ? scrollState.offsetY / maxScroll : 0;
    const thumbY = top + SCROLLBAR_PADDING + scrollRatio * (trackHeight - thumbHeight);
    const thumbX = left + width - SCROLLBAR_SIZE - SCROLLBAR_PADDING;
    drawRoundedRect(ctx, thumbX, thumbY, SCROLLBAR_SIZE, thumbHeight, SCROLLBAR_RADIUS);
    ctx.fill();
  }

  if (!isVertical && scrollState.contentWidth > scrollState.viewportWidth) {
    const trackWidth = width - SCROLLBAR_PADDING * 2;
    const ratio = scrollState.viewportWidth / scrollState.contentWidth;
    const thumbWidth = Math.max(trackWidth * ratio, SCROLLBAR_MIN_THUMB);
    const maxScroll = scrollState.contentWidth - scrollState.viewportWidth;
    const scrollRatio = maxScroll > 0 ? scrollState.offsetX / maxScroll : 0;
    const thumbX = left + SCROLLBAR_PADDING + scrollRatio * (trackWidth - thumbWidth);
    const thumbY = top + height - SCROLLBAR_SIZE - SCROLLBAR_PADDING;
    drawRoundedRect(ctx, thumbX, thumbY, thumbWidth, SCROLLBAR_SIZE, SCROLLBAR_RADIUS);
    ctx.fill();
  }

  ctx.restore();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function getRotationHandlePosition(node: CanvasNode) {
  const { left, top, width } = node.computedLayout;
  return {
    x: left + width / 2,
    y: top - ROTATION_HANDLE_OFFSET,
  };
}

export function hitTestRotationHandle(
  node: CanvasNode,
  x: number,
  y: number,
  scale: number,
  offsetX: number,
  offsetY: number
): boolean {
  const canvasX = (x - offsetX) / scale;
  const canvasY = (y - offsetY) / scale;
  const pos = getRotationHandlePosition(node);
  const threshold = (ROTATION_HANDLE_RADIUS + 2) / scale;
  return Math.hypot(canvasX - pos.x, canvasY - pos.y) <= threshold;
}

export function hitTestResizeHandle(
  node: CanvasNode,
  x: number,
  y: number,
  scale: number,
  offsetX: number,
  offsetY: number
): string | null {
  const canvasX = (x - offsetX) / scale;
  const canvasY = (y - offsetY) / scale;
  const handles = getResizeHandlePositions(node);
  const threshold = (HANDLE_SIZE / 2 + 2) / scale;

  for (const handle of handles) {
    if (
      Math.abs(canvasX - handle.x) <= threshold &&
      Math.abs(canvasY - handle.y) <= threshold
    ) {
      return handle.position;
    }
  }
  return null;
}
