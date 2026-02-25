import type { CanvasNode, CanvasContextLike, FlexValue } from '../../types';

function flexValueToPx(value: FlexValue | undefined, fallback = 0): number {
  if (value === undefined || value === 'auto') return fallback;
  if (typeof value === 'number') return value;
  return fallback;
}

export function drawText(ctx: CanvasContextLike, node: CanvasNode): void {
  if (!node.textProps) return;

  const { left, top, width } = node.computedLayout;
  const { content, fontSize, fontWeight, fontStyle, fontFamily, color, lineHeight, textAlign, whiteSpace, textShadow } = node.textProps;

  const pad = flexValueToPx(node.flexStyle.paddingLeft);
  const padRight = flexValueToPx(node.flexStyle.paddingRight);
  const padTop = flexValueToPx(node.flexStyle.paddingTop);
  const maxWidth = width - pad - padRight;
  if (maxWidth <= 0) return;

  ctx.save();
  ctx.setFillStyle(color);
  const weightPart = typeof fontWeight === 'number' ? `${fontWeight} ` : fontWeight !== 'normal' ? `${fontWeight} ` : '';
  const stylePart = fontStyle && fontStyle !== 'normal' ? `${fontStyle} ` : '';
  ctx.setFont(`${stylePart}${weightPart}${fontSize}px ${fontFamily || 'sans-serif'}`);
  ctx.setTextBaseline('top');
  ctx.setTextAlign(textAlign);
  if (textShadow) {
    ctx.setShadow(textShadow.color, textShadow.blur, textShadow.offsetX, textShadow.offsetY);
  }

  const lineH = fontSize * lineHeight;
  const halfLeading = (lineH - fontSize) / 2;
  let y = top + padTop + halfLeading;

  let textX = left + pad;
  if (textAlign === 'center') textX = left + width / 2;
  else if (textAlign === 'right') textX = left + width - padRight;

  if (whiteSpace === 'nowrap') {
    ctx.beginPath();
    ctx.rect(left, top, width, node.computedLayout.height);
    ctx.clip();
    const singleLine = content.replace(/\n/g, ' ');
    ctx.fillText(singleLine, textX, y);
    ctx.restore();
    return;
  }

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
        currentLine = '';
        y += lineH;
      }

      if (ctx.measureText(word).width > maxWidth) {
        let chunk = '';
        for (const char of word) {
          const nextChunk = chunk + char;
          if (ctx.measureText(nextChunk).width > maxWidth && chunk) {
            ctx.fillText(chunk, textX, y);
            y += lineH;
            chunk = char;
          } else {
            chunk = nextChunk;
          }
        }
        currentLine = currentLine ? `${currentLine} ${chunk}` : chunk;
      } else {
        const nextLine = currentLine ? `${currentLine} ${word}` : word;
        currentLine = nextLine;
      }
    }
    if (currentLine) {
      ctx.fillText(currentLine, textX, y);
      y += lineH;
    }
  }

  ctx.restore();
}
