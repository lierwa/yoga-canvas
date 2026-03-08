import { Copy } from 'lucide-react';
import { Button } from '../../../components/Button';
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
  const tabButtonClass = (active: boolean) =>
    `px-2 py-1 rounded text-gray-300 hover:text-gray-100 hover:bg-gray-800 ${
      active ? 'bg-gray-700 text-white hover:bg-gray-700' : ''
    }`;

  const modeButtonClass = (active: boolean) =>
    `px-2 py-1 rounded text-[11px] text-gray-300 hover:text-gray-100 hover:bg-gray-800 ${
      active ? 'bg-gray-700 text-white hover:bg-gray-700' : ''
    }`;

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
      <div className="px-4 py-2 border-b border-gray-700 text-xs font-bold text-gray-400 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className={tabButtonClass(activeTab === 'typescript')}
          onClick={() => onTabChange('typescript')}
        >
          JSX
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={tabButtonClass(activeTab === 'json')}
          onClick={() => onTabChange('json')}
        >
          JSON
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={tabButtonClass(activeTab === 'html')}
          onClick={() => onTabChange('html')}
        >
          HTML
        </Button>
        {activeTab === 'typescript' && (
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              className={modeButtonClass(jsxPropsMode === 'style')}
              onClick={() => onJsxPropsModeChange('style')}
              title="只输出 style"
            >
              style
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={modeButtonClass(jsxPropsMode === 'className')}
              onClick={() => onJsxPropsModeChange('className')}
              title="只输出 className"
            >
              className
            </Button>
          </div>
        )}
        <div className="flex-1" />
        <Button
          variant="primary"
          size="sm"
          className="text-[11px] bg-indigo-500 text-white px-2.5 py-1 rounded hover:bg-indigo-600 cursor-pointer flex items-center gap-1"
          onClick={onCopy}
        >
          <Copy size={12} /> Copy
        </Button>
      </div>
      <CodeViewer content={codeContent} language={activeTab} />
    </div>
  );
}

