import { Redo2, Undo2 } from "lucide-react";
import { Button } from "../../../components/Button";

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
      <Button
        variant="ghost"
        size="sm"
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
      </Button>

      <Button
        variant="ghost"
        size="sm"
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
      </Button>
    </>
  );
}

