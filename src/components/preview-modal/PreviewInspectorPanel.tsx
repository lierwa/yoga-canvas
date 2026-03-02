import { Box, ChevronDown, ChevronRight, Crosshair, ImageIcon, ScrollText, Trash2, Type } from 'lucide-react';
import { NodeTreePanel } from '@yoga-canvas/react';
import type { CanvasNode, NodeTree } from '../../types';
import { PreviewPropertiesPanel } from './PreviewPropertiesPanel';

export function PreviewInspectorPanel({
  tree,
  selectedNodeId,
  onSelectNode,
  onDeleteNode,
  onMoveNode,
}: {
  tree: NodeTree;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onDeleteNode: (nodeId: string) => void;
  onMoveNode: (nodeId: string, newParentId: string, insertIndex?: number) => void;
}) {
  const selectedNode = selectedNodeId ? tree.nodes[selectedNodeId] ?? null : null;

  return (
    <div className="bg-white flex flex-col h-full">
      <div className="border-b border-gray-200" style={{ maxHeight: '40%' }}>
        <NodeTreePanel
          tree={tree}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          canDelete={false}
          onDeleteNode={onDeleteNode}
          onMoveNode={onMoveNode}
          disabled
          icons={{
            reveal: <Crosshair size={14} />,
            delete: <Trash2 size={10} />,
            expand: <ChevronRight size={10} />,
            collapse: <ChevronDown size={10} />,
            renderNodeType: (node: CanvasNode) => {
              switch (node.type) {
                case 'view':
                  return <Box size={11} className="shrink-0" />;
                case 'text':
                  return <Type size={11} className="shrink-0" />;
                case 'image':
                  return <ImageIcon size={11} className="shrink-0" />;
                case 'scrollview':
                  return <ScrollText size={11} className="shrink-0" />;
                default:
                  return null;
              }
            },
          }}
          className="text-xs"
        />
      </div>
      <div className="p-3 border-b border-gray-200">
        <h2 className="text-sm font-bold text-gray-700">Properties</h2>
      </div>
      <div className="flex-1 overflow-auto">
        {selectedNode ? (
          <PreviewPropertiesPanel node={selectedNode} />
        ) : (
          <div className="p-4 text-xs text-gray-400 text-center mt-4">
            Click a node on the canvas<br />to inspect its properties
          </div>
        )}
      </div>
    </div>
  );
}

