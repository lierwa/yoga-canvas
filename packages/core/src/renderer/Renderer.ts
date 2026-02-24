import type { NodeTree, CanvasContextLike, CanvasImageLike } from '../types';
import type { ScrollManager } from '../scroll/ScrollManager';
import { drawBox } from './painters/BoxPainter';
import { drawText } from './painters/TextPainter';
import { drawImage } from './painters/ImagePainter';
import { drawScrollViewScrollbar } from './painters/ScrollViewPainter';

export interface RendererOptions {
  /** Callback to retrieve a loaded image from the cache. */
  getImage: (src: string) => CanvasImageLike | null;
  /** Optional scroll manager for real ScrollView support. */
  scrollManager?: ScrollManager;
}

/**
 * Render the full node tree onto a canvas context.
 */
export function renderTree(
  ctx: CanvasContextLike,
  tree: NodeTree,
  canvasWidth: number,
  canvasHeight: number,
  options: RendererOptions,
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  renderNode(ctx, tree, tree.rootId, options);
}

function renderNode(
  ctx: CanvasContextLike,
  tree: NodeTree,
  nodeId: string,
  options: RendererOptions,
): void {
  const node = tree.nodes[nodeId];
  if (!node) return;

  const { opacity, rotate } = node.visualStyle;
  const { left, top, width, height } = node.computedLayout;

  ctx.save();
  ctx.setGlobalAlpha(opacity);

  // Apply rotation around node center
  if (rotate && rotate !== 0) {
    const cx = left + width / 2;
    const cy = top + height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  // Draw background + border (common to all node types)
  drawBox(ctx, node);

  // Draw type-specific content
  switch (node.type) {
    case 'text':
      drawText(ctx, node);
      break;
    case 'image':
      drawImage(ctx, node, options.getImage);
      break;
    default:
      break;
  }

  ctx.restore();

  // Draw children
  if (node.type === 'scrollview') {
    const scrollOffset = options.scrollManager?.getOffset(nodeId) ?? { x: 0, y: 0 };

    // Clip to ScrollView viewport and translate by scroll offset
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, width, height);
    ctx.clip();
    ctx.translate(-scrollOffset.x, -scrollOffset.y);
    for (const childId of node.children) {
      renderNode(ctx, tree, childId, options);
    }
    ctx.restore();

    // Draw scrollbar on top (not affected by scroll translate)
    if (options.scrollManager) {
      const visibility = node.scrollViewProps?.scrollBarVisibility ?? 'auto';
      if (visibility !== 'hidden') {
        const opacity = visibility === 'always' ? 1 : options.scrollManager.getScrollBarOpacity(nodeId);
        drawScrollViewScrollbar(ctx, node, options.scrollManager.getState(nodeId), opacity);
      }
    }
  } else {
    for (const childId of node.children) {
      renderNode(ctx, tree, childId, options);
    }
  }
}
