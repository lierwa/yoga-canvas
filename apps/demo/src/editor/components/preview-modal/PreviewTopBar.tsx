import { ArrowLeft, Download, MousePointer2 } from "lucide-react";
import { Button } from "../../../components/Button";

export function PreviewTopBar({
  rootLabel,
  onBack,
  onExportImage,
  exportScale,
  onExportScaleChange,
  exportDisabled,
  pickMode,
  onPickModeChange,
}: {
  rootLabel: string;
  onBack: () => void;
  onExportImage: () => void;
  exportScale: 1 | 2 | 3;
  onExportScaleChange: (scale: 1 | 2 | 3) => void;
  exportDisabled: boolean;
  pickMode: boolean;
  onPickModeChange: (next: boolean) => void;
}) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer"
        onClick={onBack}
      >
        <ArrowLeft size={14} /> Back
      </Button>
      <div className="min-w-0">
        <div className="text-lg font-bold text-indigo-600 truncate">
          Preview
        </div>
        <div className="text-xs text-gray-400 truncate">{rootLabel}</div>
      </div>
      <div className="flex-1" />
      <span className="text-xs text-gray-400">Selection to Inspect</span>
      <Button
        variant="icon"
        onClick={() => onPickModeChange(!pickMode)}
        className={`rounded-md mr-8 ${
          pickMode
            ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
            : "border-gray-200 text-gray-500 hover:bg-gray-100"
        }`}
        title={
          pickMode ? "Selection to Inspect: ON" : "Selection to Inspect: OFF"
        }
      >
        <MousePointer2 size={14} />
      </Button>
      <div className="flex items-center gap-2">
        <div className="text-[11px] text-gray-500">Export</div>
        <select
          value={exportScale}
          onChange={(e) =>
            onExportScaleChange(Number(e.target.value) as 1 | 2 | 3)
          }
          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-300"
          disabled={exportDisabled}
        >
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={3}>3x</option>
        </select>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onExportImage}
        disabled={exportDisabled}
      >
        <Download size={14} /> Image
      </Button>
    </div>
  );
}
