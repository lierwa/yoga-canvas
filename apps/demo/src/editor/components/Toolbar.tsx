import { BoxSelect, Code2, Play } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../../components/Button";
import { HistoryControls } from "./toolbar/HistoryControls";
import { ZoomControls } from "./toolbar/ZoomControls";

interface ToolbarProps {
  title?: string;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  canUndo: boolean;
  canRedo: boolean;
  scale: number;
  initialScale?: number;
  onScaleChange: (nextScale: number) => void;
  canResetView?: boolean;
  onResetView?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onPreview: () => void;
  onCodeEditor: () => void;
}

export default function Toolbar({
  title = "Yoga Canvas",
  leftContent,
  rightContent,
  canUndo,
  canRedo,
  scale,
  initialScale = 1,
  onScaleChange,
  canResetView,
  onResetView,
  onUndo,
  onRedo,
  onPreview,
  onCodeEditor,
}: ToolbarProps) {
  return (
    <div className="relative flex items-center gap-1 px-3 py-2 bg-white border-b border-gray-200">
      <div className="flex items-center gap-2 mr-4 min-w-0">
        {leftContent ? <div className="shrink-0">{leftContent}</div> : null}
        <span className="text-sm font-semibold text-gray-700 truncate">
          {title}
        </span>
      </div>

      <ZoomControls
        scale={scale}
        initialScale={initialScale}
        onScaleChange={onScaleChange}
        canResetView={canResetView}
        onResetView={onResetView}
      />

      <div className="h-5 w-px bg-gray-300 mx-1" />

      <HistoryControls
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
      />

      <div className="h-5 w-px bg-gray-300 mx-1" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onPreview}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md
          hover:bg-green-50 hover:text-green-700
          text-gray-600 transition-colors"
        title="Preview with Animations"
      >
        <Play size={14} />
        <span>Preview</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onCodeEditor}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md
          hover:bg-indigo-50 hover:text-indigo-700
          text-gray-600 transition-colors"
        title="Live Code"
      >
        <Code2 size={14} />
        <span>Code</span>
      </Button>

      <div className="flex-1" />

      {rightContent ? <div className="mr-3">{rightContent}</div> : null}

      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <BoxSelect size={12} />
        <span>Click &middot; Scroll &middot;Zoom &middot; Drag</span>
      </div>
    </div>
  );
}
