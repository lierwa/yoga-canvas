import { Copy } from 'lucide-react';
import { CodeViewer } from './CodeViewer';

export function PreviewCodePanel({
  activeTab,
  onTabChange,
  jsxPropsMode,
  onJsxPropsModeChange,
  codeContent,
  onCopy,
}: {
  activeTab: 'typescript' | 'json' | 'html';
  onTabChange: (tab: 'typescript' | 'json' | 'html') => void;
  jsxPropsMode: 'style' | 'className';
  onJsxPropsModeChange: (mode: 'style' | 'className') => void;
  codeContent: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-700 text-xs font-bold text-gray-400 flex items-center gap-2">
        <button
          className={`px-2 py-1 rounded ${activeTab === 'typescript' ? 'bg-gray-700 text-gray-100' : 'hover:bg-gray-800'}`}
          onClick={() => onTabChange('typescript')}
        >
          JSX
        </button>
        <button
          className={`px-2 py-1 rounded ${activeTab === 'json' ? 'bg-gray-700 text-gray-100' : 'hover:bg-gray-800'}`}
          onClick={() => onTabChange('json')}
        >
          JSON
        </button>
        <button
          className={`px-2 py-1 rounded ${activeTab === 'html' ? 'bg-gray-700 text-gray-100' : 'hover:bg-gray-800'}`}
          onClick={() => onTabChange('html')}
        >
          HTML
        </button>
        {activeTab === 'typescript' && (
          <div className="flex items-center gap-1 ml-2">
            <button
              className={`px-2 py-1 rounded text-[11px] ${jsxPropsMode === 'style' ? 'bg-gray-700 text-gray-100' : 'hover:bg-gray-800'}`}
              onClick={() => onJsxPropsModeChange('style')}
              title="只输出 style"
            >
              style
            </button>
            <button
              className={`px-2 py-1 rounded text-[11px] ${jsxPropsMode === 'className' ? 'bg-gray-700 text-gray-100' : 'hover:bg-gray-800'}`}
              onClick={() => onJsxPropsModeChange('className')}
              title="只输出 className"
            >
              className
            </button>
          </div>
        )}
        <div className="flex-1" />
        <button
          className="text-[11px] bg-indigo-500 text-white px-2.5 py-1 rounded hover:bg-indigo-600 cursor-pointer flex items-center gap-1"
          onClick={onCopy}
        >
          <Copy size={12} /> Copy
        </button>
      </div>
      <CodeViewer content={codeContent} language={activeTab} />
    </div>
  );
}

