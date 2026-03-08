import { Copy, X } from 'lucide-react';
import { Button } from '../../../components/Button';
import type { JSXPropsMode } from './descriptor';

type Tab = 'jsx' | 'json';

export function LiveCodeEditorHeader({
  activeTab,
  onTabChange,
  jsxPropsMode,
  onJsxPropsModeChange,
  showJsxPropsMode,
  showSync = true,
  onSyncFromCanvas,
  showApply = true,
  onApplyToCanvas,
  onCopy,
  onClose,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  jsxPropsMode: JSXPropsMode;
  onJsxPropsModeChange: (mode: JSXPropsMode) => void;
  showJsxPropsMode: boolean;
  showSync?: boolean;
  onSyncFromCanvas: () => void;
  showApply?: boolean;
  onApplyToCanvas: () => void;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <div className="h-12 px-3 flex items-center gap-2 border-b border-gray-200">
      <div className="text-sm font-semibold text-gray-800">Live Editor</div>
      <div className="flex items-center gap-1 ml-2">
        <Button
          variant="ghost"
          size="sm"
          className={`px-2 py-1 rounded text-xs ${activeTab === 'jsx' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          onClick={() => onTabChange('jsx')}
        >
          JSX
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`px-2 py-1 rounded text-xs ${activeTab === 'json' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          onClick={() => onTabChange('json')}
        >
          JSON
        </Button>
      </div>
      <div className="flex-1" />
      {showJsxPropsMode && (
        <div className="flex items-center gap-1 mr-2">
          <Button
            variant="ghost"
            size="sm"
            className={`px-2 py-1 rounded text-[11px] ${jsxPropsMode === 'style' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => onJsxPropsModeChange('style')}
            title="只输出 style"
          >
            style
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`px-2 py-1 rounded text-[11px] ${jsxPropsMode === 'className' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => onJsxPropsModeChange('className')}
            title="只输出 className"
          >
            className
          </Button>
        </div>
      )}
      {showSync && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onSyncFromCanvas}
          className="px-2 py-1 rounded text-xs text-gray-600 hover:bg-gray-100"
          title="从当前画布同步到编辑器（覆盖当前编辑器内容）"
        >
          Sync
        </Button>
      )}
      {showApply && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onApplyToCanvas}
          className="px-2 py-1 rounded text-xs text-gray-600 hover:bg-gray-100"
          title="把编辑器内容应用到画布（覆盖当前画布结构）"
        >
          Apply
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={onCopy} className="p-2 rounded hover:bg-gray-100 text-gray-600" title="复制当前代码">
        <Copy size={16} />
      </Button>
      <Button variant="ghost" size="sm" onClick={onClose} className="p-2 rounded hover:bg-gray-100 text-gray-600" title="关闭">
        <X size={16} />
      </Button>
    </div>
  );
}
