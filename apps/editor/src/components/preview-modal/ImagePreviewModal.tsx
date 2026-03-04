import { Download } from 'lucide-react';

export function ImagePreviewModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl p-4 flex flex-col items-center gap-4 max-w-[92vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-gray-800">Exported Image</h3>
        <img src={url} alt="Export" className="rounded-lg border border-gray-200 shadow-sm" style={{ maxWidth: 420 }} />
        <div className="flex gap-2">
          <a
            href={url}
            download="yoga-canvas.png"
            className="text-xs bg-indigo-500 text-white px-4 py-1.5 rounded hover:bg-indigo-600 flex items-center gap-1 cursor-pointer"
          >
            <Download size={12} /> Download
          </a>
          <button className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer px-3 py-1.5" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

