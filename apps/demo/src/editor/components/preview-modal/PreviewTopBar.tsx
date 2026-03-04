import { ArrowLeft, Download } from 'lucide-react';

export function PreviewTopBar({
  rootLabel,
  onBack,
  onExportImage,
  exportDisabled,
}: {
  rootLabel: string;
  onBack: () => void;
  onExportImage: () => void;
  exportDisabled: boolean;
}) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
      <button
        className="text-xs text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer"
        onClick={onBack}
      >
        <ArrowLeft size={14} /> Back
      </button>
      <div className="min-w-0">
        <div className="text-lg font-bold text-indigo-600 truncate">Preview</div>
        <div className="text-xs text-gray-400 truncate">{rootLabel}</div>
      </div>
      <div className="flex-1" />
      <button
        className="text-xs text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onExportImage}
        disabled={exportDisabled}
      >
        <Download size={14} /> Image
      </button>
    </div>
  );
}

