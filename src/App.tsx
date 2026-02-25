import React, { useCallback, useEffect, useRef, useState } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import LeftPanel from './components/LeftPanel';
import PropertiesPanel from './components/PropertiesPanel';
import PreviewModal from './components/PreviewModal';
import { useNodeTree } from './hooks/useNodeTree';
import { useCanvasInteraction } from './hooks/useCanvasInteraction';

function App() {
  const {
    tree,
    ready,
    canUndo,
    canRedo,
    scrollManager,
    undo,
    redo,
    updateNodeFlexStyle,
    updateNodeVisualStyle,
    updateTextProps,
    addNodeByType,
    deleteNode,
    moveNode,
    resizeNode,
    rotateNodeLive,
    commitLiveUpdate,
    updateImageProps,
    updateCanvasContainer,
  } = useNodeTree();

  const {
    selection,
    scale,
    offset,
    scrollTick,
    selectNode,
    focusNode,
    setScaleAt,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    handleWheel,
  } = useCanvasInteraction(tree, resizeNode, rotateNodeLive, moveNode, commitLiveUpdate, scrollManager);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const selectedNode = selection.selectedNodeId ? tree.nodes[selection.selectedNodeId] ?? null : null;

  const handleFocusNode = useCallback(() => {
    if (!selection.selectedNodeId) return;
    const el = canvasContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    focusNode(selection.selectedNodeId, rect.width, rect.height);
  }, [selection.selectedNodeId, focusNode]);

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const parentId = tree.nodes[nodeId]?.parentId;
      deleteNode(nodeId);
      selectNode(parentId ?? null);
    },
    [tree.nodes, deleteNode, selectNode]
  );

  const handleScaleChange = useCallback(
    (nextScale: number) => {
      const el = canvasContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setScaleAt(nextScale, rect.width / 2, rect.height / 2);
    },
    [setScaleAt],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection.selectedNodeId && selection.selectedNodeId !== tree.rootId) {
          handleDeleteNode(selection.selectedNodeId);
        }
      }
      if (e.key === 'Escape') {
        selectNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selection.selectedNodeId, tree.rootId, handleDeleteNode, selectNode]);

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading Yoga Layout Engine...</p>
        </div>
      </div>
    );
  }

  if (showPreview) {
    return <PreviewModal tree={tree} onClose={() => setShowPreview(false)} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Toolbar
        canUndo={canUndo}
        canRedo={canRedo}
        scale={scale}
        initialScale={1}
        onScaleChange={handleScaleChange}
        onUndo={undo}
        onRedo={redo}
        onPreview={() => setShowPreview(true)}
      />
      <ResizablePanels
        left={
          <LeftPanel
            tree={tree}
            selectedNodeId={selection.selectedNodeId}
            onAddNode={addNodeByType}
            onUpdateContainer={updateCanvasContainer}
            onSelectNode={selectNode}
            onDeleteNode={handleDeleteNode}
            onMoveNode={moveNode}
          />
        }
        center={
          <div ref={canvasContainerRef} className="flex-1 overflow-hidden">
            <Canvas
              tree={tree}
              selection={selection}
              scale={scale}
              offset={offset}
              scrollManager={scrollManager}
              renderTick={scrollTick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onWheel={handleWheel}
              onDoubleClick={handleDoubleClick}
              onFocusNode={handleFocusNode}
            />
          </div>
        }
        right={
          <PropertiesPanel
            node={selectedNode}
            onUpdateFlexStyle={updateNodeFlexStyle}
            onUpdateVisualStyle={updateNodeVisualStyle}
            onUpdateTextProps={updateTextProps}
            onUpdateImageProps={updateImageProps}
          />
        }
        defaultLeftWidth={240}
        defaultRightWidth={320}
        minWidth={200}
      />
    </div>
  );
}

export default App

function ResizablePanels({
  left,
  center,
  right,
  defaultLeftWidth = 384,
  defaultRightWidth = 288,
  minWidth = 180,
}: {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  defaultLeftWidth?: number;
  defaultRightWidth?: number;
  minWidth?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const dragging = useRef<'left' | 'right' | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback(
    (side: 'left' | 'right') => (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = side;
      startX.current = e.clientX;
      startWidth.current = side === 'left' ? leftWidth : rightWidth;
    },
    [leftWidth, rightWidth],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const delta = e.clientX - startX.current;

      if (dragging.current === 'left') {
        const newLeft = Math.max(
          minWidth,
          Math.min(startWidth.current + delta, containerWidth - rightWidth - minWidth),
        );
        setLeftWidth(newLeft);
      } else {
        const newRight = Math.max(
          minWidth,
          Math.min(startWidth.current - delta, containerWidth - leftWidth - minWidth),
        );
        setRightWidth(newRight);
      }
    };

    const onMouseUp = () => {
      dragging.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [leftWidth, rightWidth, minWidth]);

  return (
    <div ref={containerRef} className="flex-1 flex overflow-hidden">
      <div style={{ width: leftWidth, minWidth }} className="flex flex-col shrink-0 overflow-hidden">
        {left}
      </div>

      <div
        className="w-1 bg-gray-200 hover:bg-indigo-400 cursor-col-resize transition-colors shrink-0 relative group"
        onMouseDown={onMouseDown('left')}
      >
        <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-indigo-400/20" />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {center}
      </div>

      <div
        className="w-1 bg-gray-200 hover:bg-indigo-400 cursor-col-resize transition-colors shrink-0 relative group"
        onMouseDown={onMouseDown('right')}
      >
        <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-indigo-400/20" />
      </div>

      <div
        style={{ width: rightWidth, minWidth }}
        className="flex flex-col shrink-0 overflow-hidden min-w-0"
      >
        {right}
      </div>
    </div>
  );
}
