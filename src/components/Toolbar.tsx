import { Plus, BoxSelect, Trash2, Layers } from 'lucide-react';

interface ToolbarProps {
  selectedNodeId: string | null;
  isRoot: boolean;
  hasChildren: boolean;
  onAddChild: () => void;
  onAddContainer: () => void;
  onDelete: () => void;
}

export default function Toolbar({
  selectedNodeId,
  isRoot,
  onAddChild,
  onAddContainer,
  onDelete,
}: ToolbarProps) {
  const canAdd = selectedNodeId !== null;
  const canDelete = selectedNodeId !== null && !isRoot;

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-white border-b border-gray-200">
      <div className="flex items-center gap-1 mr-4">
        <span className="text-sm font-semibold text-gray-700">Yoga Canvas</span>
      </div>

      <div className="h-5 w-px bg-gray-300 mx-1" />

      <button
        onClick={onAddChild}
        disabled={!canAdd}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md
          enabled:hover:bg-blue-50 enabled:hover:text-blue-600
          disabled:opacity-40 disabled:cursor-not-allowed
          text-gray-600 transition-colors"
        title="Add child item to selected node"
      >
        <Plus size={14} />
        <span>Add Item</span>
      </button>

      <button
        onClick={onAddContainer}
        disabled={!canAdd}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md
          enabled:hover:bg-purple-50 enabled:hover:text-purple-600
          disabled:opacity-40 disabled:cursor-not-allowed
          text-gray-600 transition-colors"
        title="Add flex container to selected node"
      >
        <Layers size={14} />
        <span>Add Container</span>
      </button>

      <button
        onClick={onDelete}
        disabled={!canDelete}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md
          enabled:hover:bg-red-50 enabled:hover:text-red-600
          disabled:opacity-40 disabled:cursor-not-allowed
          text-gray-600 transition-colors"
        title="Delete selected node"
      >
        <Trash2 size={14} />
        <span>Delete</span>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <BoxSelect size={12} />
        <span>Click to select &middot; Scroll to zoom &middot; Drag empty area to pan</span>
      </div>
    </div>
  );
}
