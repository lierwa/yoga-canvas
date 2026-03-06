import type { CanvasNode, NodeTree, FlexValue } from '@yoga-canvas/core';
import type { ScrollManager } from '@yoga-canvas/core';
import type { SelectionState } from './types';

type ShadowStyle = { offsetX: number; offsetY: number; blur: number; color: string };
type BoxShadowStyle = ShadowStyle & { spread?: number };
type GradientStop = { offset: number; color: string };
type LinearGradientStyle = {
  type?: 'linear';
  start: { x: number; y: number };
  end: { x: number; y: number };
  colors: GradientStop[];
  angle?: number;
};
type RadialGradientStyle = {
  type: 'radial';
  center: { x: number; y: number };
  radius?: number;
  colors: GradientStop[];
};
type GradientStyle = LinearGradientStyle | RadialGradientStyle | string;
type VisualStyleEx = {
  backgroundColor?: string;
  linearGradient?: GradientStyle | null;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  rotate?: number;
  boxShadow?: BoxShadowStyle | null;
  zIndex?: number;
};
type TextPropsEx = {
  content: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  fontFamily?: string;
  color: string;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right';
  whiteSpace: 'normal' | 'nowrap';
  lineClamp?: number;
  textShadow?: ShadowStyle | null;
};

const HANDLE_SIZE = 8;
const ROTATION_HANDLE_OFFSET = 24;
const ROTATION_HANDLE_RADIUS = 6;

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
  if (cached && cached.complete) {
    if (cached.naturalWidth > 0 && cached.naturalHeight > 0) return cached;
    return null;
  }
  if (!cached) {
    const img = new Image();
    img.onload = () => {
      for (const cb of renderCallbacks) cb();
    };
    img.onerror = () => {
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

  if (options?.showGrid !== false) {
    drawGrid(ctx, canvasWidth, canvasHeight, scale, offsetX, offsetY);
  }

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  const scrollManager = options?.scrollManager ?? null;
  renderNode(ctx, tree, tree.rootId, selection, scrollManager);
  drawOverlays(ctx, tree, selection, scrollManager);
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
  ctx.strokeStyle = '#e1e1e1';
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
  const vstyle = node.visualStyle as VisualStyleEx;
  const backgroundColor = vstyle.backgroundColor;
  const linearGradient = vstyle.linearGradient ?? null;
  const borderColor = vstyle.borderColor ?? 'transparent';
  const borderWidth = vstyle.borderWidth ?? 0;
  const borderRadius = vstyle.borderRadius ?? 0;
  const opacity = vstyle.opacity ?? 1;
  const boxShadow = vstyle.boxShadow ?? null;
  const effectiveBoxShadow = node.type === 'text' ? null : boxShadow;
  const effectiveGradient = node.type === 'text' ? null : linearGradient;

  ctx.save();
  ctx.globalAlpha = opacity;

  const rotate = node.visualStyle.rotate || 0;
  if (rotate !== 0) {
    const cx = left + width / 2;
    const cy = top + height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  if (effectiveBoxShadow) {
    const spread = effectiveBoxShadow.spread ?? 0;
    const shadowLeft = left - spread;
    const shadowTop = top - spread;
    const shadowWidth = width + spread * 2;
    const shadowHeight = height + spread * 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.shadowColor = effectiveBoxShadow.color;
    ctx.shadowBlur = effectiveBoxShadow.blur;
    ctx.shadowOffsetX = effectiveBoxShadow.offsetX;
    ctx.shadowOffsetY = effectiveBoxShadow.offsetY;
    if (borderRadius > 0) {
      drawRoundedRect(ctx, shadowLeft, shadowTop, shadowWidth, shadowHeight, borderRadius + spread);
      ctx.fill();
    } else {
      ctx.fillRect(shadowLeft, shadowTop, shadowWidth, shadowHeight);
    }
    ctx.restore();
  }

  if ((backgroundColor && backgroundColor !== 'transparent') || effectiveGradient) {
    const fillStyle = effectiveGradient
      ? buildGradient(ctx, left, top, width, height, effectiveGradient)
      : backgroundColor;
    if (!fillStyle) return;
    ctx.fillStyle = fillStyle;
    if (borderRadius > 0) {
      drawRoundedRect(ctx, left, top, width, height, borderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(left, top, width, height);
    }
  }

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

  if (node.type === 'scrollview') {
    const scrollOffset = scrollManager?.getOffset(nodeId) ?? { x: 0, y: 0 };
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, width, height);
    ctx.clip();
    ctx.translate(-scrollOffset.x, -scrollOffset.y);
    const orderedChildren = getOrderedChildren(tree, node);
    for (const childId of orderedChildren) {
      renderNode(ctx, tree, childId, selection, scrollManager);
    }
    ctx.restore();

    if (scrollManager) {
      const state = scrollManager.getState(nodeId);
      const scrollBarOpacity = scrollManager.getScrollBarOpacity(nodeId);
      drawScrollViewScrollbar(ctx, node, state, scrollBarOpacity);
    }
  } else {
    const orderedChildren = getOrderedChildren(tree, node);
    if (node.type === 'view' && node.flexStyle.overflow === 'hidden') {
      ctx.save();
      ctx.beginPath();
      if (borderRadius > 0) {
        drawRoundedRect(ctx, left, top, width, height, borderRadius);
      } else {
        ctx.rect(left, top, width, height);
      }
      ctx.clip();
      for (const childId of orderedChildren) {
        renderNode(ctx, tree, childId, selection, scrollManager);
      }
      ctx.restore();
    } else {
      for (const childId of orderedChildren) {
        renderNode(ctx, tree, childId, selection, scrollManager);
      }
    }
  }
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

function drawOverlays(
  ctx: CanvasRenderingContext2D,
  tree: NodeTree,
  selection: SelectionState,
  scrollManager: ScrollManager | null
): void {
  const getOffset = (nodeId: string) => {
    if (!scrollManager) return { x: 0, y: 0 };
    return getAncestorScrollOffset(tree, nodeId, scrollManager);
  };

  if (selection.dropIndicator) {
    const ind = selection.dropIndicator;
    const off = getOffset(ind.parentId);
    const dx = -off.x;
    const dy = -off.y;
    const x = ind.x + dx;
    const y = ind.y + dy;
    ctx.save();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (ind.isHorizontal) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + ind.length, y);
    } else {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + ind.length);
    }
    ctx.stroke();
    ctx.fillStyle = '#22c55e';
    if (ind.isHorizontal) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + ind.length, y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y + ind.length, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (selection.dropTargetId) {
    const node = tree.nodes[selection.dropTargetId];
    if (node) {
      const off = getOffset(selection.dropTargetId);
      const dx = -off.x;
      const dy = -off.y;
      const { left, top, width, height } = node.computedLayout;
      ctx.save();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(left + dx, top + dy, width, height);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
      ctx.fillRect(left + dx, top + dy, width, height);
      ctx.restore();
    }
  }

  if (selection.hoveredNodeId && selection.hoveredNodeId !== selection.selectedNodeId) {
    const node = tree.nodes[selection.hoveredNodeId];
    if (node) {
      const off = getOffset(selection.hoveredNodeId);
      const dx = -off.x;
      const dy = -off.y;
      const { left, top, width, height } = node.computedLayout;
      ctx.save();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(left + dx, top + dy, width, height);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  if (selection.selectedNodeId) {
    const node = tree.nodes[selection.selectedNodeId];
    if (node) {
      const off = getOffset(selection.selectedNodeId);
      drawSelection(ctx, node, -off.x, -off.y);
    }
  }
}

function drawSelection(ctx: CanvasRenderingContext2D, node: CanvasNode, dx = 0, dy = 0): void {
  const { left, top, width, height } = node.computedLayout;
  ctx.save();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.strokeRect(left + dx, top + dy, width, height);
  const handles = getResizeHandlePositions(node);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;
  for (const handle of handles) {
    const isMid = handle.position.startsWith('mid-');
    const size = isMid ? HANDLE_SIZE - 2 : HANDLE_SIZE;
    ctx.beginPath();
    if (isMid) {
      ctx.arc(handle.x + dx, handle.y + dy, size / 2, 0, Math.PI * 2);
    } else {
      ctx.rect(handle.x + dx - size / 2, handle.y + dy - size / 2, size, size);
    }
    ctx.fill();
    ctx.stroke();
  }

  const rotHandleY = top + dy - ROTATION_HANDLE_OFFSET;
  const rotHandleX = left + dx + width / 2;
  ctx.beginPath();
  ctx.moveTo(rotHandleX, top + dy);
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

  ctx.beginPath();
  ctx.arc(rotHandleX, rotHandleY, 3, -Math.PI * 0.8, Math.PI * 0.5);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  const dimLabel = `${Math.round(width)} × ${Math.round(height)}`;
  ctx.fillStyle = '#3b82f6';
  ctx.font = 'bold 10px Inter, sans-serif';
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'center';
  ctx.fillText(dimLabel, left + dx + width / 2, top + dy - ROTATION_HANDLE_OFFSET - ROTATION_HANDLE_RADIUS - 4);

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

function normalizeLineClamp(lineClamp: number | undefined): number | null {
  if (lineClamp === undefined) return null;
  const n = Math.floor(lineClamp);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function resolveLineHeightPx(fontSize: number, lineHeight: number): number {
  if (!Number.isFinite(fontSize) || fontSize <= 0) return 0;
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) return fontSize * 1.2;
  return lineHeight < 4 ? fontSize * lineHeight : lineHeight;
}

function ellipsizeToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  const ellipsis = '…';
  if (maxWidth <= 0) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  if (ctx.measureText(ellipsis).width > maxWidth) return '';

  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    const slice = text.slice(0, mid);
    if (ctx.measureText(slice + ellipsis).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  const slice = text.slice(0, lo);
  return slice ? slice + ellipsis : ellipsis;
}

function buildClampedLastLineText(lines: string[], startIndex: number, joiner: string): string {
  let result = lines[startIndex] ?? '';
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const next = lines[i];
    if (!next) continue;
    if (!result) {
      result = next;
      continue;
    }
    if (joiner === ' ') {
      result = `${result.trimEnd()} ${next.trimStart()}`;
    } else {
      result += next;
    }
  }
  return result;
}

function drawTextContent(ctx: CanvasRenderingContext2D, node: CanvasNode): void {
  if (!node.textProps) return;
  const { left, top, width, height } = node.computedLayout;
  const tp = node.textProps as TextPropsEx;
  const content = tp.content;
  const fontSize = tp.fontSize;
  const fontWeight = tp.fontWeight;
  const fontStyle = tp.fontStyle ?? 'normal';
  const fontFamily = tp.fontFamily;
  const color = tp.color;
  const lineHeight = tp.lineHeight;
  const textAlign = tp.textAlign as CanvasTextAlign;
  const whiteSpace = tp.whiteSpace;
  const normalizedClamp = normalizeLineClamp(tp.lineClamp);
  const textShadow = tp.textShadow ?? null;
  const pad = flexValueToPx(node.flexStyle.paddingLeft);
  const padRight = flexValueToPx(node.flexStyle.paddingRight);
  const padTop = flexValueToPx(node.flexStyle.paddingTop);
  const maxWidth = width - pad - padRight;
  if (maxWidth <= 0) return;

  ctx.save();
  const vstyle = node.visualStyle as VisualStyleEx;
  const gradient = vstyle.linearGradient ?? null;
  const fillStyle = gradient ? buildGradient(ctx, left, top, width, height, gradient) : null;
  ctx.fillStyle = fillStyle ?? color;
  const weightPart = typeof fontWeight === 'number' ? `${fontWeight} ` : fontWeight !== 'normal' ? `${fontWeight} ` : '';
  const stylePart = fontStyle && fontStyle !== 'normal' ? `${fontStyle} ` : '';
  ctx.font = `${stylePart}${weightPart}${fontSize}px ${fontFamily || 'Inter, sans-serif'}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = textAlign;
  if (textShadow) {
    ctx.shadowColor = textShadow.color;
    ctx.shadowBlur = textShadow.blur;
    ctx.shadowOffsetX = textShadow.offsetX;
    ctx.shadowOffsetY = textShadow.offsetY;
  }

  const computedLineHeight = resolveLineHeightPx(fontSize, lineHeight);
  const halfLeading = (computedLineHeight - fontSize) / 2;

  ctx.beginPath();
  ctx.rect(left, top, width, node.computedLayout.height);
  ctx.clip();

  const rawLines =
    whiteSpace === 'nowrap'
      ? [normalizedClamp ? ellipsizeToWidth(ctx, content.replace(/\n/g, ' '), maxWidth) : content.replace(/\n/g, ' ')]
      : wrapText(ctx, content, maxWidth);
  const displayedLines =
    normalizedClamp && rawLines.length > normalizedClamp
      ? [
          ...rawLines.slice(0, normalizedClamp - 1),
          ellipsizeToWidth(
            ctx,
            buildClampedLastLineText(rawLines, normalizedClamp - 1, content.includes(' ') ? ' ' : ''),
            maxWidth,
          ),
        ]
      : rawLines;
  let y = top + padTop + halfLeading;
  for (const line of displayedLines) {
    const x =
      textAlign === 'left'
        ? left + pad
        : textAlign === 'center'
          ? left + width / 2
          : left + width - padRight;
    ctx.fillText(line, x, y);
    y += computedLineHeight;
  }
  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const EPS = 0.01;
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      lines.push('');
      continue;
    }

    const words = paragraph.split(' ');
    let current = '';

    for (const word of words) {
      if (word === '') continue;

      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth + EPS && current) {
        lines.push(current);
        current = '';
      }

      if (ctx.measureText(word).width > maxWidth + EPS) {
        if (current) {
          lines.push(current);
          current = '';
        }

        let chunk = '';
        for (const ch of word) {
          const nextChunk = chunk + ch;
          if (ctx.measureText(nextChunk).width > maxWidth + EPS && chunk) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk = nextChunk;
          }
        }
        current = chunk;
      } else {
        current = current ? `${current} ${word}` : word;
      }
    }

    if (current) {
      lines.push(current);
    }
  }

  return lines;
}

function drawImageContent(ctx: CanvasRenderingContext2D, node: CanvasNode): void {
  const img = node.imageProps?.src ? getCachedImage(node.imageProps.src) : null;
  if (!img) {
    drawImagePlaceholder(ctx, node);
    return;
  }

  const { left, top, width, height } = node.computedLayout;
  const objectFit = node.imageProps?.objectFit ?? 'cover';

  let drawWidth = width;
  let drawHeight = height;
  let dx = left;
  let dy = top;

  if (objectFit === 'contain') {
    const scale = Math.min(width / img.width, height / img.height);
    drawWidth = img.width * scale;
    drawHeight = img.height * scale;
    dx = left + (width - drawWidth) / 2;
    dy = top + (height - drawHeight) / 2;
  } else if (objectFit === 'cover') {
    const scale = Math.max(width / img.width, height / img.height);
    drawWidth = img.width * scale;
    drawHeight = img.height * scale;
    dx = left + (width - drawWidth) / 2;
    dy = top + (height - drawHeight) / 2;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  try {
    ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
  } catch {
    drawImagePlaceholder(ctx, node);
  }
  ctx.restore();
}

function drawImagePlaceholder(ctx: CanvasRenderingContext2D, node: CanvasNode): void {
  const { left, top, width, height } = node.computedLayout;
  ctx.save();
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(left, top, width, height);
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(left, top, width, height);
  ctx.setLineDash([]);
  ctx.restore();
}

function drawScrollViewIndicator(ctx: CanvasRenderingContext2D, node: CanvasNode): void {
  const { left, top, width, height } = node.computedLayout;
  ctx.save();
  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(left, top, width, height);
  ctx.setLineDash([]);
  ctx.restore();
}

function getOrderedChildren(tree: NodeTree, node: CanvasNode): string[] {
  if (!node.children?.length) return [];
  return node.children.slice().sort((a, b) => {
    const na = tree.nodes[a];
    const nb = tree.nodes[b];
    const za = (na?.visualStyle as VisualStyleEx)?.zIndex ?? 0;
    const zb = (nb?.visualStyle as VisualStyleEx)?.zIndex ?? 0;
    if (za === zb) return 0;
    return za - zb;
  });
}

function buildLinearGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  grad: Exclude<GradientStyle, string>
): CanvasGradient | null {
  const colors = grad.colors ?? [];
  if (!colors.length) return null;

  const angle = (grad as { angle?: number }).angle;
  const start = (grad as { start?: { x: number; y: number } }).start ?? { x: 0, y: 0 };
  const end = (grad as { end?: { x: number; y: number } }).end ?? { x: 1, y: 0 };

  const p = angle === undefined || !Number.isFinite(angle)
    ? {
        x0: x + start.x * w,
        y0: y + start.y * h,
        x1: x + end.x * w,
        y1: y + end.y * h,
      }
    : computeLinearGradientEndpoints(x, y, w, h, angle);

  const gradient = ctx.createLinearGradient(p.x0, p.y0, p.x1, p.y1);
  for (const stop of normalizeStops(colors)) {
    gradient.addColorStop(stop.offset, stop.color);
  }
  return gradient;
}

function buildGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  input: GradientStyle
): CanvasGradient | null {
  const grad = typeof input === 'string' ? parseCSSGradient(input) : input;
  if (!grad || typeof grad === 'string') return null;
  if ((grad as { type?: string }).type === 'radial') {
    return buildRadialGradient(ctx, x, y, w, h, grad as RadialGradientStyle);
  }
  return buildLinearGradient(ctx, x, y, w, h, grad);
}

function buildRadialGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  grad: RadialGradientStyle
): CanvasGradient | null {
  const colors = grad.colors ?? [];
  if (!colors.length) return null;
  const center = grad.center ?? { x: 0.5, y: 0.5 };
  const r = grad.radius;
  const radiusPx = typeof r === 'number' && Number.isFinite(r)
    ? (r <= 1 ? r * Math.max(w, h) : r)
    : Math.max(w, h) / 2;
  const cx = x + center.x * w;
  const cy = y + center.y * h;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radiusPx);
  for (const stop of normalizeStops(colors)) {
    gradient.addColorStop(stop.offset, stop.color);
  }
  return gradient;
}

function normalizeStops(stops: GradientStop[]): GradientStop[] {
  if (!stops.length) return [];
  const out = stops
    .map((s) => ({
      color: s.color,
      offset: Number.isFinite(s.offset) ? clamp01(s.offset) : Number.NaN,
    }))
    .sort((a, b) => {
      if (Number.isNaN(a.offset) && Number.isNaN(b.offset)) return 0;
      if (Number.isNaN(a.offset)) return 1;
      if (Number.isNaN(b.offset)) return -1;
      return a.offset - b.offset;
    });

  if (out.every((s) => Number.isNaN(s.offset))) {
    const n = out.length;
    return out.map((s, i) => ({ ...s, offset: n === 1 ? 0 : i / (n - 1) }));
  }

  if (Number.isNaN(out[0]!.offset)) out[0]!.offset = 0;
  if (Number.isNaN(out[out.length - 1]!.offset)) out[out.length - 1]!.offset = 1;

  let lastDefined = 0;
  for (let i = 1; i < out.length; i += 1) {
    if (!Number.isNaN(out[i]!.offset)) {
      const start = out[lastDefined]!.offset;
      const end = out[i]!.offset;
      const span = i - lastDefined;
      for (let j = 1; j < span; j += 1) {
        if (Number.isNaN(out[lastDefined + j]!.offset)) {
          out[lastDefined + j]!.offset = start + ((end - start) * j) / span;
        }
      }
      lastDefined = i;
    }
  }

  return out.map((s) => ({ ...s, offset: clamp01(s.offset) })) as GradientStop[];
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function computeLinearGradientEndpoints(
  x: number,
  y: number,
  w: number,
  h: number,
  angleDeg: number
): { x0: number; y0: number; x1: number; y1: number } {
  const rad = ((angleDeg % 360) * Math.PI) / 180;
  const vx = Math.sin(rad);
  const vy = -Math.cos(rad);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const points: Array<{ x: number; y: number; t: number }> = [];

  const pushIfValid = (t: number) => {
    if (!Number.isFinite(t)) return;
    const px = cx + t * vx;
    const py = cy + t * vy;
    if (px >= x - 1e-6 && px <= x + w + 1e-6 && py >= y - 1e-6 && py <= y + h + 1e-6) {
      points.push({ x: px, y: py, t });
    }
  };

  if (vx !== 0) {
    pushIfValid((x - cx) / vx);
    pushIfValid((x + w - cx) / vx);
  }
  if (vy !== 0) {
    pushIfValid((y - cy) / vy);
    pushIfValid((y + h - cy) / vy);
  }

  if (points.length < 2) {
    return { x0: x, y0: y + h / 2, x1: x + w, y1: y + h / 2 };
  }

  points.sort((a, b) => a.t - b.t);
  return { x0: points[0]!.x, y0: points[0]!.y, x1: points[points.length - 1]!.x, y1: points[points.length - 1]!.y };
}

function parseCSSGradient(input: string): Exclude<GradientStyle, string> | null {
  const s = input.trim();
  const open = s.indexOf('(');
  const close = s.lastIndexOf(')');
  if (open <= 0 || close <= open) return null;
  const fn = s.slice(0, open).trim();
  const body = s.slice(open + 1, close).trim();
  const parts = splitTopLevel(body, ',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  if (fn === 'linear-gradient') return parseLinearGradientParts(parts);
  if (fn === 'radial-gradient') return parseRadialGradientParts(parts);
  return null;
}

function parseLinearGradientParts(parts: string[]): LinearGradientStyle | null {
  let i = 0;
  let angle: number | undefined;
  const first = parts[0]!;
  const maybeAngle = parseAngle(first);
  if (maybeAngle !== null) {
    angle = maybeAngle;
    i = 1;
  } else if (first.startsWith('to ')) {
    angle = directionToAngle(first);
    i = 1;
  }
  const stops = parts.slice(i).map(parseColorStop).filter((x): x is { color: string; offset?: number } => !!x);
  if (!stops.length) return null;
  const norm = normalizeStops(stops.map((s) => ({ color: s.color, offset: s.offset ?? Number.NaN })) as GradientStop[]);
  return {
    type: 'linear',
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
    colors: norm,
    ...(angle === undefined ? {} : { angle }),
  };
}

function parseRadialGradientParts(parts: string[]): RadialGradientStyle | null {
  let i = 0;
  let center: { x: number; y: number } | undefined;
  const first = parts[0]!;
  if (first.includes('at ')) {
    const m = first.split(/\bat\s+/);
    const at = m[1]?.trim();
    if (at) {
      center = parsePositionPair(at);
      i = 1;
    }
  } else if (first === 'circle' || first === 'ellipse') {
    i = 1;
  }

  const stops = parts.slice(i).map(parseColorStop).filter((x): x is { color: string; offset?: number } => !!x);
  if (!stops.length) return null;
  const norm = normalizeStops(stops.map((s) => ({ color: s.color, offset: s.offset ?? Number.NaN })) as GradientStop[]);
  return { type: 'radial', center: center ?? { x: 0.5, y: 0.5 }, colors: norm };
}

function parseAngle(token: string): number | null {
  const t = token.trim().toLowerCase();
  const m = /^(-?\d+(?:\.\d+)?)deg$/.exec(t);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function directionToAngle(dir: string): number {
  const t = dir.trim().toLowerCase();
  if (t === 'to top') return 0;
  if (t === 'to right') return 90;
  if (t === 'to bottom') return 180;
  if (t === 'to left') return 270;
  if (t === 'to top right' || t === 'to right top') return 45;
  if (t === 'to bottom right' || t === 'to right bottom') return 135;
  if (t === 'to bottom left' || t === 'to left bottom') return 225;
  if (t === 'to top left' || t === 'to left top') return 315;
  return 90;
}

function parseColorStop(token: string): { color: string; offset?: number } | null {
  const t = token.trim();
  if (!t) return null;
  const m = /(.+?)\s+(-?\d+(?:\.\d+)?%)(?:\s+.*)?$/.exec(t);
  if (m) {
    const color = m[1]!.trim();
    const pct = Number.parseFloat(m[2]!);
    if (Number.isFinite(pct)) return { color, offset: pct / 100 };
    return { color };
  }
  return { color: t };
}

function parsePositionPair(token: string): { x: number; y: number } | undefined {
  const parts = token.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!parts.length) return undefined;

  const parsePos = (p: string, axis: 'x' | 'y'): number | undefined => {
    if (p.endsWith('%')) {
      const n = Number.parseFloat(p.slice(0, -1));
      return Number.isFinite(n) ? clamp01(n / 100) : undefined;
    }
    if (p === 'center') return 0.5;
    if (axis === 'x') {
      if (p === 'left') return 0;
      if (p === 'right') return 1;
    } else {
      if (p === 'top') return 0;
      if (p === 'bottom') return 1;
    }
    return undefined;
  };

  const px = parsePos(parts[0]!, 'x');
  const py = parts.length > 1 ? parsePos(parts[1]!, 'y') : undefined;
  if (px === undefined && py === undefined) return undefined;
  return { x: px ?? 0.5, y: py ?? 0.5 };
}

function splitTopLevel(input: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]!;
    if (ch === '(') depth += 1;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && ch === sep) {
      out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current) out.push(current);
  return out;
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

const SCROLLBAR_SIZE = 6;
const SCROLLBAR_RADIUS = 3;
const SCROLLBAR_PADDING = 4;
const SCROLLBAR_MIN_THUMB = 16;

function drawScrollViewScrollbar(
  ctx: CanvasRenderingContext2D,
  node: CanvasNode,
  scrollState: {
    offsetX: number;
    offsetY: number;
    contentWidth: number;
    contentHeight: number;
    viewportWidth: number;
    viewportHeight: number;
  },
  opacity = 1
): void {
  const { left, top, width, height } = node.computedLayout;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = 'rgba(107, 114, 128, 0.45)';

  if (scrollState.contentHeight > scrollState.viewportHeight) {
    const trackHeight = height - SCROLLBAR_PADDING * 2;
    const ratio = scrollState.viewportHeight / scrollState.contentHeight;
    const thumbHeight = Math.max(trackHeight * ratio, SCROLLBAR_MIN_THUMB);
    const maxScroll = scrollState.contentHeight - scrollState.viewportHeight;
    const scrollRatio = maxScroll > 0 ? scrollState.offsetY / maxScroll : 0;
    const thumbX = left + width - SCROLLBAR_SIZE - SCROLLBAR_PADDING;
    const thumbY = top + SCROLLBAR_PADDING + scrollRatio * (trackHeight - thumbHeight);
    drawRoundedRect(ctx, thumbX, thumbY, SCROLLBAR_SIZE, thumbHeight, SCROLLBAR_RADIUS);
    ctx.fill();
  }

  if (scrollState.contentWidth > scrollState.viewportWidth) {
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

export function getRotationHandlePosition(node: CanvasNode) {
  const { left, top, width } = node.computedLayout;
  return {
    x: left + width / 2,
    y: top - ROTATION_HANDLE_OFFSET,
  };
}
