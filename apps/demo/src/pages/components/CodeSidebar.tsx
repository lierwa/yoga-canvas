import { useEffect } from 'react';
import LiveCodeEditorPanel from '../../editor/components/LiveCodeEditorPanel';
import type { NodeTree } from '../../editor/types';

export function CodeSidebar({
  open,
  tree,
  rootNodeId,
  initialJSX,
  onClose,
}: {
  open: boolean;
  tree: NodeTree;
  rootNodeId: string;
  initialJSX?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0" onMouseDown={onClose} />
      <div
        className="absolute top-0 right-0 h-full w-[min(640px,92vw)] bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <LiveCodeEditorPanel
          key={rootNodeId}
          tree={tree}
          rootNodeId={rootNodeId}
          embedded
          readOnly
          onClose={onClose}
          onDescriptorChange={() => {}}
          initialCode={initialJSX ? { jsx: initialJSX } : undefined}
        />
      </div>
    </div>
  );
}

