import { RotateCcw } from "lucide-react";

export function ZoomControls({
  scale,
  initialScale,
  onScaleChange,
  canResetView,
  onResetView,
}: {
  scale: number;
  initialScale: number;
  onScaleChange: (nextScale: number) => void;
  canResetView?: boolean;
  onResetView?: () => void;
}) {
  const minScale = 0.1;
  const maxScale = 5;
  const clampedScale = Math.min(Math.max(scale, minScale), maxScale);
  const clampedInitial = Math.min(Math.max(initialScale, minScale), maxScale);
  const progressPct = ((clampedScale - minScale) / (maxScale - minScale)) * 100;
  const zoomLabel = `${Math.round(clampedScale * 100)}%`;
  const canResetZoom = Math.abs(clampedScale - clampedInitial) > 0.0005;
  const canReset = canResetView ?? canResetZoom;

  return (
    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 w-[250px]">
      <span className="text-[11px] tabular-nums text-gray-500 w-12 text-right">{zoomLabel}</span>
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
        onClick={() => {
          if (onResetView) onResetView();
          else onScaleChange(clampedInitial);
        }}
        disabled={!canReset}
        title="Reset view"
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
}

