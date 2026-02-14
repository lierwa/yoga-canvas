import type { CanvasNode, CanvasContextLike } from '../../types';
import type { ScrollState } from '../../scroll/ScrollManager';

const SCROLLBAR_SIZE = 4;
const SCROLLBAR_MIN_THUMB = 20;
const SCROLLBAR_PADDING = 2;
const SCROLLBAR_COLOR = 'rgba(0, 0, 0, 0.25)';
const SCROLLBAR_RADIUS = 2;

/**
 * Draw real scrollbar thumbs based on scroll state.
 */
export function drawScrollViewScrollbar(
  ctx: CanvasContextLike,
  node: CanvasNode,
  scrollState: ScrollState,
): void {
  const { left, top, width, height } = node.computedLayout;
  const isVertical = node.scrollViewProps?.scrollDirection !== 'horizontal';

  ctx.save();

  if (isVertical && scrollState.contentHeight > scrollState.viewportHeight) {
    // Vertical scrollbar on the right edge
    const trackHeight = height - SCROLLBAR_PADDING * 2;
    const ratio = scrollState.viewportHeight / scrollState.contentHeight;
    const thumbHeight = Math.max(trackHeight * ratio, SCROLLBAR_MIN_THUMB);
    const maxScroll = scrollState.contentHeight - scrollState.viewportHeight;
    const scrollRatio = maxScroll > 0 ? scrollState.offsetY / maxScroll : 0;
    const thumbY = top + SCROLLBAR_PADDING + scrollRatio * (trackHeight - thumbHeight);
    const thumbX = left + width - SCROLLBAR_SIZE - SCROLLBAR_PADDING;

    drawRoundedBar(ctx, thumbX, thumbY, SCROLLBAR_SIZE, thumbHeight, SCROLLBAR_RADIUS);
  }

  if (!isVertical && scrollState.contentWidth > scrollState.viewportWidth) {
    // Horizontal scrollbar on the bottom edge
    const trackWidth = width - SCROLLBAR_PADDING * 2;
    const ratio = scrollState.viewportWidth / scrollState.contentWidth;
    const thumbWidth = Math.max(trackWidth * ratio, SCROLLBAR_MIN_THUMB);
    const maxScroll = scrollState.contentWidth - scrollState.viewportWidth;
    const scrollRatio = maxScroll > 0 ? scrollState.offsetX / maxScroll : 0;
    const thumbX = left + SCROLLBAR_PADDING + scrollRatio * (trackWidth - thumbWidth);
    const thumbY = top + height - SCROLLBAR_SIZE - SCROLLBAR_PADDING;

    drawRoundedBar(ctx, thumbX, thumbY, thumbWidth, SCROLLBAR_SIZE, SCROLLBAR_RADIUS);
  }

  ctx.restore();
}

function drawRoundedBar(
  ctx: CanvasContextLike,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  r = Math.min(r, w / 2, h / 2);
  ctx.setFillStyle(SCROLLBAR_COLOR);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}
