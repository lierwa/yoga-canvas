import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { NodeTree, CanvasNode } from '../types';
import {
  computeScrollContentSizes,
  createYogaCanvas,
  exportToDOMString,
  exportToJSON,
  type ScrollManager,
  type YogaCanvas,
} from '@yoga-canvas/core';
import { buildJSXFromTree, formatHTMLString } from './preview-modal/codegen';
import { ImagePreviewModal } from './preview-modal/ImagePreviewModal';
import { PreviewCanvasPanel } from './preview-modal/PreviewCanvasPanel';
import { PreviewCodePanel } from './preview-modal/PreviewCodePanel';
import { PreviewInspectorPanel } from './preview-modal/PreviewInspectorPanel';
import { PreviewTopBar } from './preview-modal/PreviewTopBar';
import { ResizablePanels } from './preview-modal/ResizablePanels';

interface PreviewModalProps {
  tree: NodeTree;
  onClose: () => void;
}

export default function PreviewModal({ tree, onClose }: PreviewModalProps) {
  const rootFromProp = tree.nodes[tree.rootId] ?? null;
  const rootWidth = typeof rootFromProp?.computedLayout.width === 'number' ? rootFromProp.computedLayout.width : 375;
  const rootHeight = typeof rootFromProp?.computedLayout.height === 'number' ? rootFromProp.computedLayout.height : 667;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const canvasFrameRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<YogaCanvas | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [previewTree, setPreviewTree] = useState<NodeTree>(tree);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState(1);

  const [activeTab, setActiveTab] = useState<'typescript' | 'json' | 'html'>('typescript');
  const [jsxPropsMode, setJsxPropsMode] = useState<'style' | 'className'>('style');

  const loadTreeIntoEngine = useCallback(
    (inst: YogaCanvas) => {
      const json = exportToJSON(tree);
      inst.loadJSON(json);
      computeScrollContentSizes(inst.getNodeTree(), inst.getScrollManager());
      inst.render();
    },
    [tree],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.style.width = `${rootWidth}px`;
    canvas.style.height = `${rootHeight}px`;

    const inst = createYogaCanvas(
      canvas,
      { type: 'view', name: 'Root', style: { width: rootWidth, height: rootHeight } },
      { platform: 'h5', width: rootWidth, height: rootHeight, pixelRatio: window.devicePixelRatio || 1 },
    );
    instanceRef.current = inst;
    let disposed = false;
    const handleRender = () => {
      setPreviewTree(inst.getNodeTree());
    };
    inst.on('render', handleRender);

    inst.init().then(() => {
      if (disposed) return;
      loadTreeIntoEngine(inst);
      setPreviewTree(inst.getNodeTree());
      setEngineReady(true);
    });

    return () => {
      disposed = true;
      setEngineReady(false);
      inst.off('render', handleRender);
      inst.destroy();
      instanceRef.current = null;
    };
  }, [rootWidth, rootHeight, loadTreeIntoEngine]);

  useEffect(() => {
    if (!engineReady) return;
    const inst = instanceRef.current;
    if (!inst) return;
    loadTreeIntoEngine(inst);
    setPreviewTree(inst.getNodeTree());
    setSelectedNodeId(null);
  }, [engineReady, loadTreeIntoEngine]);

  const handleExportImage = useCallback(async () => {
    const inst = instanceRef.current;
    if (!inst) return;
    const url = await inst.toDataURL();
    setPreviewImage(url);
  }, []);

  const root = previewTree.nodes[previewTree.rootId] ?? null;

  const codeContent = useMemo(() => {
    if (activeTab === 'json') return exportToJSON(previewTree);
    if (activeTab === 'html') return formatHTMLString(exportToDOMString(previewTree));
    return buildJSXFromTree(previewTree, jsxPropsMode);
  }, [activeTab, previewTree, jsxPropsMode]);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(codeContent);
  }, [codeContent]);

  const handleCanvasClick = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    const inst = instanceRef.current;
    if (!inst) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / previewScale;
    const y = (e.clientY - rect.top) / previewScale;
    const dispatched = inst.dispatchPointerEvent({ type: 'click', x, y, timeStamp: e.timeStamp });
    setSelectedNodeId(dispatched.targetId);
  }, [previewScale]);

  const locateNode = useCallback((nodeId: string | null) => {
    if (!nodeId) return;
    const inst = instanceRef.current;
    if (!inst) return;
    const treeNow = inst.getNodeTree();
    const scrollManager = inst.getScrollManager();
    if (!treeNow.nodes[nodeId]) return;

    computeScrollContentSizes(treeNow, scrollManager);
    revealNodeInScrollViews(treeNow, nodeId, scrollManager);
    inst.render();

    const container = canvasScrollRef.current;
    const frame = canvasFrameRef.current;
    if (!container || !frame) return;
    const node = treeNow.nodes[nodeId];
    if (!node) return;
    const off = getAncestorScrollOffset(treeNow, nodeId, scrollManager);
    const rect = node.computedLayout;
    const left = rect.left - off.x;
    const top = rect.top - off.y;

    const containerRect = container.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const frameLeft = frameRect.left - containerRect.left + container.scrollLeft;
    const frameTop = frameRect.top - containerRect.top + container.scrollTop;

    scrollRectIntoView(
      container,
      { left: frameLeft + left * previewScale, top: frameTop + top * previewScale, width: rect.width * previewScale, height: rect.height * previewScale },
      40,
    );
  }, [previewScale]);

  const handleSelectFromTree = useCallback((id: string | null) => {
    setSelectedNodeId(id);
    locateNode(id);
  }, [locateNode]);

  const handleDeleteFromTree = useCallback((nodeId: string) => {
    const inst = instanceRef.current;
    if (!inst) return;
    inst.deleteNode(nodeId);
    computeScrollContentSizes(inst.getNodeTree(), inst.getScrollManager());
    inst.render();
    const nextTree = inst.getNodeTree();
    setPreviewTree(nextTree);
    setSelectedNodeId((prev) => (prev && nextTree.nodes[prev] ? prev : null));
  }, []);

  const handleMoveFromTree = useCallback((nodeId: string, newParentId: string, insertIndex?: number) => {
    const inst = instanceRef.current;
    if (!inst) return;
    inst.moveNode(nodeId, newParentId, insertIndex);
    computeScrollContentSizes(inst.getNodeTree(), inst.getScrollManager());
    inst.render();
    setPreviewTree(inst.getNodeTree());
  }, []);

  if (!root) return null;

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100 overflow-hidden">
      <PreviewTopBar
        rootLabel={`${root.name} · ${rootWidth}×${rootHeight}`}
        onBack={onClose}
        onExportImage={handleExportImage}
        exportDisabled={!engineReady}
      />

      <ResizablePanels
        defaultLeftWidth={420}
        defaultRightWidth={320}
        minWidth={220}
        left={(
          <PreviewCodePanel
            activeTab={activeTab}
            onTabChange={setActiveTab}
            jsxPropsMode={jsxPropsMode}
            onJsxPropsModeChange={setJsxPropsMode}
            codeContent={codeContent}
            onCopy={handleCopy}
          />
        )}
        center={(
          <PreviewCanvasPanel
            rootWidth={rootWidth}
            rootHeight={rootHeight}
            canvasScrollRef={canvasScrollRef}
            canvasFrameRef={canvasFrameRef}
            canvasRef={canvasRef}
            onCanvasClick={handleCanvasClick}
            onScaleChange={setPreviewScale}
            previewTree={previewTree}
            selectedNodeId={selectedNodeId}
            scrollManager={instanceRef.current?.getScrollManager() ?? null}
            eventSource={instanceRef.current}
          />
        )}
        right={(
          <PreviewInspectorPanel
            tree={previewTree}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectFromTree}
            onDeleteNode={handleDeleteFromTree}
            onMoveNode={handleMoveFromTree}
          />
        )}
      />

      {previewImage && <ImagePreviewModal url={previewImage} onClose={() => setPreviewImage(null)} />}
    </div>
  );
}

