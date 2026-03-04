import { useCallback, useEffect, useRef } from 'react';
import { EditorCanvas, useCanvasInteraction } from '@yoga-canvas/react';
import type { NodeDescriptor } from '@yoga-canvas/core';
import { Crosshair, Home } from 'lucide-react';
import { useNodeTree } from '../editor/hooks/useNodeTree';

export default function ComponentsCanvasPage() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const didInitRef = useRef(false);

  const {
    tree,
    ready,
    scrollManager,
    resizeNode,
    rotateNodeLive,
    moveAbsoluteNodeLive,
    moveNode,
    commitLiveUpdate,
  } = useNodeTree({ initialDescriptor: COMPONENTS_DESIGN_DESCRIPTOR });

  const {
    selection,
    scale,
    offset,
    scrollTick,
    focusNode,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleDoubleClick,
  } = useCanvasInteraction(
    tree,
    resizeNode,
    rotateNodeLive,
    moveNode,
    commitLiveUpdate,
    scrollManager,
    moveAbsoluteNodeLive,
  );

  const focusRoot = useCallback(
    (animate: boolean) => {
      const el = canvasContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      focusNode(tree.rootId, rect.width, rect.height, { animate, durationMs: 420 });
    },
    [focusNode, tree.rootId],
  );

  useEffect(() => {
    if (!ready) return;
    if (didInitRef.current) return;
    didInitRef.current = true;
    focusRoot(false);
  }, [ready, focusRoot]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-900">
      <div ref={canvasContainerRef} className="w-full h-full">
        <EditorCanvas
          tree={tree}
          selection={selection}
          scale={scale}
          offset={offset}
          scrollManager={scrollManager}
          renderTick={scrollTick}
          showGrid
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          onFocusNode={() => focusRoot(true)}
          renderFocusAction={(onFocus) => (
            <div className="absolute bottom-3 left-3 flex items-center gap-2">
              <button
                onClick={() => {
                  window.location.hash = '#/';
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/90 backdrop-blur border border-gray-200 rounded-lg shadow-sm text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
                title="Back"
              >
                <Home size={14} />
                <span>Back</span>
              </button>
              <button
                onClick={onFocus}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/90 backdrop-blur border border-gray-200 rounded-lg shadow-sm text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
                title="Focus selected node"
              >
                <Crosshair size={14} />
                <span>Locate</span>
              </button>
            </div>
          )}
        />
      </div>
    </div>
  );
}

const COMPONENTS_DESIGN_DESCRIPTOR: NodeDescriptor = {
  type: 'view',
  name: 'DesignRoot',
  style: {
    width: 2400,
    height: 1600,
    flexDirection: 'column',
    backgroundColor: '#0f172a',
  },
  children: [
    {
      type: 'text',
      name: 'Title',
      content: 'Yoga Canvas Component Specs',
      style: {
        position: 'absolute',
        left: 80,
        top: 42,
        fontSize: 22,
        fontWeight: 800,
        color: '#e2e8f0',
      },
    },
    {
      type: 'text',
      name: 'SubTitle',
      content: '每个组件单独一个画布区域：View / Text / Image / ScrollView',
      style: {
        position: 'absolute',
        left: 80,
        top: 74,
        fontSize: 12,
        color: '#94a3b8',
      },
    },
    {
      type: 'view',
      name: 'FrameView',
      style: {
        position: 'absolute',
        left: 80,
        top: 120,
        width: 560,
        height: 340,
        backgroundColor: '#ffffff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        boxShadow: { color: 'rgba(15, 23, 42, 0.35)', blur: 28, offsetX: 0, offsetY: 14, spread: 0 },
        padding: 18,
        gap: 12,
      },
      children: [
        { type: 'text', name: 'FrameViewTitle', content: 'View', style: { fontSize: 18, fontWeight: 800, color: '#0f172a' } },
        {
          type: 'view',
          name: 'ViewSamplesRow',
          style: { flexDirection: 'row', gap: 16, alignItems: 'center' },
          children: [
            {
              type: 'view',
              name: 'SquareDefault',
              style: { width: 96, height: 96, backgroundColor: '#e2e8f0', borderRadius: 0 },
            },
            {
              type: 'view',
              name: 'SquareRounded',
              style: { width: 96, height: 96, backgroundColor: '#d1d5db', borderRadius: 16 },
            },
            {
              type: 'view',
              name: 'SquareBorder',
              style: { width: 96, height: 96, backgroundColor: '#e5e7eb', borderRadius: 4, borderWidth: 2, borderColor: '#64748b' },
            },
            {
              type: 'view',
              name: 'SquareShadow',
              style: {
                width: 96,
                height: 96,
                backgroundColor: '#ffffff',
                borderRadius: 6,
                boxShadow: { color: 'rgba(15, 23, 42, 0.22)', blur: 18, offsetX: 0, offsetY: 10, spread: 0 },
              },
            },
          ],
        },
        {
          type: 'view',
          name: 'ViewPropsList',
          style: { flexDirection: 'column', gap: 6, marginTop: 4 },
          children: [
            { type: 'text', name: 'ViewPropsLine1', content: 'Layout: width/height, flexDirection, justifyContent, alignItems, gap', style: { fontSize: 11, color: '#475569' } },
            { type: 'text', name: 'ViewPropsLine2', content: 'Box: padding, margin, borderWidth, borderColor, borderRadius', style: { fontSize: 11, color: '#475569' } },
            { type: 'text', name: 'ViewPropsLine3', content: 'Visual: backgroundColor, opacity, boxShadow, zIndex', style: { fontSize: 11, color: '#475569' } },
            { type: 'text', name: 'ViewPropsLine4', content: 'Position: position, left/top/right/bottom', style: { fontSize: 11, color: '#475569' } },
          ],
        },
      ],
    },
    {
      type: 'view',
      name: 'FrameText',
      style: {
        position: 'absolute',
        left: 700,
        top: 120,
        width: 760,
        height: 340,
        backgroundColor: '#ffffff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        boxShadow: { color: 'rgba(15, 23, 42, 0.35)', blur: 28, offsetX: 0, offsetY: 14, spread: 0 },
        padding: 18,
        gap: 10,
      },
      children: [
        { type: 'text', name: 'FrameTextTitle', content: 'Text', style: { fontSize: 18, fontWeight: 800, color: '#0f172a' } },
        {
          type: 'view',
          name: 'TextSamplesArea',
          style: {
            position: 'relative',
            flex: 1,
            backgroundColor: '#f8fafc',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            padding: 14,
          },
          children: [
            { type: 'text', name: 'TextDefault', content: 'default style', style: { position: 'absolute', left: 24, top: 26, fontSize: 18, color: '#0f172a' } },
            { type: 'text', name: 'TextFontWeight', content: 'fontWeight', style: { position: 'absolute', left: 270, top: 18, fontSize: 24, fontWeight: 800, color: '#0f172a' } },
            { type: 'text', name: 'TextAlign', content: 'textAlign: center', style: { position: 'absolute', left: 290, top: 54, fontSize: 14, color: '#334155' } },
            { type: 'text', name: 'TextColor', content: 'color: red', style: { position: 'absolute', left: 560, top: 22, fontSize: 18, fontWeight: 700, color: '#ef4444' } },
            { type: 'text', name: 'TextFontFamily', content: 'fontFamily: serif', style: { position: 'absolute', left: 120, top: 132, fontSize: 18, fontFamily: 'serif', color: '#0f172a' } },
            {
              type: 'text',
              name: 'TextShadow',
              content: 'textShadow',
              style: {
                position: 'absolute',
                left: 470,
                top: 150,
                fontSize: 20,
                fontWeight: 700,
                color: '#0f172a',
                textShadow: { color: 'rgba(15, 23, 42, 0.35)', blur: 10, offsetX: 0, offsetY: 3 },
              },
            },
          ],
        },
        {
          type: 'view',
          name: 'TextPropsList',
          style: { flexDirection: 'column', gap: 6 },
          children: [
            { type: 'text', name: 'TextPropsLine1', content: 'Props: content, style', style: { fontSize: 11, color: '#475569' } },
            { type: 'text', name: 'TextPropsLine2', content: 'Style: fontSize, fontWeight, fontStyle, fontFamily, color', style: { fontSize: 11, color: '#475569' } },
            { type: 'text', name: 'TextPropsLine3', content: 'Style: lineHeight, textAlign, whiteSpace, textShadow', style: { fontSize: 11, color: '#475569' } },
          ],
        },
      ],
    },
    {
      type: 'view',
      name: 'FrameImage',
      style: {
        position: 'absolute',
        left: 80,
        top: 520,
        width: 560,
        height: 310,
        backgroundColor: '#ffffff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        boxShadow: { color: 'rgba(15, 23, 42, 0.35)', blur: 28, offsetX: 0, offsetY: 14, spread: 0 },
        padding: 18,
        gap: 12,
      },
      children: [
        { type: 'text', name: 'FrameImageTitle', content: 'Image', style: { fontSize: 18, fontWeight: 800, color: '#0f172a' } },
        {
          type: 'view',
          name: 'ImageRow',
          style: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' },
          children: [
            {
              type: 'view',
              name: 'ImageContainCard',
              style: { flexDirection: 'column', gap: 8, alignItems: 'center' },
              children: [
                {
                  type: 'image',
                  name: 'ImageContain',
                  src: 'https://images.unsplash.com/photo-1520975958225-3f61d9f40a45?q=80&w=500&auto=format&fit=crop',
                  objectFit: 'contain',
                  style: { width: 170, height: 110, backgroundColor: '#e2e8f0', borderRadius: 12 },
                },
                { type: 'text', name: 'ContainLabel', content: 'contain', style: { fontSize: 12, fontWeight: 700, color: '#0f172a' } },
              ],
            },
            {
              type: 'view',
              name: 'ImageCoverCard',
              style: { flexDirection: 'column', gap: 8, alignItems: 'center' },
              children: [
                {
                  type: 'image',
                  name: 'ImageCover',
                  src: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=500&auto=format&fit=crop',
                  objectFit: 'cover',
                  style: { width: 170, height: 110, backgroundColor: '#e2e8f0', borderRadius: 12 },
                },
                { type: 'text', name: 'CoverLabel', content: 'cover', style: { fontSize: 12, fontWeight: 700, color: '#0f172a' } },
              ],
            },
          ],
        },
        {
          type: 'view',
          name: 'ImagePropsList',
          style: { flexDirection: 'column', gap: 6 },
          children: [
            { type: 'text', name: 'ImagePropsLine1', content: 'Props: src, objectFit (cover/contain/fill)', style: { fontSize: 11, color: '#475569' } },
            { type: 'text', name: 'ImagePropsLine2', content: 'Style: width/height, borderRadius, backgroundColor', style: { fontSize: 11, color: '#475569' } },
          ],
        },
      ],
    },
    {
      type: 'view',
      name: 'FrameScrollView',
      style: {
        position: 'absolute',
        left: 700,
        top: 520,
        width: 760,
        height: 310,
        backgroundColor: '#ffffff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        boxShadow: { color: 'rgba(15, 23, 42, 0.35)', blur: 28, offsetX: 0, offsetY: 14, spread: 0 },
        padding: 18,
        gap: 12,
      },
      children: [
        { type: 'text', name: 'FrameScrollTitle', content: 'ScrollView', style: { fontSize: 18, fontWeight: 800, color: '#0f172a' } },
        {
          type: 'scrollview',
          name: 'HorizontalScroll',
          scrollDirection: 'horizontal',
          scrollBarVisibility: 'auto',
          style: {
            width: '100%',
            height: 170,
            backgroundColor: '#f8fafc',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: '#e2e8f0',
            padding: 14,
            flexDirection: 'row',
            gap: 12,
          },
          children: [
            ...Array.from({ length: 10 }).map((_, idx) => ({
              type: 'view' as const,
              name: `Item${idx + 1}`,
              style: {
                width: 120,
                height: 120,
                backgroundColor: '#111827',
                borderRadius: 14,
                alignItems: 'center' as const,
                justifyContent: 'center' as const,
                boxShadow: { color: 'rgba(15, 23, 42, 0.18)', blur: 18, offsetX: 0, offsetY: 10, spread: 0 },
              } as NodeDescriptor['style'],
              children: [
                {
                  type: 'text' as const,
                  name: `ItemLabel${idx + 1}`,
                  content: String(idx + 1),
                  style: { fontSize: 26, fontWeight: 800, color: '#ffffff' },
                },
              ],
            })),
          ],
        },
        {
          type: 'view',
          name: 'ScrollPropsList',
          style: { flexDirection: 'column', gap: 6 },
          children: [
            { type: 'text', name: 'ScrollPropsLine1', content: 'Props: scrollDirection (vertical/horizontal)', style: { fontSize: 11, color: '#475569' } },
            { type: 'text', name: 'ScrollPropsLine2', content: 'Props: scrollBarVisibility (auto/hidden)', style: { fontSize: 11, color: '#475569' } },
            { type: 'text', name: 'ScrollPropsLine3', content: 'Behavior: wheel / drag to scroll (H5)', style: { fontSize: 11, color: '#475569' } },
          ],
        },
      ],
    },
  ],
};
