import type { CanvasNode, CanvasContextLike } from '../../types';

export function drawBox(ctx: CanvasContextLike, node: CanvasNode): void {
  const { left, top, width, height } = node.computedLayout;
  const { backgroundColor, linearGradient, borderColor, borderWidth, borderRadius, boxShadow } = node.visualStyle;

  if (boxShadow) {
    const spread = boxShadow.spread ?? 0;
    ctx.save();
    // ctx.setFillStyle("rgba(0, 0, 0, 0)");
    ctx.setShadow(boxShadow.color, boxShadow.blur, boxShadow.offsetX, boxShadow.offsetY);
    const shadowLeft = left - spread;
    const shadowTop = top - spread;
    const shadowWidth = width + spread * 2;
    const shadowHeight = height + spread * 2;
    if (borderRadius > 0) {
      drawRoundedRect(ctx, shadowLeft, shadowTop, shadowWidth, shadowHeight, borderRadius + spread);
      ctx.fill();
    } else {
      ctx.fillRect(shadowLeft, shadowTop, shadowWidth, shadowHeight);
    }
    ctx.restore();
  }

  // Draw background
  if ((backgroundColor && backgroundColor !== 'transparent') || linearGradient) {
    const fillStyle = linearGradient
      ? buildLinearGradient(ctx, left, top, width, height, linearGradient)
      : backgroundColor;
    if (!fillStyle) return;
    ctx.setFillStyle(fillStyle);
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

function buildLinearGradient(
  ctx: CanvasContextLike,
  left: number,
  top: number,
  width: number,
  height: number,
  gradient: NonNullable<CanvasNode['visualStyle']['linearGradient']>,
): ReturnType<CanvasContextLike['createLinearGradient']> | null {
  if (!gradient || gradient.colors.length === 0) return null;
  const x0 = left + gradient.start.x * width;
  const y0 = top + gradient.start.y * height;
  const x1 = left + gradient.end.x * width;
  const y1 = top + gradient.end.y * height;
  const canvasGradient = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const stop of gradient.colors) {
    canvasGradient.addColorStop(stop.offset, stop.color);
  }
  return canvasGradient;
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
