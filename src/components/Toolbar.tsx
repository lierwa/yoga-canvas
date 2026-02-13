import { Undo2, Redo2, BoxSelect, Play } from 'lucide-react';

interface ToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPreview: () => void;
}

export default function Toolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPreview,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-white border-b border-gray-200">
      <div className="flex items-center gap-1 mr-4">
        <span className="text-sm font-semibold text-gray-700">Yoga Canvas</span>
      </div>

      <div className="h-5 w-px bg-gray-300 mx-1" />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md
          enabled:hover:bg-gray-100 enabled:hover:text-gray-800
          disabled:opacity-40 disabled:cursor-not-allowed
          text-gray-600 transition-colors"
        title="Undo (⌘Z)"
      >
        <Undo2 size={14} />
        <span>Undo</span>
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md
          enabled:hover:bg-gray-100 enabled:hover:text-gray-800
          disabled:opacity-40 disabled:cursor-not-allowed
          text-gray-600 transition-colors"
        title="Redo (⌘⇧Z)"
      >
        <Redo2 size={14} />
        <span>Redo</span>
      </button>

      <div className="h-5 w-px bg-gray-300 mx-1" />

      <button
        onClick={onPreview}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md
          hover:bg-green-50 hover:text-green-700
          text-gray-600 transition-colors"
        title="Preview"
      >
        <Play size={14} />
        <span>Preview</span>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <BoxSelect size={12} />
        <span>Click to select &middot; Scroll to zoom &middot; Drag empty area to pan</span>
      </div>
    </div>
  );
}
