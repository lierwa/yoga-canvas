import type { CanvasNode, NodeTree, SelectionState } from '../types';

const HANDLE_SIZE = 8;

export function renderCanvas(
  ctx: CanvasRenderingContext2D,
  tree: NodeTree,
  selection: SelectionState,
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Draw background grid
  drawGrid(ctx, canvasWidth, canvasHeight, scale, offsetX, offsetY);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Render nodes recursively
  renderNode(ctx, tree, tree.rootId, selection);

  ctx.restore();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  offsetX: number,
  offsetY: number
): void {
  const gridSize = 20 * scale;
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 0.5;

  const startX = offsetX % gridSize;
  const startY = offsetY % gridSize;

  for (let x = startX; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = startY; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function renderNode(
  ctx: CanvasRenderingContext2D,
  tree: NodeTree,
  nodeId: string,
  selection: SelectionState
): void {
  const node = tree.nodes[nodeId];
  if (!node) return;

  const { left, top, width, height } = node.computedLayout;
  const { backgroundColor, borderColor, borderWidth, borderRadius, opacity } = node.visualStyle;

  ctx.save();
  ctx.globalAlpha = opacity;

  // Draw background
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    if (borderRadius > 0) {
      drawRoundedRect(ctx, left, top, width, height, borderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(left, top, width, height);
    }
  }

  // Draw border
  if (borderWidth > 0) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    if (borderRadius > 0) {
      drawRoundedRect(ctx, left, top, width, height, borderRadius);
      ctx.stroke();
    } else {
      ctx.strokeRect(left, top, width, height);
    }
  }

  // Draw node name label
  drawNodeLabel(ctx, node);

  ctx.restore();

  // Draw children
  for (const childId of node.children) {
    renderNode(ctx, tree, childId, selection);
  }

  // Draw hover highlight
  if (selection.hoveredNodeId === nodeId && selection.selectedNodeId !== nodeId) {
    ctx.save();
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(left, top, width, height);
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Draw selection
  if (selection.selectedNodeId === nodeId) {
    drawSelection(ctx, node);
  }
}

function drawNodeLabel(ctx: CanvasRenderingContext2D, node: CanvasNode): void {
  const { left, top, width } = node.computedLayout;
  const label = node.name;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.font = '11px Inter, sans-serif';
  ctx.textBaseline = 'top';

  const textWidth = ctx.measureText(label).width;
  if (textWidth < width - 8) {
    ctx.fillText(label, left + 4, top + 4);
  }
  ctx.restore();
}

function drawSelection(ctx: CanvasRenderingContext2D, node: CanvasNode): void {
  const { left, top, width, height } = node.computedLayout;

  ctx.save();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.strokeRect(left, top, width, height);

  // Draw resize handles
  const handles = getResizeHandlePositions(node);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;
  for (const handle of handles) {
    ctx.beginPath();
    ctx.rect(
      handle.x - HANDLE_SIZE / 2,
      handle.y - HANDLE_SIZE / 2,
      HANDLE_SIZE,
      HANDLE_SIZE
    );
    ctx.fill();
    ctx.stroke();
  }

  // Draw dimension label
  const dimLabel = `${Math.round(width)} × ${Math.round(height)}`;
  ctx.fillStyle = '#3b82f6';
  ctx.font = 'bold 10px Inter, sans-serif';
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'center';
  ctx.fillText(dimLabel, left + width / 2, top - 4);

  ctx.restore();
}

export function getResizeHandlePositions(node: CanvasNode) {
  const { left, top, width, height } = node.computedLayout;
  return [
    { position: 'top-left' as const, x: left, y: top },
    { position: 'top-right' as const, x: left + width, y: top },
    { position: 'bottom-left' as const, x: left, y: top + height },
    { position: 'bottom-right' as const, x: left + width, y: top + height },
  ];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
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

export function hitTest(
  tree: NodeTree,
  x: number,
  y: number,
  scale: number,
  offsetX: number,
  offsetY: number
): string | null {
  const canvasX = (x - offsetX) / scale;
  const canvasY = (y - offsetY) / scale;

  return hitTestNode(tree, tree.rootId, canvasX, canvasY);
}

function hitTestNode(
  tree: NodeTree,
  nodeId: string,
  x: number,
  y: number
): string | null {
  const node = tree.nodes[nodeId];
  if (!node) return null;

  // Test children in reverse order (top-most first)
  for (let i = node.children.length - 1; i >= 0; i--) {
    const result = hitTestNode(tree, node.children[i], x, y);
    if (result) return result;
  }

  const { left, top, width, height } = node.computedLayout;
  if (x >= left && x <= left + width && y >= top && y <= top + height) {
    return nodeId;
  }

  return null;
}

export function hitTestResizeHandle(
  node: CanvasNode,
  x: number,
  y: number,
  scale: number,
  offsetX: number,
  offsetY: number
): string | null {
  const canvasX = (x - offsetX) / scale;
  const canvasY = (y - offsetY) / scale;
  const handles = getResizeHandlePositions(node);
  const threshold = (HANDLE_SIZE / 2 + 2) / scale;

  for (const handle of handles) {
    if (
      Math.abs(canvasX - handle.x) <= threshold &&
      Math.abs(canvasY - handle.y) <= threshold
    ) {
      return handle.position;
    }
  }
  return null;
}
