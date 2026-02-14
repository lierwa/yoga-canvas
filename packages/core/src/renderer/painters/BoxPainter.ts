import type { CanvasNode, CanvasContextLike } from '../../types';

export function drawBox(ctx: CanvasContextLike, node: CanvasNode): void {
  const { left, top, width, height } = node.computedLayout;
  const { backgroundColor, borderColor, borderWidth, borderRadius } = node.visualStyle;

  // Draw background
  if (backgroundColor && backgroundColor !== 'transparent') {
    ctx.setFillStyle(backgroundColor);
    if (borderRadius > 0) {
      drawRoundedRect(ctx, left, top, width, height, borderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(left, top, width, height);
    }
  }

  // Draw border
  if (borderWidth > 0 && borderColor && borderColor !== 'transparent') {
    ctx.setStrokeStyle(borderColor);
    ctx.setLineWidth(borderWidth);
    if (borderRadius > 0) {
      drawRoundedRect(ctx, left, top, width, height, borderRadius);
      ctx.stroke();
    } else {
      ctx.strokeRect(left, top, width, height);
    }
  }
}

export function drawRoundedRect(
  ctx: CanvasContextLike,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
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
