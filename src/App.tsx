import { useCallback, useEffect } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import { useNodeTree } from './hooks/useNodeTree';
import { useCanvasInteraction } from './hooks/useCanvasInteraction';

function App() {
  const {
    tree,
    ready,
    updateNodeFlexStyle,
    addChildNode,
    addContainerNode,
    deleteNode,
    resizeNode,
  } = useNodeTree();

  const {
    selection,
    scale,
    offset,
    selectNode,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
  } = useCanvasInteraction(tree, resizeNode);

  const selectedNode = selection.selectedNodeId ? tree.nodes[selection.selectedNodeId] ?? null : null;
  const isRoot = selection.selectedNodeId === tree.rootId;

  const handleAddChild = useCallback(() => {
    if (selection.selectedNodeId) addChildNode(selection.selectedNodeId);
  }, [selection.selectedNodeId, addChildNode]);

  const handleAddContainer = useCallback(() => {
    if (selection.selectedNodeId) addContainerNode(selection.selectedNodeId);
  }, [selection.selectedNodeId, addContainerNode]);

  const handleDelete = useCallback(() => {
    if (selection.selectedNodeId) {
      const parentId = tree.nodes[selection.selectedNodeId]?.parentId;
      deleteNode(selection.selectedNodeId);
      selectNode(parentId ?? null);
    }
  }, [selection.selectedNodeId, tree.nodes, deleteNode, selectNode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (
          document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'SELECT'
        ) {
          return;
        }
        handleDelete();
      }
      if (e.key === 'Escape') {
        selectNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDelete, selectNode]);

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
        selectedNodeId={selection.selectedNodeId}
        isRoot={isRoot}
        hasChildren={selectedNode ? selectedNode.children.length > 0 : false}
        onAddChild={handleAddChild}
        onAddContainer={handleAddContainer}
        onDelete={handleDelete}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <Canvas
            tree={tree}
            selection={selection}
            scale={scale}
            offset={offset}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
          />
        </div>
        <PropertiesPanel
          node={selectedNode}
          onUpdateFlexStyle={updateNodeFlexStyle}
        />
      </div>
    </div>
  );
}

export default App
