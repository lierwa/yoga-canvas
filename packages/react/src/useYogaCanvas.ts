import { useRef, useState, useEffect, useCallback } from 'react';

import {
  createYogaCanvas,
  YogaCanvas,
  type NodeDescriptor,
  type NodeTree,
  type YogaCanvasOptions,
} from '@yoga-canvas/core';

export interface UseYogaCanvasOptions extends YogaCanvasOptions {
  /** Auto-render on init. Defaults to true. */
  autoRender?: boolean;
}

export interface UseYogaCanvasReturn {
  /** Ref to attach to a <canvas> element. */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** The YogaCanvas instance (null until initialized). */
  instance: YogaCanvas | null;
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
 * React hook for using YogaCanvas.
 */
export function useYogaCanvas(
  layout: NodeDescriptor,
  options: UseYogaCanvasOptions = {},
): UseYogaCanvasReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const instanceRef = useRef<YogaCanvas | null>(null);
  const [ready, setReady] = useState(false);
  const [nodeTree, setNodeTree] = useState<NodeTree | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const yoga = createYogaCanvas(canvas, layoutRef.current, {
      platform: options.platform ?? 'h5',
      pixelRatio: options.pixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1),
      width: options.width,
      height: options.height,
      adapter: options.adapter,
    });

    instanceRef.current = yoga;

    yoga.init().then(() => {
      if (options.autoRender !== false) {
        yoga.render();
      }
      setReady(true);
      setNodeTree(yoga.getNodeTree());
    });

    return () => {
      yoga.destroy();
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
    if (!inst) throw new Error('YogaCanvas not initialized');
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
