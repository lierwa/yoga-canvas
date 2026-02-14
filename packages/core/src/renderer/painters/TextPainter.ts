import type { CanvasNode, CanvasContextLike, FlexValue } from '../../types';

function flexValueToPx(value: FlexValue | undefined, fallback = 0): number {
  if (value === undefined || value === 'auto') return fallback;
  if (typeof value === 'number') return value;
  return fallback;
}

export function drawText(ctx: CanvasContextLike, node: CanvasNode): void {
  if (!node.textProps) return;

  const { left, top, width } = node.computedLayout;
  const { content, fontSize, fontWeight, fontFamily, color, lineHeight, textAlign } = node.textProps;

  const pad = flexValueToPx(node.flexStyle.paddingLeft);
  const padRight = flexValueToPx(node.flexStyle.paddingRight);
  const padTop = flexValueToPx(node.flexStyle.paddingTop);
  const maxWidth = width - pad - padRight;
  if (maxWidth <= 0) return;

  ctx.save();
  ctx.setFillStyle(color);
  ctx.setFont(`${fontWeight === 'bold' ? 'bold ' : ''}${fontSize}px ${fontFamily || 'sans-serif'}`);
  ctx.setTextBaseline('top');
  ctx.setTextAlign(textAlign);

  const lineH = fontSize * lineHeight;
  const halfLeading = (lineH - fontSize) / 2;
  let y = top + padTop + halfLeading;

  let textX = left + pad;
  if (textAlign === 'center') textX = left + width / 2;
  else if (textAlign === 'right') textX = left + width - padRight;

  const lines = content.split('\n');
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
