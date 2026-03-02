import { useRef } from 'react';

export function LiveCodeEditorResizer({
  panelWidth,
  onPanelWidthChange,
}: {
  panelWidth: number;
  onPanelWidthChange: (nextWidth: number) => void;
}) {
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  return (
    <div
      className="absolute left-0 top-0 h-full w-1 cursor-ew-resize hover:bg-indigo-500/20 active:bg-indigo-500/30"
      onPointerDown={(e) => {
        dragRef.current = { startX: e.clientX, startWidth: panelWidth };
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragRef.current) return;
        const delta = dragRef.current.startX - e.clientX;
        const min = 320;
        const max = Math.max(min, window.innerWidth - 240);
        const next = Math.max(min, Math.min(max, dragRef.current.startWidth + delta));
        onPanelWidthChange(next);
      }}
      onPointerUp={() => {
        dragRef.current = null;
      }}
    />
  );
}

