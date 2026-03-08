import type { NodeTree, CanvasContextLike, CanvasImageLike, CanvasNode, VisualStyle, TextProps, ImageProps } from '../types';
import type { ScrollManager } from '../scroll/ScrollManager';
import { drawBox, drawRoundedRect } from './painters/BoxPainter';
import { drawText } from './painters/TextPainter';
import { drawImage } from './painters/ImagePainter';
import { drawScrollViewScrollbar } from './painters/ScrollViewPainter';

export type NodeRenderOverride = {
  visualStyle?: Partial<VisualStyle>;
  textProps?: Partial<TextProps>;
  imageProps?: Partial<ImageProps>;
};

export interface RendererOptions {
  /** Callback to retrieve a loaded image from the cache. */
  getImage: (src: string) => CanvasImageLike | null;
  /** Optional scroll manager for real ScrollView support. */
  scrollManager?: ScrollManager;
  getNodeOverride?: (nodeId: string, node: CanvasNode) => NodeRenderOverride | null;
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
  renderNode(ctx, tree, tree.rootId, options, 1);
}

function renderNode(
  ctx: CanvasContextLike,
  tree: NodeTree,
  nodeId: string,
  options: RendererOptions,
  parentAlpha: number,
): void {
  const node = tree.nodes[nodeId];
  if (!node) return;

  const override = options.getNodeOverride?.(nodeId, node) ?? null;
  const visualStyle = override?.visualStyle ? { ...node.visualStyle, ...override.visualStyle } : node.visualStyle;
  const textProps =
    node.type === 'text' && node.textProps
      ? (override?.textProps ? { ...node.textProps, ...override.textProps } : node.textProps)
      : node.textProps;
  const imageProps =
    node.type === 'image' && node.imageProps
      ? (override?.imageProps ? { ...node.imageProps, ...override.imageProps } : node.imageProps)
      : node.imageProps;

  const { opacity, translateX, translateY, scaleX, scaleY, rotate } = visualStyle;
  const { left, top, width, height } = node.computedLayout;

  ctx.save();
  const nextAlpha = (Number.isFinite(opacity) ? opacity : 1) * parentAlpha;
  ctx.setGlobalAlpha(nextAlpha);

  if (
    (translateX && translateX !== 0)
    || (translateY && translateY !== 0)
    || (scaleX && scaleX !== 1)
    || (scaleY && scaleY !== 1)
    || (rotate && rotate !== 0)
  ) {
    const cx = left + width / 2;
    const cy = top + height / 2;
    ctx.translate(cx, cy);
    if (translateX || translateY) ctx.translate(translateX ?? 0, translateY ?? 0);
    if ((scaleX && scaleX !== 1) || (scaleY && scaleY !== 1)) ctx.scale(scaleX ?? 1, scaleY ?? 1);
    if (rotate && rotate !== 0) ctx.rotate((rotate * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  const effectiveNode: CanvasNode = {
    ...node,
    visualStyle: visualStyle as CanvasNode['visualStyle'],
    ...(textProps ? { textProps } : {}),
    ...(imageProps ? { imageProps } : {}),
  };

  drawBox(ctx, effectiveNode);

  switch (effectiveNode.type) {
    case 'text':
      drawText(ctx, effectiveNode);
      break;
    case 'image':
      drawImage(ctx, effectiveNode, options.getImage);
      break;
    default:
      break;
  }

  // Draw children
  if (effectiveNode.type === 'scrollview') {
    const scrollOffset = options.scrollManager?.getOffset(nodeId) ?? { x: 0, y: 0 };
    const orderedChildren = getOrderedChildren(tree, effectiveNode);

    // Clip to ScrollView viewport and translate by scroll offset
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, width, height);
    ctx.clip();
    ctx.translate(-scrollOffset.x, -scrollOffset.y);
    for (const childId of orderedChildren) {
      renderNode(ctx, tree, childId, options, nextAlpha);
    }
    ctx.restore();

    // Draw scrollbar on top (not affected by scroll translate)
    if (options.scrollManager) {
      const visibility = effectiveNode.scrollViewProps?.scrollBarVisibility ?? 'auto';
      if (visibility !== 'hidden') {
        const opacity = visibility === 'always' ? 1 : options.scrollManager.getScrollBarOpacity(nodeId);
        drawScrollViewScrollbar(ctx, effectiveNode, options.scrollManager.getState(nodeId), opacity);
      }
    }
  } else {
    const orderedChildren = getOrderedChildren(tree, effectiveNode);
    if (effectiveNode.type === 'view' && effectiveNode.flexStyle.overflow === 'hidden') {
      ctx.save();
      ctx.beginPath();
      if (visualStyle.borderRadius > 0) {
        drawRoundedRect(ctx, left, top, width, height, visualStyle.borderRadius);
      } else {
        ctx.rect(left, top, width, height);
      }
      ctx.clip();
      for (const childId of orderedChildren) {
        renderNode(ctx, tree, childId, options, nextAlpha);
      }
      ctx.restore();
    } else {
      for (const childId of orderedChildren) {
        renderNode(ctx, tree, childId, options, nextAlpha);
      }
    }
  }

  ctx.restore();
}

function getOrderedChildren(tree: NodeTree, node: NodeTree['nodes'][string]): string[] {
  if (node.children.length <= 1) return node.children;
  return node.children
    .map((id, index) => ({ id, index }))
    .sort((a, b) => {
      const nodeA = tree.nodes[a.id];
      const nodeB = tree.nodes[b.id];
      const zA = nodeA?.visualStyle?.zIndex ?? 0;
      const zB = nodeB?.visualStyle?.zIndex ?? 0;
      if (zA !== zB) return zA - zB;
      return a.index - b.index;
    })
    .map((item) => item.id);
}
