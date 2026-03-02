import { Redo2, Undo2 } from "lucide-react";

export function HistoryControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  return (
    <>
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
    </>
  );
}

