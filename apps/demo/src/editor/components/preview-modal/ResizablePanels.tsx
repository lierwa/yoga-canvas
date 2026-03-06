import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode, MouseEvent as ReactMouseEvent } from 'react';

export function ResizablePanels({
  left,
  center,
  right,
  defaultLeftWidth = 420,
  defaultRightWidth = 320,
  minWidth = 220,
}: {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  defaultLeftWidth?: number;
  defaultRightWidth?: number;
  minWidth?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const dragging = useRef<'left' | 'right' | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback(
    (side: 'left' | 'right') => (e: ReactMouseEvent) => {
      e.preventDefault();
      dragging.current = side;
      startX.current = e.clientX;
      startWidth.current = side === 'left' ? leftWidth : rightWidth;
    },
    [leftWidth, rightWidth],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const delta = e.clientX - startX.current;

      if (dragging.current === 'left') {
        const newLeft = Math.max(minWidth, Math.min(startWidth.current + delta, containerWidth - rightWidth - minWidth));
        setLeftWidth(newLeft);
      } else {
        const newRight = Math.max(minWidth, Math.min(startWidth.current - delta, containerWidth - leftWidth - minWidth));
        setRightWidth(newRight);
      }
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
  }, [leftWidth, rightWidth, minWidth]);

  return (
    <div ref={containerRef} className="flex flex-1 min-h-0 w-full">
      <div className="h-full" style={{ width: leftWidth }}>
        {left}
      </div>
      <div className="w-1 bg-gray-200 hover:bg-indigo-400 cursor-col-resize" onMouseDown={onMouseDown('left')} />
      <div className="flex-1 min-w-0 min-h-0">{center}</div>
      <div className="w-1 bg-gray-200 hover:bg-indigo-400 cursor-col-resize" onMouseDown={onMouseDown('right')} />
      <div className="h-full" style={{ width: rightWidth }}>
        {right}
      </div>
    </div>
  );
}
