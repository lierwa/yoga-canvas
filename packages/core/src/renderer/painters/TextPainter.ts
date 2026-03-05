import type { CanvasNode, CanvasContextLike, FlexValue } from '../../types';
import { clampWrappedLines, ellipsizeToWidth, normalizeLineClamp, wrapText } from '../../text/textLayout';

function flexValueToPx(value: FlexValue | undefined, fallback = 0): number {
  if (value === undefined || value === 'auto') return fallback;
  if (typeof value === 'number') return value;
  return fallback;
}

export function drawText(ctx: CanvasContextLike, node: CanvasNode): void {
  if (!node.textProps) return;

  const { left, top, width } = node.computedLayout;
  const { content, fontSize, fontWeight, fontStyle, fontFamily, color, lineHeight, textAlign, whiteSpace, lineClamp, textShadow } = node.textProps;

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

  ctx.beginPath();
  ctx.rect(left, top, width, node.computedLayout.height);
  ctx.clip();

  const lineH = fontSize * lineHeight;
  const halfLeading = (lineH - fontSize) / 2;
  let y = top + padTop + halfLeading;

  let textX = left + pad;
  if (textAlign === 'center') textX = left + width / 2;
  else if (textAlign === 'right') textX = left + width - padRight;

  const normalizedClamp = normalizeLineClamp(lineClamp);
  const rawLines =
    whiteSpace === 'nowrap'
      ? [normalizedClamp ? ellipsizeToWidth(ctx, content.replace(/\n/g, ' '), maxWidth) : content.replace(/\n/g, ' ')]
      : wrapText(ctx, content, maxWidth);
  const displayedLines =
    normalizedClamp && whiteSpace !== 'nowrap'
      ? clampWrappedLines(ctx, rawLines, normalizedClamp, maxWidth, content.includes(' ') ? ' ' : '')
      : rawLines;

  for (const line of displayedLines) {
    ctx.fillText(line, textX, y);
    y += lineH;
  }

  ctx.restore();
}
