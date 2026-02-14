import { useRef, useState, useEffect, useCallback } from 'react';
import {
  createYagaCanvas,
  YagaCanvas,
  type NodeDescriptor,
  type NodeTree,
  type YagaCanvasOptions,
} from '@yaga-canvas/core';

export interface UseYagaCanvasOptions extends YagaCanvasOptions {
  /** Auto-render on init. Defaults to true. */
  autoRender?: boolean;
}

export interface UseYagaCanvasReturn {
  /** Ref to attach to a <canvas> element. */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** The YagaCanvas instance (null until initialized). */
  instance: YagaCanvas | null;
  /** Current node tree (updates on every render). */
  nodeTree: NodeTree | null;
  /** Whether the engine is ready. */
  ready: boolean;
  /** Trigger a render. */
  render: () => void;
  /** Export canvas as data URL. */
  toDataURL: (type?: string, quality?: number) => Promise<string>;
  /** Export node tree as JSON. */
  toJSON: () => string;
  /** Export as HTML DOM string. */
  toDOMString: () => string;
}

/**
 * React hook for using YagaCanvas.
 */
export function useYagaCanvas(
  layout: NodeDescriptor,
  options: UseYagaCanvasOptions = {},
): UseYagaCanvasReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const instanceRef = useRef<YagaCanvas | null>(null);
  const [ready, setReady] = useState(false);
  const [nodeTree, setNodeTree] = useState<NodeTree | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const yaga = createYagaCanvas(canvas, layoutRef.current, {
      platform: options.platform ?? 'h5',
      pixelRatio: options.pixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1),
      width: options.width,
      height: options.height,
      adapter: options.adapter,
    });

    instanceRef.current = yaga;

    yaga.init().then(() => {
      if (options.autoRender !== false) {
        yaga.render();
      }
      setReady(true);
      setNodeTree(yaga.getNodeTree());
    });

    return () => {
      yaga.destroy();
      instanceRef.current = null;
      setReady(false);
      setNodeTree(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const render = useCallback(() => {
    const inst = instanceRef.current;
    if (!inst) return;
    inst.render();
    setNodeTree(inst.getNodeTree());
  }, []);

  const toDataURL = useCallback(async (type?: string, quality?: number) => {
    const inst = instanceRef.current;
    if (!inst) throw new Error('YagaCanvas not initialized');
    return inst.toDataURL(type, quality);
  }, []);

  const toJSON = useCallback(() => {
    const inst = instanceRef.current;
    if (!inst) return '{}';
    return inst.toJSON();
  }, []);

  const toDOMString = useCallback(() => {
    const inst = instanceRef.current;
    if (!inst) return '';
    return inst.toDOMString();
  }, []);

  return {
    canvasRef,
    instance: instanceRef.current,
    nodeTree,
    ready,
    render,
    toDataURL,
    toJSON,
    toDOMString,
  };
}
