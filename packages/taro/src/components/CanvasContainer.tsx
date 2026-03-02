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
  debugIndicator?: boolean;
  onReady?: (info: ReadyInfo) => void;
  onError?: (error: Error) => void;
};

type TouchPointSource = 'detail' | 'touchLocal' | 'touchClient';
type TouchCoordPreference = { source: TouchPointSource; scaled: boolean };
type TouchPointDebug = {
  pr: number;
  logicalW?: number;
  logicalH?: number;
  canvasRect?: { left: number; top: number } | null;
  candidates: Array<{ x: number; y: number; source: TouchPointSource }>;
  expanded: Array<{ x: number; y: number; source: TouchPointSource; scaled: boolean }>;
  requestedPref?: TouchCoordPreference | null;
  chosen: { x: number; y: number; source: TouchPointSource; scaled: boolean };
  chosenHitId?: string | null;
  returnedBy: 'pref' | 'scan';
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
    debugIndicator,
  } = props;

  const canvasIdRef = useRef(props.id ?? `yogaCanvas_${Math.random().toString(36).slice(2)}`);
  const [readyInfo, setReadyInfo] = useState<ReadyInfo | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const touchStateRef = useRef<{
    x: number;
    y: number;
    scrollViewId: string | null;
    pref: TouchCoordPreference | null;
  } | null>(null);
  const scrollBarTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const tapStateRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const canvasRectRef = useRef<{ left: number; top: number } | null>(null);
  const initInfoRef = useRef<{ pixelRatio: number; width: number; height: number } | null>(null);
  const didSkipFirstUpdateRef = useRef(false);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodePath, setSelectedNodePath] = useState<number[] | null>(null);
  const indicatorIdsRef = useRef<{
    rootId: string | null;
    borderId: string | null;
    labelId: string | null;
    textId: string | null;
    namePrefix: string;
  }>({
    rootId: null,
    borderId: null,
    labelId: null,
    textId: null,
    namePrefix: `__debugIndicator_${Math.random().toString(36).slice(2)}`,
  });
  const lastTapRef = useRef<{ time: number; nodeId: string | null } | null>(null);

  const logIndicatorDebug = React.useCallback((payload: unknown) => {
    if (!debugIndicator) return;
    void payload;
    // console.log('[YogaCanvas][Indicator]', JSON.stringify(payload));
  }, [debugIndicator]);

  const baseLayout = useMemo(
    () => normalizeLayout(layoutProp, rootName, width, height, rootStyle, children),
    [layoutProp, rootName, width, height, rootStyle, children],
  );
  const layoutSize = useMemo(() => {
    const style = (baseLayout as unknown as { style?: { width?: unknown; height?: unknown } }).style;
    const w = typeof style?.width === 'number' && Number.isFinite(style.width) ? style.width : undefined;
    const h = typeof style?.height === 'number' && Number.isFinite(style.height) ? style.height : undefined;
    return { width: w, height: h };
  }, [baseLayout]);
  const displayWidth = typeof width === 'number' ? width : layoutSize.width;
  const displayHeight = typeof height === 'number' ? height : layoutSize.height;
  const layout = baseLayout;
  const [canvasSize, setCanvasSize] = useState<{ width?: number; height?: number }>({
    width: displayWidth,
    height: displayHeight,
  });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const instance = Taro.getCurrentInstance();
      const page = (instance as unknown as { page?: unknown }).page;
      const query = page ? Taro.createSelectorQuery().in(page as never) : Taro.createSelectorQuery();

      await new Promise<void>((resolve) => Taro.nextTick(resolve));

      query
        .select(`#${canvasIdRef.current}`)
        .fields({ node: true, size: true, rect: true })
        .exec(async (res: unknown[]) => {
          if (cancelled) return;
          const first = Array.isArray(res) ? res[0] : null;
          const data = first as unknown as { node?: MiniCanvasNode; left?: number; top?: number };
          const node = data?.node ?? null;

          if (!node) {
            const e = new Error('Canvas node not found');
            setError(e);
            onError?.(e);
            return;
          }
          if (typeof data?.left === 'number' && typeof data?.top === 'number') {
            canvasRectRef.current = { left: data.left, top: data.top };
          }

          try {
            const result: InitYogaCanvasTaroResult = await initYogaCanvasTaro(node, layout, {
              width,
              height,
              pixelRatio,
            });
            if (cancelled) return;
            initInfoRef.current = { pixelRatio: result.pixelRatio, width: result.width, height: result.height };
            setCanvasSize({ width: result.width, height: result.height });
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
    const handler = (payload: unknown) => {
      const next = payload as { width?: unknown; height?: unknown };
      const w = typeof next.width === 'number' && Number.isFinite(next.width) && next.width > 0 ? next.width : undefined;
      const h = typeof next.height === 'number' && Number.isFinite(next.height) && next.height > 0 ? next.height : undefined;
      if (!w || !h) return;
      setCanvasSize({ width: w, height: h });
      const prev = initInfoRef.current;
      initInfoRef.current = {
        pixelRatio: prev?.pixelRatio ?? (typeof pixelRatio === 'number' && pixelRatio > 0 ? pixelRatio : 1),
        width: w,
        height: h,
      };
    };
    readyInfo.instance.on('resize', handler);
    return () => {
      readyInfo.instance.off('resize', handler);
    };
  }, [readyInfo, pixelRatio]);

  useEffect(() => {
    const timers = scrollBarTimersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const ensureIndicatorNodes = React.useCallback(() => {
    if (!readyInfo || !debugIndicator) return;
    const ids = indicatorIdsRef.current;
    const tree = readyInfo.instance.getTreeManager().getTree();
    if (!ids.rootId) {
      const descriptor: NodeDescriptor = {
        type: 'view',
        name: `${ids.namePrefix}_root`,
        style: {
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          opacity: 0,
        },
        children: [
          {
            type: 'view',
            name: `${ids.namePrefix}_border`,
            style: {
              position: 'absolute',
              left: 0,
              top: 0,
              width: 0,
              height: 0,
              borderWidth: 2,
              borderColor: '#6366f1',
              borderRadius: 2,
              zIndex: 10000,
            },
          },
          {
            type: 'view',
            name: `${ids.namePrefix}_label`,
            style: {
              position: 'absolute',
              left: 0,
              top: 0,
              paddingLeft: 6,
              paddingRight: 6,
              paddingTop: 2,
              paddingBottom: 2,
              backgroundColor: '#6366f1',
              borderRadius: 4,
              zIndex: 10001,
            },
            children: [
              {
                type: 'text',
                name: `${ids.namePrefix}_text`,
                content: '',
                style: {
                  fontSize: 10,
                  lineHeight: 1.4,
                  color: '#ffffff',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                },
              },
            ],
          },
        ],
      };
      const rootId = tree.rootId;
      if (rootId) {
        readyInfo.instance.addChild(rootId, descriptor);
        const nextTree = readyInfo.instance.getTreeManager().getTree();
        ids.rootId = findNodeIdByName(nextTree, `${ids.namePrefix}_root`);
        ids.borderId = findNodeIdByName(nextTree, `${ids.namePrefix}_border`);
        ids.labelId = findNodeIdByName(nextTree, `${ids.namePrefix}_label`);
        ids.textId = findNodeIdByName(nextTree, `${ids.namePrefix}_text`);
      }
    }
  }, [readyInfo, debugIndicator]);

  const setIndicatorVisible = React.useCallback((visible: boolean) => {
    if (!readyInfo) return;
    const ids = indicatorIdsRef.current;
    if (!ids.rootId || !ids.borderId || !ids.labelId || !ids.textId) return;
    const opacity = visible ? 1 : 0;
    readyInfo.instance.updateVisualStyle(ids.borderId, { opacity });
    readyInfo.instance.updateVisualStyle(ids.labelId, { opacity });
    readyInfo.instance.updateVisualStyle(ids.textId, { opacity });
  }, [readyInfo]);

  const updateIndicatorPosition = React.useCallback((targetIdOverride?: string | null, targetPathOverride?: number[] | null) => {
    if (!readyInfo || !debugIndicator) return;
    const ids = indicatorIdsRef.current;
    const tree = readyInfo.instance.getTreeManager().getTree();
    const effectiveId = targetIdOverride !== undefined ? targetIdOverride : selectedNodeId;
    const effectivePath = targetPathOverride !== undefined ? targetPathOverride : selectedNodePath;
    const targetId = effectiveId ?? (effectivePath ? findNodeIdByPath(tree, effectivePath) : null);
    if (!targetId) {
      if (ids.rootId) setIndicatorVisible(false);
      return;
    }
    if (!ids.rootId || !ids.borderId || !ids.labelId || !ids.textId) {
      ensureIndicatorNodes();
    }
    if (!ids.rootId || !ids.borderId || !ids.labelId || !ids.textId) return;
    const target = targetId ? tree.nodes[targetId] : null;
    if (!target || (target.name && target.name.startsWith(ids.namePrefix))) {
      setIndicatorVisible(false);
      return;
    }
    const rect = target.computedLayout;
    const scrollOffset = getAncestorScrollOffset(tree, target.id, readyInfo.instance.getScrollManager());
    const left = rect.left - scrollOffset.x;
    const top = rect.top - scrollOffset.y;
    const widthValue = rect.width;
    const heightValue = rect.height;
    const labelTop = Math.max(0, top - 18);
    const label = `${target.name ?? target.id} (${Math.round(widthValue)}x${Math.round(heightValue)})`;
    setIndicatorVisible(true);
    readyInfo.instance.updateFlexStyle(ids.borderId, {
      left,
      top,
      width: widthValue,
      height: heightValue,
    });
    readyInfo.instance.updateFlexStyle(ids.labelId, {
      left,
      top: labelTop,
    });
    readyInfo.instance.updateTextProps(ids.textId, {
      content: label,
    });
  }, [readyInfo, debugIndicator, selectedNodeId, selectedNodePath, setIndicatorVisible, ensureIndicatorNodes]);

  useEffect(() => {
    if (!readyInfo) return;
    if (!didSkipFirstUpdateRef.current) {
      didSkipFirstUpdateRef.current = true;
      return;
    }
    readyInfo.instance.update(layout).then(() => {
      const ids = indicatorIdsRef.current;
      ids.rootId = null;
      ids.borderId = null;
      ids.labelId = null;
      ids.textId = null;
      setSelectedNodeId(null);
      setSelectedNodePath(null);
    }).catch(() => {});
  }, [readyInfo, layout]);

  useEffect(() => {
    if (!readyInfo || !debugIndicator) return;
    const handler = () => updateIndicatorPosition();
    readyInfo.instance.on('scroll', handler);
    return () => {
      readyInfo.instance.off('scroll', handler);
    };
  }, [readyInfo, debugIndicator, updateIndicatorPosition]);

  useEffect(() => {
    if (!readyInfo || !debugIndicator) return;
    if (!selectedNodeId && !selectedNodePath) {
      const ids = indicatorIdsRef.current;
      if (ids.rootId) setIndicatorVisible(false);
      return;
    }
    updateIndicatorPosition();
  }, [readyInfo, debugIndicator, selectedNodeId, selectedNodePath, updateIndicatorPosition, setIndicatorVisible]);

  const getTouchPoint = React.useCallback((event: unknown, pref?: TouchCoordPreference | null): { x: number; y: number; pref: TouchCoordPreference; debug: TouchPointDebug } | null => {
    if (!readyInfo) return null;
    const e = event as {
      detail?: { x?: number; y?: number };
      touches?: Array<{ x?: number; y?: number; clientX?: number; clientY?: number; pageX?: number; pageY?: number }>;
      changedTouches?: Array<{ x?: number; y?: number; clientX?: number; clientY?: number; pageX?: number; pageY?: number }>;
    };

    const pr = initInfoRef.current?.pixelRatio ?? (typeof pixelRatio === 'number' && pixelRatio > 0 ? pixelRatio : 1);
    const logicalW = initInfoRef.current?.width ?? (typeof displayWidth === 'number' ? displayWidth : undefined);
    const logicalH = initInfoRef.current?.height ?? (typeof displayHeight === 'number' ? displayHeight : undefined);

    const candidates: Array<{ x: number; y: number; source: TouchPointSource }> = [];
    if (e.detail && typeof e.detail.x === 'number' && typeof e.detail.y === 'number') {
      candidates.push({ x: e.detail.x, y: e.detail.y, source: 'detail' });
    }
    const touch = e.touches?.[0] ?? e.changedTouches?.[0];
    if (touch) {
      const rawX = typeof touch.clientX === 'number' ? touch.clientX : touch.pageX;
      const rawY = typeof touch.clientY === 'number' ? touch.clientY : touch.pageY;
      if (typeof touch.x === 'number' && typeof touch.y === 'number') {
        if (typeof rawX === 'number' && typeof rawY === 'number') {
          canvasRectRef.current = { left: rawX - touch.x, top: rawY - touch.y };
        }
        candidates.push({ x: touch.x, y: touch.y, source: 'touchLocal' });
      } else {
        if (
          typeof rawX === 'number'
          && typeof rawY === 'number'
          && e.detail
          && typeof e.detail.x === 'number'
          && typeof e.detail.y === 'number'
        ) {
          canvasRectRef.current = { left: rawX - e.detail.x, top: rawY - e.detail.y };
        }
        if (typeof rawX === 'number' && typeof rawY === 'number') {
          const rect = canvasRectRef.current;
          candidates.push({
            x: rect ? rawX - rect.left : rawX,
            y: rect ? rawY - rect.top : rawY,
            source: 'touchClient',
          });
        }
      }
    }
    if (candidates.length === 0) return null;

    const tree = readyInfo.instance.getTreeManager().getTree();
    const ids = indicatorIdsRef.current;
    const scrollManager = readyInfo.instance.getScrollManager();

    const fitsCanvas = (p: { x: number; y: number }) => {
      if (typeof logicalW === 'number' && (p.x < -1 || p.x > logicalW + 1)) return false;
      if (typeof logicalH === 'number' && (p.y < -1 || p.y > logicalH + 1)) return false;
      return true;
    };

    const expanded: Array<{ x: number; y: number; source: TouchPointSource; scaled: boolean }> = [];
    for (const c of candidates) {
      const unscaled = { x: c.x, y: c.y, source: c.source, scaled: false as const };
      const scaled = { x: c.x / pr, y: c.y / pr, source: c.source, scaled: true as const };
      if (fitsCanvas(unscaled)) {
        expanded.push(unscaled);
      } else if (pr > 1 && fitsCanvas(scaled)) {
        expanded.push(scaled);
      } else {
        expanded.push(unscaled);
        if (pr > 1) expanded.push(scaled);
      }
    }

    if (pref) {
      const p = expanded.find((it) => it.source === pref.source && it.scaled === pref.scaled);
      if (p && fitsCanvas(p)) {
        return {
          x: p.x,
          y: p.y,
          pref: { source: p.source, scaled: p.scaled },
          debug: {
            pr,
            logicalW,
            logicalH,
            canvasRect: canvasRectRef.current,
            candidates,
            expanded,
            requestedPref: pref,
            chosen: { x: p.x, y: p.y, source: p.source, scaled: p.scaled },
            chosenHitId: null,
            returnedBy: 'pref',
          },
        };
      }
    }

    let best = expanded[0];
    let bestDepth = -1;
    let bestSourceRank = 10;
    let bestHitId: string | null = null;
    for (const p of expanded) {
      if (!fitsCanvas(p)) continue;
      const hitId = hitTestExcluding(tree, p.x, p.y, scrollManager, ids.namePrefix);
      if (!hitId) continue;
      const depth = getNodeDepth(tree, hitId);
      const sourceRank = p.source === 'touchLocal' ? 0 : p.source === 'detail' ? 1 : 2;
      if (depth > bestDepth || (depth === bestDepth && sourceRank < bestSourceRank)) {
        bestDepth = depth;
        best = p;
        bestSourceRank = sourceRank;
        bestHitId = hitId;
      }
    }
    return {
      x: best.x,
      y: best.y,
      pref: { source: best.source, scaled: best.scaled },
      debug: {
        pr,
        logicalW,
        logicalH,
        canvasRect: canvasRectRef.current,
        candidates,
        expanded,
        requestedPref: pref ?? null,
        chosen: { x: best.x, y: best.y, source: best.source, scaled: best.scaled },
        chosenHitId: bestHitId,
        returnedBy: 'scan',
      },
    };
  }, [readyInfo, pixelRatio, displayWidth, displayHeight]);

  const handleTouchStart = (event: unknown) => {
    if (!readyInfo) return;
    const point = getTouchPoint(event);
    if (!point) return;
    logIndicatorDebug({ phase: 'touchStart', point: { x: point.x, y: point.y, pref: point.pref }, debug: point.debug });
    tapStateRef.current = { x: point.x, y: point.y, moved: false };
    const tree = readyInfo.instance.getTreeManager().getTree();
    const ids = indicatorIdsRef.current;
    const hitNodeId = hitTestExcluding(tree, point.x, point.y, readyInfo.instance.getScrollManager(), ids.namePrefix);
    const scrollViewId = hitNodeId ? findAncestorScrollView(tree, hitNodeId) : null;
    touchStateRef.current = { x: point.x, y: point.y, scrollViewId, pref: point.pref };
  };

  const handleTouchMove = (event: unknown) => {
    if (!readyInfo) return;
    const state = touchStateRef.current;
    if (!state?.scrollViewId) return;
    const scrollViewId = state.scrollViewId;
    const point = getTouchPoint(event, state.pref);
    if (!point) return;
    if (tapStateRef.current && Math.hypot(point.x - tapStateRef.current.x, point.y - tapStateRef.current.y) > 6) {
      tapStateRef.current.moved = true;
    }
    const dx = state.x - point.x;
    const dy = state.y - point.y;
    state.x = point.x;
    state.y = point.y;
    const tree = readyInfo.instance.getTreeManager().getTree();
    const node = tree.nodes[scrollViewId];
    const isVertical = node?.scrollViewProps?.scrollDirection !== 'horizontal';
    const changed = readyInfo.instance.getScrollManager().scroll(
      scrollViewId,
      isVertical ? 0 : dx,
      isVertical ? dy : 0,
    );
    if (!changed) return;
    const scrollManager = readyInfo.instance.getScrollManager();
    scrollManager.showScrollBar(scrollViewId);
    const timers = scrollBarTimersRef.current;
    const existing = timers.get(scrollViewId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      timers.delete(scrollViewId);
      scrollManager.setScrollBarOpacity(scrollViewId, 0);
      readyInfo.instance.render();
    }, 800);
    timers.set(scrollViewId, timer);
    readyInfo.instance.render();
  };

  const handleTouchEnd = (event?: unknown) => {
    touchStateRef.current = null;
    if (!readyInfo || !debugIndicator || !tapStateRef.current) {
      tapStateRef.current = null;
      return;
    }
    const { x, y, moved } = tapStateRef.current;
    tapStateRef.current = null;
    if (moved) return;
    const tree = readyInfo.instance.getTreeManager().getTree();
    const ids = indicatorIdsRef.current;
    let selected = hitTestExcluding(tree, x, y, readyInfo.instance.getScrollManager(), ids.namePrefix);
    const pointFromEndEvent = event ? getTouchPoint(event) : null;
    if (selected) {
      const now = Date.now();
      const last = lastTapRef.current;
      if (last && last.nodeId === selected && now - last.time < 320) {
        const parentId = tree.nodes[selected]?.parentId ?? null;
        if (parentId) {
          selected = parentId;
        }
        lastTapRef.current = null;
      } else {
        lastTapRef.current = { time: now, nodeId: selected };
      }
    } else {
      lastTapRef.current = null;
    }
    if (selected === tree.rootId) {
      selected = null;
      lastTapRef.current = null;
    }
    const describeNode = (id: string | null) => {
      if (!id) return null;
      const node = tree.nodes[id];
      if (!node) return { id, missing: true };
      return {
        id,
        name: node.name ?? null,
        type: node.type ?? null,
        parentId: node.parentId ?? null,
        zIndex: node.visualStyle?.zIndex ?? 0,
        computedLayout: node.computedLayout,
      };
    };
    const selectedScrollOffset = selected
      ? getAncestorScrollOffset(tree, selected, readyInfo.instance.getScrollManager())
      : null;
    logIndicatorDebug({
      phase: 'touchEnd',
      tapPoint: { x, y },
      endEventPoint: pointFromEndEvent
        ? { x: pointFromEndEvent.x, y: pointFromEndEvent.y, pref: pointFromEndEvent.pref }
        : null,
      endEventDebug: pointFromEndEvent?.debug ?? null,
      hitId: selected,
      hitNode: describeNode(selected),
      hitNodePath: selected ? getNodePath(tree, selected) : null,
      hitNodeAncestorScrollOffset: selectedScrollOffset,
      rootId: tree.rootId,
    });
    setSelectedNodeId(selected);
    const nextPath = selected ? getNodePath(tree, selected) : null;
    setSelectedNodePath(nextPath);
    updateIndicatorPosition(selected, nextPath);
  };

  const resolveContainerStyle = (): React.CSSProperties | string | undefined => {
    if (typeof containerStyle === 'string') {
      return `${containerStyle}; position: relative;`;
    }
    const base: React.CSSProperties = { position: 'relative' };
    return { ...base, ...(containerStyle ?? {}) };
  };

  return (
    <View style={resolveContainerStyle()}>
      <Canvas
        id={canvasIdRef.current}
        type="2d"
        style={{
          width: typeof (canvasSize.width ?? displayWidth) === 'number' ? `${canvasSize.width ?? displayWidth}px` : undefined,
          height: typeof (canvasSize.height ?? displayHeight) === 'number' ? `${canvasSize.height ?? displayHeight}px` : undefined,
          ...(typeof canvasStyle === 'object' && canvasStyle ? canvasStyle : {}),
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />
      {error ? <View style={{ display: 'none' }}>{error.message}</View> : null}
    </View>
  );
}

function getAncestorScrollOffset(
  tree: { nodes: Record<string, { id: string; parentId?: string | null; type?: string }> },
  nodeId: string,
  scrollManager: { getOffset: (id: string) => { x: number; y: number } },
): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let current = tree.nodes[nodeId];
  while (current?.parentId) {
    const parent = tree.nodes[current.parentId];
    if (!parent) break;
    if (parent.type === 'scrollview') {
      const off = scrollManager.getOffset(parent.id);
      x += off.x;
      y += off.y;
    }
    current = parent;
  }
  return { x, y };
}

function getNodePath(
  tree: { rootId: string; nodes: Record<string, { id: string; parentId?: string | null; children?: string[] }> },
  nodeId: string,
): number[] | null {
  if (nodeId === tree.rootId) return [];
  const path: number[] = [];
  let current = tree.nodes[nodeId];
  while (current?.parentId) {
    const parent = tree.nodes[current.parentId];
    if (!parent || !parent.children) return null;
    const index = parent.children.indexOf(current.id);
    if (index < 0) return null;
    path.unshift(index);
    current = parent;
  }
  return path.length > 0 ? path : null;
}

function findNodeIdByPath(
  tree: { rootId: string; nodes: Record<string, { children?: string[] }> },
  path: number[],
): string | null {
  let currentId = tree.rootId;
  for (const index of path) {
    const node = tree.nodes[currentId];
    const childId = node?.children?.[index];
    if (!childId) return null;
    currentId = childId;
  }
  return currentId;
}

function findNodeIdByName(
  tree: { nodes: Record<string, { name?: string }> },
  name: string,
): string | null {
  const entries = Object.entries(tree.nodes);
  for (const [id, node] of entries) {
    if (node?.name === name) return id;
  }
  return null;
}

function findAncestorScrollView(
  tree: { nodes: Record<string, { id: string; parentId?: string | null; type?: string }> },
  nodeId: string,
): string | null {
  let current = tree.nodes[nodeId];
  while (current) {
    if (current.type === 'scrollview') return current.id;
    if (!current.parentId) break;
    current = tree.nodes[current.parentId];
  }
  return null;
}

function hitTestExcluding(
  tree: { rootId: string; nodes: Record<string, { id: string; name?: string; type?: string; visualStyle?: { zIndex?: number }; computedLayout: { left: number; top: number; width: number; height: number }; children: string[] }> },
  x: number,
  y: number,
  scrollManager: { getOffset: (id: string) => { x: number; y: number } } | undefined,
  namePrefix: string,
): string | null {
  const hit = (nodeId: string, cx: number, cy: number): string | null => {
    const node = tree.nodes[nodeId];
    if (!node) return null;
    const { left, top, width, height } = node.computedLayout;
    const inside = cx >= left && cx <= left + width && cy >= top && cy <= top + height;
    const isScrollView = node.type === 'scrollview';
    if (!inside) return null;
    const offset = isScrollView ? (scrollManager?.getOffset(nodeId) ?? { x: 0, y: 0 }) : { x: 0, y: 0 };
    const childX = cx + offset.x;
    const childY = cy + offset.y;
    const orderedChildren = node.children
      .map((id, index) => ({ id, index }))
      .sort((a, b) => {
        const nodeA = tree.nodes[a.id];
        const nodeB = tree.nodes[b.id];
        const zA = nodeA?.name?.startsWith(namePrefix) ? -Infinity : (nodeA?.visualStyle?.zIndex ?? 0);
        const zB = nodeB?.name?.startsWith(namePrefix) ? -Infinity : (nodeB?.visualStyle?.zIndex ?? 0);
        if (zA !== zB) return zA - zB;
        return a.index - b.index;
      })
      .map((item) => item.id);
    for (let i = orderedChildren.length - 1; i >= 0; i -= 1) {
      const childId = orderedChildren[i];
      const result = hit(childId, isScrollView ? childX : cx, isScrollView ? childY : cy);
      if (result) return result;
    }
    if (node.name && node.name.startsWith(namePrefix)) return null;
    return nodeId;
  };
  return hit(tree.rootId, x, y);
}

function getNodeDepth(
  tree: { nodes: Record<string, { parentId?: string | null }> },
  nodeId: string,
): number {
  let depth = 0;
  let current = tree.nodes[nodeId];
  while (current?.parentId) {
    depth += 1;
    current = tree.nodes[current.parentId];
    if (depth > 4096) break;
  }
  return depth;
}
