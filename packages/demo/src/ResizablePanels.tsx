import { useState, useRef, useCallback, useEffect } from 'react';

interface ResizablePanelsProps {
  /** Content for the left panel */
  left: React.ReactNode;
  /** Content for the center panel */
  center: React.ReactNode;
  /** Content for the right panel */
  right: React.ReactNode;
  /** Initial left panel width in px */
  defaultLeftWidth?: number;
  /** Initial right panel width in px */
  defaultRightWidth?: number;
  /** Minimum panel width in px */
  minWidth?: number;
}

export function ResizablePanels({
  left,
  center,
  right,
  defaultLeftWidth = 384,
  defaultRightWidth = 288,
  minWidth = 180,
}: ResizablePanelsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const dragging = useRef<'left' | 'right' | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback(
    (side: 'left' | 'right') => (e: React.MouseEvent) => {
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
    <div ref={containerRef} className="flex-1 flex overflow-hidden">
      {/* Left panel */}
      <div style={{ width: leftWidth, minWidth }} className="flex flex-col shrink-0 overflow-hidden">
        {left}
      </div>

      {/* Left divider */}
      <div
        className="w-1 bg-gray-200 hover:bg-indigo-400 cursor-col-resize transition-colors shrink-0 relative group"
        onMouseDown={onMouseDown('left')}
      >
        <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-indigo-400/20" />
      </div>

      {/* Center panel */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {center}
      </div>

      {/* Right divider */}
      <div
        className="w-1 bg-gray-200 hover:bg-indigo-400 cursor-col-resize transition-colors shrink-0 relative group"
        onMouseDown={onMouseDown('right')}
      >
        <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-indigo-400/20" />
      </div>

      {/* Right panel */}
      <div style={{ width: rightWidth, minWidth }} className="flex flex-col shrink-0 overflow-hidden">
        {right}
      </div>
    </div>
  );
}
