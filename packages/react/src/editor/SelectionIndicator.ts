import type { CanvasNode } from '@yoga-canvas/core';

export type ResizeHandlePosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'mid-top'
  | 'mid-right'
  | 'mid-bottom'
  | 'mid-left';

export type SelectionIndicatorMetrics = {
  strokeWidthWorld: number;
  dashedStrokeWidthWorld: number;
  dashWorld: [number, number];
  handleCornerSizeWorld: number;
  handleMidSizeWorld: number;
  handleHitRadiusWorld: number;
  handleOutsetWorld: number;
  rotationOffsetWorld: number;
  rotationRadiusWorld: number;
  rotationHitRadiusWorld: number;
  rotationLineWidthWorld: number;
  labelFontSizeWorld: number;
  labelGapWorld: number;
  showMidHandles: boolean;
  showLabel: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function getSelectionIndicatorMetrics(node: CanvasNode, scale: number): SelectionIndicatorMetrics {
  const { width, height } = node.computedLayout;
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const screenW = Math.max(0, width * safeScale);
  const screenH = Math.max(0, height * safeScale);
  const minScreen = Math.min(screenW, screenH);

  const baseCornerPx = 8;
  const baseMidPx = 6;
  const cornerScaleFactor = clamp(minScreen / 28, 0.55, 1);
  const midScaleFactor = clamp(minScreen / 28, 0.6, 1);

  const cornerPx = clamp(baseCornerPx * cornerScaleFactor, 4, 10);
  const midPx = clamp(baseMidPx * midScaleFactor, 4, 8);

  const showMidHandles = screenW >= 44 && screenH >= 44;
  const showLabel = screenW >= 64 && screenH >= 28;

  const strokePx = 2;
  const dashedStrokePx = 1.5;
  const dashPx: [number, number] = [4, 4];

  const rotationOffsetPx = minScreen < 36 ? 18 : 24;
  const rotationRadiusPx = 6;
  const rotationHitRadiusPx = 10;
  const rotationLineWidthPx = 1;

  const labelFontPx = minScreen < 44 ? 9 : 10;
  const labelGapPx = 4;

  const handleHitRadiusPx = Math.max(cornerPx, midPx) / 2 + 3;
  const handleOutsetPx = Math.max(cornerPx, midPx) / 2 + 1;

  return {
    strokeWidthWorld: strokePx / safeScale,
    dashedStrokeWidthWorld: dashedStrokePx / safeScale,
    dashWorld: [dashPx[0] / safeScale, dashPx[1] / safeScale],
    handleCornerSizeWorld: cornerPx / safeScale,
    handleMidSizeWorld: midPx / safeScale,
    handleHitRadiusWorld: handleHitRadiusPx / safeScale,
    handleOutsetWorld: handleOutsetPx / safeScale,
    rotationOffsetWorld: rotationOffsetPx / safeScale,
    rotationRadiusWorld: rotationRadiusPx / safeScale,
    rotationHitRadiusWorld: rotationHitRadiusPx / safeScale,
    rotationLineWidthWorld: rotationLineWidthPx / safeScale,
    labelFontSizeWorld: labelFontPx / safeScale,
    labelGapWorld: labelGapPx / safeScale,
    showMidHandles,
    showLabel,
  };
}

export function getResizeHandlePositions(node: CanvasNode, scale: number) {
  const { left, top, width, height } = node.computedLayout;
  const metrics = getSelectionIndicatorMetrics(node, scale);
  const o = metrics.handleOutsetWorld;
  const all = [
    { position: 'top-left' as const, x: left - o, y: top - o },
    { position: 'top-right' as const, x: left + width + o, y: top - o },
    { position: 'bottom-left' as const, x: left - o, y: top + height + o },
    { position: 'bottom-right' as const, x: left + width + o, y: top + height + o },
    { position: 'mid-top' as const, x: left + width / 2, y: top - o },
    { position: 'mid-right' as const, x: left + width + o, y: top + height / 2 },
    { position: 'mid-bottom' as const, x: left + width / 2, y: top + height + o },
    { position: 'mid-left' as const, x: left - o, y: top + height / 2 },
  ];
  if (!metrics.showMidHandles) {
    return all.filter((h) => !h.position.startsWith('mid-'));
  }
  return all;
}

export function getRotationHandlePosition(node: CanvasNode, scale: number) {
  const { left, top, width } = node.computedLayout;
  const metrics = getSelectionIndicatorMetrics(node, scale);
  return {
    x: left + width / 2,
    y: top - metrics.rotationOffsetWorld,
  };
}

export function drawSelectionIndicator(
  ctx: CanvasRenderingContext2D,
  node: CanvasNode,
  args: { dx?: number; dy?: number; scale: number }
): void {
  const dx = args.dx ?? 0;
  const dy = args.dy ?? 0;
  const { left, top, width, height } = node.computedLayout;
  const metrics = getSelectionIndicatorMetrics(node, args.scale);

  ctx.save();

  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = metrics.strokeWidthWorld;
  ctx.strokeRect(left + dx, top + dy, width, height);

  const handles = getResizeHandlePositions(node, args.scale);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = Math.max(metrics.strokeWidthWorld * 0.75, 1 / args.scale);

  for (const handle of handles) {
    const isMid = handle.position.startsWith('mid-');
    const size = isMid ? metrics.handleMidSizeWorld : metrics.handleCornerSizeWorld;
    ctx.beginPath();
    if (isMid) {
      ctx.arc(handle.x + dx, handle.y + dy, size / 2, 0, Math.PI * 2);
    } else {
      ctx.rect(handle.x + dx - size / 2, handle.y + dy - size / 2, size, size);
    }
    ctx.fill();
    ctx.stroke();
  }

  const rot = getRotationHandlePosition(node, args.scale);
  const rotHandleX = rot.x + dx;
  const rotHandleY = rot.y + dy;

  ctx.beginPath();
  ctx.moveTo(rotHandleX, top + dy);
  ctx.lineTo(rotHandleX, rotHandleY);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = metrics.rotationLineWidthWorld;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(rotHandleX, rotHandleY, metrics.rotationRadiusWorld, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = Math.max(metrics.strokeWidthWorld * 0.75, 1 / args.scale);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(rotHandleX, rotHandleY, Math.min(3 / args.scale, metrics.rotationRadiusWorld * 0.6), -Math.PI * 0.8, Math.PI * 0.5);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = Math.max(1.2 / args.scale, metrics.rotationLineWidthWorld);
  ctx.stroke();

  if (metrics.showLabel) {
    const dimLabel = `${Math.round(width)} × ${Math.round(height)}`;
    ctx.fillStyle = '#3b82f6';
    ctx.font = `bold ${metrics.labelFontSizeWorld}px Inter, sans-serif`;
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'center';
    const y = rotHandleY - metrics.rotationRadiusWorld - metrics.labelGapWorld;
    ctx.fillText(dimLabel, left + dx + width / 2, y);
  }

  ctx.restore();
}

