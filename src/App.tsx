import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorCanvas, ResizablePanels, useCanvasInteraction } from '@yoga-canvas/react';
import { Crosshair } from 'lucide-react';
import Toolbar from './components/Toolbar';
import LeftPanel from './components/LeftPanel';
import PropertiesPanel from './components/PropertiesPanel';
import PreviewModal from './components/PreviewModal';
import LiveCodeEditorPanel from './components/LiveCodeEditorPanel';
import { useNodeTree } from './hooks/useNodeTree';

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
    replaceDescriptor,
  } = useNodeTree();

  const {
    selection,
    scale,
    offset,
    scrollTick,
    selectNode,
    focusNode,
    setScaleAt,
    resetView,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    handleWheel,
  } = useCanvasInteraction(tree, resizeNode, rotateNodeLive, moveNode, commitLiveUpdate, scrollManager);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const initialViewRef = useRef<{ scale: number; offset: { x: number; y: number } } | null>(null);
  const didInitViewRef = useRef(false);
  const [viewInitialized, setViewInitialized] = useState(false);

  const selectedNode = selection.selectedNodeId ? tree.nodes[selection.selectedNodeId] ?? null : null;

  const blurActiveFormElement = useCallback(() => {
    const el = document.activeElement;
    if (!el) return;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      (el as HTMLElement).blur();
    }
  }, []);

  const handleCanvasMouseDown = useCallback(
    (e: Parameters<typeof handleMouseDown>[0]) => {
      blurActiveFormElement();
      handleMouseDown(e);
    },
    [blurActiveFormElement, handleMouseDown],
  );

  const handleCanvasDoubleClick = useCallback(
    (e: Parameters<typeof handleDoubleClick>[0]) => {
      blurActiveFormElement();
      handleDoubleClick(e);
    },
    [blurActiveFormElement, handleDoubleClick],
  );

  const handleCanvasWheel = useCallback(
    (e: Parameters<typeof handleWheel>[0]) => {
      blurActiveFormElement();
      handleWheel(e);
    },
    [blurActiveFormElement, handleWheel],
  );

  const handleFocusNode = useCallback(() => {
    if (!selection.selectedNodeId) return;
    const el = canvasContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    focusNode(selection.selectedNodeId, rect.width, rect.height, { animate: true, durationMs: 320 });
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

  const handleResetView = useCallback(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = resetView(rect.width, rect.height, { scale: 1, targetId: tree.rootId, animate: true, durationMs: 260 });
    initialViewRef.current = next;
  }, [resetView, tree.rootId]);

  const canResetView = useMemo(() => {
    const initial = initialViewRef.current;
    if (!initial) return Math.abs(scale - 1) > 0.0005 || Math.abs(offset.x) > 0.5 || Math.abs(offset.y) > 0.5;
    return (
      Math.abs(scale - initial.scale) > 0.0005 ||
      Math.abs(offset.x - initial.offset.x) > 0.5 ||
      Math.abs(offset.y - initial.offset.y) > 0.5
    );
  }, [offset.x, offset.y, scale]);

  useEffect(() => {
    if (didInitViewRef.current) return;
    const el = canvasContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const next = resetView(rect.width, rect.height, { scale: 1, targetId: tree.rootId });
    initialViewRef.current = next;
    didInitViewRef.current = true;
    setViewInitialized(true);
  }, [resetView, tree.rootId, ready]);

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
        canResetView={canResetView}
        onResetView={handleResetView}
        onUndo={undo}
        onRedo={redo}
        onPreview={() => setShowPreview(true)}
        onCodeEditor={() => setShowCodeEditor((v) => !v)}
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
            <div style={{ opacity: viewInitialized ? 1 : 0, transition: 'opacity 120ms' }} className="w-full h-full">
              <EditorCanvas
                tree={tree}
                selection={selection}
                scale={scale}
                offset={offset}
                scrollManager={scrollManager}
                renderTick={scrollTick}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleCanvasWheel}
                onDoubleClick={handleCanvasDoubleClick}
                onFocusNode={handleFocusNode}
                renderFocusAction={(onFocus) => (
                  <button
                    onClick={onFocus}
                    className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5
                      bg-white/90 backdrop-blur border border-gray-200 rounded-lg shadow-sm
                      text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300
                      transition-colors"
                    title="Focus selected node"
                  >
                    <Crosshair size={14} />
                    <span>Locate</span>
                  </button>
                )}
              />
            </div>
          </div>
        }
        rightPanels={[
          <PropertiesPanel
            node={selectedNode}
            onUpdateFlexStyle={updateNodeFlexStyle}
            onUpdateVisualStyle={updateNodeVisualStyle}
            onUpdateTextProps={updateTextProps}
            onUpdateImageProps={updateImageProps}
          />,
          ...(showCodeEditor
            ? [
                <LiveCodeEditorPanel
                  tree={tree}
                  embedded
                  onClose={() => setShowCodeEditor(false)}
                  onDescriptorChange={(descriptor) => {
                    replaceDescriptor(descriptor);
                    selectNode(null);
                  }}
                />,
              ]
            : []),
        ]}
        defaultLeftWidth={240}
        defaultRightWidths={[320, 560]}
        minWidth={200}
      />
    </div>
  );
}

export default App