function revealNodeInScrollViews(tree: NodeTree, nodeId: string, scrollManager: ScrollManager): void {
  const pairs: Array<{ scrollViewId: string; childId: string }> = [];
  let currentId: string | null = nodeId;
  while (currentId) {
    const current: CanvasNode | undefined = tree.nodes[currentId];
    if (!current?.parentId) break;
    const parent: CanvasNode | undefined = tree.nodes[current.parentId];
    if (parent?.type === 'scrollview') {
      pairs.push({ scrollViewId: parent.id, childId: currentId });
    }
    currentId = parent?.id ?? null;
  }

  pairs.reverse();

  for (const { scrollViewId, childId } of pairs) {
    const scrollViewNode = tree.nodes[scrollViewId];
    const childNode = tree.nodes[childId];
    if (!scrollViewNode || !childNode) continue;

    const state = scrollManager.getState(scrollViewId);
    const isVertical = scrollViewNode.scrollViewProps?.scrollDirection !== 'horizontal';
    const padding = 12;

    let nextX = state.offsetX;
    let nextY = state.offsetY;

    if (isVertical) {
      const relTop = childNode.computedLayout.top - scrollViewNode.computedLayout.top;
      const relBottom = relTop + childNode.computedLayout.height;
      if (relTop < state.offsetY + padding) nextY = relTop - padding;
      else if (relBottom > state.offsetY + state.viewportHeight - padding) {
        nextY = relBottom + padding - state.viewportHeight;
      }
    } else {
      const relLeft = childNode.computedLayout.left - scrollViewNode.computedLayout.left;
      const relRight = relLeft + childNode.computedLayout.width;
      if (relLeft < state.offsetX + padding) nextX = relLeft - padding;
      else if (relRight > state.offsetX + state.viewportWidth - padding) {
        nextX = relRight + padding - state.viewportWidth;
      }
    }

    if (nextX !== state.offsetX || nextY !== state.offsetY) {
      scrollManager.setOffset(scrollViewId, nextX, nextY);
      scrollManager.showScrollBar(scrollViewId);
    }
  }
}

