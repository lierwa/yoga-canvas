import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, useMemo, useCallback } from 'react';
import {
  createYogaCanvas,
  YogaCanvas,
  View as createView,
  type NodeDescriptor,
  type CanvasPointerEventType,
  type YogaCanvasOptions,
} from '@yoga-canvas/core';
import { convertChildrenToDescriptors } from './jsx/convertJSX';

export interface YogaCanvasProps extends Omit<YogaCanvasOptions, 'platform' | 'adapter'> {
  /**
   * Layout descriptor tree (descriptor mode).
   * If omitted, children JSX will be used to build the descriptor.
   */
  layout?: NodeDescriptor;
  /** Platform: 'h5' (default) or 'wx'. */
  platform?: 'h5' | 'wx';
  /** CSS class name for the wrapper div. */
  className?: string;
  /** Inline styles for the wrapper div. */
  style?: React.CSSProperties;
  /** Called when the engine is ready. */
  onReady?: (instance: YogaCanvas) => void;
  /** Called after each render. */
  onRender?: () => void;
  /**
   * JSX children (JSX mode). Use View/Text/Image/ScrollView components.
   * Ignored if `layout` prop is provided.
   */
  children?: React.ReactNode;
}

export interface YogaCanvasRef {
  /** The underlying YogaCanvas instance. */
  getInstance(): YogaCanvas | null;
  /** Trigger a re-render. */
  render(): void;
  /** Export as data URL. */
  toDataURL(type?: string, quality?: number): Promise<string>;
  /** Export node tree as JSON. */
  toJSON(): string;
  /** Export as HTML string. */
  toDOMString(): string;
}

/**
 * React component that wraps a <canvas> element with YogaCanvas engine.
 */
export const YogaCanvasComponent = forwardRef<YogaCanvasRef, YogaCanvasProps>(
  function YogaCanvasComponent(props, ref) {
    const {
      layout: layoutProp,
      platform = 'h5',
      pixelRatio,
      width = 375,
      height,
      className,
      style,
      onReady,
      onRender,
      children,
    } = props;

    const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
      width,
      height: typeof height === 'number' && Number.isFinite(height) && height > 0 ? height : 667,
    });

    // Resolve layout: explicit descriptor prop takes priority, otherwise convert JSX children
    const layout = useMemo<NodeDescriptor>(() => {
      if (layoutProp) return layoutProp;
      if (children) {
        const descriptors = convertChildrenToDescriptors(children);
        if (descriptors.length === 1) return descriptors[0];
        // Wrap multiple children in a root View
        return createView({
          name: 'Root',
          style: { width, ...(height !== undefined ? { height } : {}), flexDirection: 'column' },
          children: descriptors,
        });
      }
      // Fallback empty root
      return createView({ style: { width, ...(height !== undefined ? { height } : {}) } });
    }, [layoutProp, children, width, height]);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const instanceRef = useRef<YogaCanvas | null>(null);
    const [ready, setReady] = useState(false);

    useImperativeHandle(ref, () => ({
      getInstance: () => instanceRef.current,
      render: () => {
        instanceRef.current?.render();
        onRender?.();
      },
      toDataURL: async (type?: string, quality?: number) => {
        if (!instanceRef.current) throw new Error('Not initialized');
        return instanceRef.current.toDataURL(type, quality);
      },
      toJSON: () => instanceRef.current?.toJSON() ?? '{}',
      toDOMString: () => instanceRef.current?.toDOMString() ?? '',
    }), [onRender]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = pixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1);
      const yoga = createYogaCanvas(canvas, layout, {
        platform,
        pixelRatio: dpr,
        width,
        height,
      });

      instanceRef.current = yoga;
      const handleResize = (next: unknown) => {
        const s = next as { width?: unknown; height?: unknown };
        const nextW = typeof s.width === 'number' && Number.isFinite(s.width) && s.width > 0 ? s.width : undefined;
        const nextH = typeof s.height === 'number' && Number.isFinite(s.height) && s.height > 0 ? s.height : undefined;
        if (!nextW || !nextH) return;
        setCanvasSize({ width: nextW, height: nextH });
      };
      yoga.on('resize', handleResize);

      yoga.init().then(() => {
        yoga.render();
        setReady(true);
        onReady?.(yoga);
      });

      return () => {
        yoga.off('resize', handleResize);
        yoga.destroy();
        instanceRef.current = null;
        setReady(false);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-render when layout changes
    useEffect(() => {
      if (ready && instanceRef.current) {
        instanceRef.current.update(layout);
        onRender?.();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [layout, ready]);

    const dispatchPointer = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>, type: CanvasPointerEventType) => {
        const yoga = instanceRef.current;
        if (!yoga || !ready) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const result = yoga.dispatchPointerEvent({
          type,
          x,
          y,
          pointerId: e.pointerId,
          button: e.button,
          buttons: e.buttons,
          timeStamp: e.timeStamp,
        });
        if (result.defaultPrevented) e.preventDefault();
      },
      [ready],
    );

    return (
      <div className={className} style={style}>
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => dispatchPointer(e, 'pointerdown')}
          onPointerMove={(e) => dispatchPointer(e, 'pointermove')}
          onPointerUp={(e) => dispatchPointer(e, 'pointerup')}
          onPointerCancel={(e) => dispatchPointer(e, 'pointercancel')}
          style={{
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            display: 'block',
          }}
        />
      </div>
    );
  },
);
