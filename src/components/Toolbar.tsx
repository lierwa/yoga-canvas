import { Undo2, Redo2, BoxSelect, Code2, Play, RotateCcw } from "lucide-react";

interface ToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  scale: number;
  initialScale?: number;
  onScaleChange: (nextScale: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onPreview: () => void;
  onCodeEditor: () => void;
}

export default function Toolbar({
  canUndo,
  canRedo,
  scale,
  initialScale = 1,
  onScaleChange,
  onUndo,
  onRedo,
  onPreview,
  onCodeEditor,
}: ToolbarProps) {
  const minScale = 0.1;
  const maxScale = 5;
  const clampedScale = Math.min(Math.max(scale, minScale), maxScale);
  const clampedInitial = Math.min(Math.max(initialScale, minScale), maxScale);
  const progressPct = ((clampedScale - minScale) / (maxScale - minScale)) * 100;
  const zoomLabel = `${Math.round(clampedScale * 100)}%`;
  const canReset = Math.abs(clampedScale - clampedInitial) > 0.0005;

  return (
    <div className="relative flex items-center gap-1 px-3 py-2 bg-white border-b border-gray-200">
      <div className="flex items-center gap-1 mr-4">
        <span className="text-sm font-semibold text-gray-700">Yoga Canvas</span>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 w-[250px]">
        <span className="text-[11px] tabular-nums text-gray-500 w-12 text-right">
          {zoomLabel}
        </span>
        <div className="relative flex-1 h-7">
          <div className="absolute inset-0 px-2 flex items-center pointer-events-none">
            <div className="relative w-full h-1 rounded-full bg-gray-200">
              <div
                className="absolute left-0 top-0 h-1 rounded-full bg-indigo-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="absolute inset-0 px-2 z-10">
            <input
              type="range"
              min={minScale}
              max={maxScale}
              step={0.01}
              value={clampedScale}
              onChange={(e) => onScaleChange(Number(e.target.value))}
              className="zoom-slider w-full h-7 focus:outline-none"
              aria-label="Canvas zoom"
            />
          </div>
        </div>
        <button
          type="button"
          className="cursor-pointer p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => onScaleChange(clampedInitial)}
          disabled={!canReset}
          title="Reset zoom"
        >
          <RotateCcw size={14} />
        </button>
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

      <button
        onClick={onCodeEditor}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md
          hover:bg-indigo-50 hover:text-indigo-700
          text-gray-600 transition-colors"
        title="Live Code"
      >
        <Code2 size={14} />
        <span>Code</span>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <BoxSelect size={12} />
        <span>
          Click to select &middot; Scroll to zoom &middot; Drag empty area to
          pan
        </span>
      </div>
    </div>
  );
}
