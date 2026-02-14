import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, useMemo } from 'react';
import {
  createYagaCanvas,
  YagaCanvas,
  View as createView,
  type NodeDescriptor,
  type YagaCanvasOptions,
} from '@yaga-canvas/core';
import { convertChildrenToDescriptors } from './jsx/convertJSX';

export interface YagaCanvasProps extends Omit<YagaCanvasOptions, 'platform' | 'adapter'> {
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
  onReady?: (instance: YagaCanvas) => void;
  /** Called after each render. */
  onRender?: () => void;
  /**
   * JSX children (JSX mode). Use View/Text/Image/ScrollView components.
   * Ignored if `layout` prop is provided.
   */
  children?: React.ReactNode;
}

export interface YagaCanvasRef {
  /** The underlying YagaCanvas instance. */
  getInstance(): YagaCanvas | null;
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
 * React component that wraps a <canvas> element with YagaCanvas engine.
 */
export const YagaCanvasComponent = forwardRef<YagaCanvasRef, YagaCanvasProps>(
  function YagaCanvasComponent(props, ref) {
    const {
      layout: layoutProp,
      platform = 'h5',
      pixelRatio,
      width = 375,
      height = 667,
      className,
      style,
      onReady,
      onRender,
      children,
    } = props;

    // Resolve layout: explicit descriptor prop takes priority, otherwise convert JSX children
    const layout = useMemo<NodeDescriptor>(() => {
      if (layoutProp) return layoutProp;
      if (children) {
        const descriptors = convertChildrenToDescriptors(children);
        if (descriptors.length === 1) return descriptors[0];
        // Wrap multiple children in a root View
        return createView({
          name: 'Root',
          style: { width, height, flexDirection: 'column' },
          children: descriptors,
        });
      }
      // Fallback empty root
      return createView({ style: { width, height } });
    }, [layoutProp, children, width, height]);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const instanceRef = useRef<YagaCanvas | null>(null);
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
      const yaga = createYagaCanvas(canvas, layout, {
        platform,
        pixelRatio: dpr,
        width,
        height,
      });

      instanceRef.current = yaga;

      yaga.init().then(() => {
        yaga.render();
        setReady(true);
        onReady?.(yaga);
      });

      return () => {
        yaga.destroy();
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

    return (
      <div className={className} style={style}>
        <canvas
          ref={canvasRef}
          style={{
            width: `${width}px`,
            height: `${height}px`,
            display: 'block',
          }}
        />
      </div>
    );
  },
);
