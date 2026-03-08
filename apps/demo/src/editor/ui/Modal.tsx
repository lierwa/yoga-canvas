import { X } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { useEffect } from 'react';
import { Button } from '../../components/Button';
import { useSpringValue } from './useSpringValue';

type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  width?: number;
  className?: string;
  style?: CSSProperties;
};

export function Modal({ open, title, children, onClose, footer, width, className, style }: ModalProps) {
  const p = useSpringValue(open ? 1 : 0);
  const show = open || p > 0.001;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ pointerEvents: open ? 'auto' : 'none' }}
    >
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"
        style={{ opacity: 0.95 * p }}
        onMouseDown={onClose}
      />
      <div
        className={[
          'relative max-w-[calc(100vw-32px)] rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(2,6,23,0.18)]',
          className ?? '',
        ].join(' ')}
        style={{
          opacity: p,
          transform: `translateY(${(1 - p) * 10}px) scale(${0.98 + p * 0.02})`,
          width: width ? `${width}px` : '560px',
          ...style,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-800 truncate">
              {title}
            </div>
          </div>
          <Button
            variant="icon"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </Button>
        </div>
        <div className="px-4 py-4">{children}</div>
        {footer ? (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
