import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';

interface ResizablePanelsProps {
  left: ReactNode;
  center: ReactNode;
  rightPanels?: ReactNode[];
  defaultLeftWidth?: number;
  defaultRightWidths?: number[];
  minWidth?: number;
}

export function ResizablePanels({
  left,
  center,
  rightPanels = [],
  defaultLeftWidth = 384,
  defaultRightWidths,
  minWidth = 180,
}: ResizablePanelsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [rightWidths, setRightWidths] = useState<number[]>(() => {
    if (rightPanels.length === 0) return [];
    return rightPanels.map((_, i) => defaultRightWidths?.[i] ?? 288);
  });
  const dragging = useRef<{ kind: 'left' } | { kind: 'right'; index: number } | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback(
    (side: { kind: 'left' } | { kind: 'right'; index: number }) => (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = side;
      startX.current = e.clientX;
      startWidth.current = side.kind === 'left' ? leftWidth : rightWidths[side.index] ?? minWidth;
    },
    [leftWidth, minWidth, rightWidths],
  );

  useEffect(() => {
    setRightWidths((prev) => {
      if (rightPanels.length === 0) return prev.length === 0 ? prev : [];

      const next = prev.slice(0, rightPanels.length);
      for (let i = next.length; i < rightPanels.length; i++) {
        next[i] = defaultRightWidths?.[i] ?? 288;
      }

      if (next.length === prev.length && next.every((v, i) => v === prev[i])) return prev;
      return next;
    });
  }, [defaultRightWidths, rightPanels.length]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const delta = e.clientX - startX.current;

      if (dragging.current.kind === 'left') {
        const totalRight = rightWidths.reduce((sum, w) => sum + w, 0);
        const maxLeft = containerWidth - totalRight - minWidth;
        const newLeft = Math.max(minWidth, Math.min(startWidth.current + delta, maxLeft));
        setLeftWidth(newLeft);
        return;
      }

      const index = dragging.current.index;
      const currentWidth = rightWidths[index] ?? minWidth;
      const otherRight = rightWidths.reduce((sum, w, i) => (i === index ? sum : sum + w), 0);
      const maxRight = containerWidth - leftWidth - otherRight - minWidth;
      const newRight = Math.max(minWidth, Math.min(startWidth.current - delta, maxRight));
      if (Math.abs(newRight - currentWidth) < 0.5) return;
      setRightWidths((prev) => {
        if (prev[index] === undefined) return prev;
        if (Math.abs(prev[index] - newRight) < 0.5) return prev;
        const next = prev.slice();
        next[index] = newRight;
        return next;
      });
    };

    const onMouseUp = () => {
      dragging.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [leftWidth, minWidth, rightWidths]);

  return (
    <div ref={containerRef} className="flex-1 flex overflow-hidden">
      <div style={{ width: leftWidth, minWidth }} className="flex flex-col shrink-0 overflow-hidden">
        {left}
      </div>

      <div
        className="w-1 bg-gray-200 hover:bg-indigo-400 cursor-col-resize transition-colors shrink-0 relative group"
        onMouseDown={onMouseDown({ kind: 'left' })}
      >
        <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-indigo-400/20" />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {center}
      </div>

      {rightPanels.map((panel, index) => (
        <div key={index} className="contents">
          <div
            className="w-1 bg-gray-200 hover:bg-indigo-400 cursor-col-resize transition-colors shrink-0 relative group"
            onMouseDown={onMouseDown({ kind: 'right', index })}
          >
            <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-indigo-400/20" />
          </div>

          <div
            style={{
              width: rightWidths[index] ?? minWidth,
              minWidth,
            }}
            className="flex h-full flex-col shrink-0 overflow-hidden min-w-0"
          >
            {panel}
          </div>
        </div>
      ))}
    </div>
  );
}