function getAncestorScrollOffset(tree: NodeTree, nodeId: string, scrollManager: ScrollManager): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let currentId: string | null = nodeId;
  while (currentId) {
    const node: CanvasNode | undefined = tree.nodes[currentId];
    const parentId: string | null = node?.parentId ?? null;
    if (!parentId) break;
    const parent: CanvasNode | undefined = tree.nodes[parentId];
    if (parent?.type === 'scrollview') {
      const off = scrollManager.getOffset(parentId);
      x += off.x;
      y += off.y;
    }
    currentId = parentId;
  }
  return { x, y };
}

function scrollRectIntoView(
  container: HTMLElement,
  rect: { left: number; top: number; width: number; height: number },
  padding = 24,
): void {
  const rectLeft = rect.left;
  const rectTop = rect.top;
  const rectRight = rectLeft + rect.width;
  const rectBottom = rectTop + rect.height;

  let nextLeft = container.scrollLeft;
  let nextTop = container.scrollTop;

  const leftLimit = container.scrollLeft + padding;
  const rightLimit = container.scrollLeft + container.clientWidth - padding;
  const topLimit = container.scrollTop + padding;
  const bottomLimit = container.scrollTop + container.clientHeight - padding;

  if (rectLeft < leftLimit) nextLeft = rectLeft - padding;
  else if (rectRight > rightLimit) nextLeft = rectRight + padding - container.clientWidth;

  if (rectTop < topLimit) nextTop = rectTop - padding;
  else if (rectBottom > bottomLimit) nextTop = rectBottom + padding - container.clientHeight;

  const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth);
  const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);

  nextLeft = Math.min(Math.max(0, nextLeft), maxLeft);
  nextTop = Math.min(Math.max(0, nextTop), maxTop);

  container.scrollTo({ left: nextLeft, top: nextTop, behavior: 'smooth' });
}
