import Taro from '@tarojs/taro';
import { Canvas, View } from '@tarojs/components';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { NodeDescriptor, YogaCanvas, StyleProps } from '@yoga-canvas/core';
import { convertChildrenToDescriptors, View as YogaView } from '@yoga-canvas/react';
import { initYogaCanvasTaro, type MiniCanvasNode, type InitYogaCanvasTaroResult } from '../runtime/initYogaCanvasTaro';

type ReadyInfo = {
  instance: YogaCanvas;
};

export type CanvasContainerProps = {
  id?: string;
  width?: number;
  height?: number;
  pixelRatio?: number;
  rootName?: string;
  rootStyle?: StyleProps;
  containerStyle?: React.CSSProperties | string;
  canvasStyle?: React.CSSProperties | string;
  layout?: NodeDescriptor;
  children?: React.ReactNode;
  onReady?: (info: ReadyInfo) => void;
  onError?: (error: Error) => void;
};

function createWrapperLayout(
  rootName: string | undefined,
  width: number | undefined,
  height: number | undefined,
  rootStyle: StyleProps | undefined,
  children: React.ReactNode,
): NodeDescriptor {
  const wrapper = (
    <YogaView
      name={rootName ?? 'CanvasContainerRoot'}
      style={{
        ...(typeof width === 'number' ? { width } : {}),
        ...(typeof height === 'number' ? { height } : {}),
        ...(rootStyle ?? {}),
      }}
    >
      {children}
    </YogaView>
  );
  const list = convertChildrenToDescriptors(wrapper);
  const root = list[0] as NodeDescriptor | undefined;
  if (!root) throw new Error('无法从 children 构建布局树');
  return root;
}

function normalizeLayout(
  layout: NodeDescriptor | undefined,
  rootName: string | undefined,
  width: number | undefined,
  height: number | undefined,
  rootStyle: StyleProps | undefined,
  children: React.ReactNode,
): NodeDescriptor {
  if (layout) return layout;
  return createWrapperLayout(rootName, width, height, rootStyle, children);
}

export function CanvasContainer(props: CanvasContainerProps) {
  const {
    layout: layoutProp,
    children,
    width,
    height,
    pixelRatio,
    rootName,
    rootStyle,
    onReady,
    onError,
    containerStyle,
    canvasStyle,
  } = props;

  const canvasIdRef = useRef(props.id ?? `yogaCanvas_${Math.random().toString(36).slice(2)}`);
  const [readyInfo, setReadyInfo] = useState<ReadyInfo | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const layout = useMemo(
    () => normalizeLayout(layoutProp, rootName, width, height, rootStyle, children),
    [layoutProp, rootName, width, height, rootStyle, children],
  );
  const layoutSize = useMemo(() => {
    const style = (layout as unknown as { style?: { width?: unknown; height?: unknown } }).style;
    const w = typeof style?.width === 'number' && Number.isFinite(style.width) ? style.width : undefined;
    const h = typeof style?.height === 'number' && Number.isFinite(style.height) ? style.height : undefined;
    return { width: w, height: h };
  }, [layout]);
  const displayWidth = typeof width === 'number' ? width : layoutSize.width;
  const displayHeight = typeof height === 'number' ? height : layoutSize.height;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const instance = Taro.getCurrentInstance();
      const page = (instance as unknown as { page?: unknown }).page;
      const query = page ? Taro.createSelectorQuery().in(page as never) : Taro.createSelectorQuery();

      await new Promise<void>((resolve) => Taro.nextTick(resolve));

      query
        .select(`#${canvasIdRef.current}`)
        .fields({ node: true, size: true })
        .exec(async (res: unknown[]) => {
          if (cancelled) return;
          const first = Array.isArray(res) ? res[0] : null;
          const node = (first ? (first as unknown as { node?: MiniCanvasNode }).node : null) ?? null;

          if (!node) {
            const e = new Error('Canvas node not found');
            setError(e);
            onError?.(e);
            return;
          }

          try {
            const result: InitYogaCanvasTaroResult = await initYogaCanvasTaro(node, layout, {
              width,
              height,
              pixelRatio,
            });
            if (cancelled) return;
            const info: ReadyInfo = { instance: result.instance };
            setReadyInfo(info);
            setError(null);
            onReady?.(info);
          } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            setError(err);
            onError?.(err);
          }
        });
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [layout, width, height, pixelRatio, onReady, onError]);

  useEffect(() => {
    if (!readyInfo) return;
    readyInfo.instance.update(layout).catch(() => {});
  }, [readyInfo, layout]);

  return (
    <View style={containerStyle}>
      <Canvas
        id={canvasIdRef.current}
        type="2d"
        style={{
          width: typeof displayWidth === 'number' ? `${displayWidth}px` : undefined,
          height: typeof displayHeight === 'number' ? `${displayHeight}px` : undefined,
          ...(typeof canvasStyle === 'object' && canvasStyle ? canvasStyle : {}),
        }}
      />
      {error ? <View style={{ display: 'none' }}>{error.message}</View> : null}
    </View>
  );
}
