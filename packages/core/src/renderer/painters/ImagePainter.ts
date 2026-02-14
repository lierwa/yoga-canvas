import type { CanvasNode, CanvasContextLike, CanvasImageLike } from '../../types';

/**
 * Draw image content for an image node.
 * The `getImage` callback retrieves a loaded image from the cache.
 */
export function drawImage(
  ctx: CanvasContextLike,
  node: CanvasNode,
  getImage: (src: string) => CanvasImageLike | null,
): void {
  const { left, top, width, height } = node.computedLayout;
  const src = node.imageProps?.src;
  const objectFit = node.imageProps?.objectFit ?? 'cover';

  if (src) {
    const img = getImage(src);
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, top, width, height);
      ctx.clip();

      let dx = left, dy = top, dw = width, dh = height;
      if (objectFit === 'contain' || objectFit === 'cover') {
        const imgRatio = img.width / img.height;
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
  drawImagePlaceholder(ctx, left, top, width, height);
}

function drawImagePlaceholder(
  ctx: CanvasContextLike,
  left: number,
  top: number,
  width: number,
  height: number,
): void {
  ctx.save();
  ctx.setStrokeStyle('#a5b4fc');
  ctx.setLineWidth(1);
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left + width, top + height);
  ctx.moveTo(left + width, top);
  ctx.lineTo(left, top + height);
  ctx.stroke();

  const iconSize = Math.min(32, width * 0.4, height * 0.4);
  const cx = left + width / 2;
  const cy = top + height / 2;
  ctx.setFillStyle('#818cf8');
  ctx.setFont(`${iconSize}px sans-serif`);
  ctx.setTextAlign('center');
  ctx.setTextBaseline('middle');
  ctx.fillText('\u{1F5BC}', cx, cy);
  ctx.restore();
}
