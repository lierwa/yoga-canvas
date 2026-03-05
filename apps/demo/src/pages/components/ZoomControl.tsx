import { Minus, Plus, RotateCcw } from 'lucide-react';

export function ZoomControl({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  const pct = Math.round(scale * 100);

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-white/80 border border-slate-200/70">
      <button
        type="button"
        className="p-2 rounded-lg text-slate-700 hover:bg-slate-100/70 transition-colors"
        onClick={onZoomOut}
        title="缩小"
      >
        <Minus size={14} />
      </button>
      <div className="min-w-[62px] text-center text-xs font-semibold text-slate-700 tabular-nums">{pct}%</div>
      <button
        type="button"
        className="p-2 rounded-lg text-slate-700 hover:bg-slate-100/70 transition-colors"
        onClick={onZoomIn}
        title="放大"
      >
        <Plus size={14} />
      </button>
      <div className="w-px h-5 bg-slate-200/80 mx-1" />
      <button
        type="button"
        className="p-2 rounded-lg text-slate-700 hover:bg-slate-100/70 transition-colors"
        onClick={onReset}
        title="重置为 100%"
      >
        <RotateCcw size={14} />
      </button>
    </div>
  );
}
