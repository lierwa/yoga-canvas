import { useCallback, useEffect, useRef, useState } from 'react';
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
    selectNode,
    focusNode,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    handleWheel,
  } = useCanvasInteraction(tree, resizeNode, rotateNodeLive, moveNode, commitLiveUpdate);

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

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Toolbar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onPreview={() => setShowPreview(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel
          tree={tree}
          selectedNodeId={selection.selectedNodeId}
          onAddNode={addNodeByType}
          onUpdateContainer={updateCanvasContainer}
          onSelectNode={selectNode}
          onDeleteNode={handleDeleteNode}
          onMoveNode={moveNode}
        />
        <div ref={canvasContainerRef} className="flex-1 overflow-hidden">
          <Canvas
            tree={tree}
            selection={selection}
            scale={scale}
            offset={offset}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onDoubleClick={handleDoubleClick}
            onFocusNode={handleFocusNode}
          />
        </div>
        <PropertiesPanel
          node={selectedNode}
          onUpdateFlexStyle={updateNodeFlexStyle}
          onUpdateVisualStyle={updateNodeVisualStyle}
          onUpdateTextProps={updateTextProps}
          onUpdateImageProps={updateImageProps}
        />
      </div>
      {showPreview && <PreviewModal tree={tree} onClose={() => setShowPreview(false)} />}
    </div>
  );
}

export default App
