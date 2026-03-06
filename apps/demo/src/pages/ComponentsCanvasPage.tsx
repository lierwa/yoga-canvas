import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { EditorCanvas, useCanvasInteraction } from "@yoga-canvas/react";
import { PointerEventDispatcher, type NodeDescriptor } from "@yoga-canvas/core";
import { ArrowLeft, Crosshair } from "lucide-react";
import { DemoTopNav } from "../components/DemoTopNav";
import { ZoomControls } from "../editor/components/toolbar/ZoomControls";
import { useNodeTree } from "../editor/hooks/useNodeTree";
import { CodeSidebar } from "./components/CodeSidebar";
import { COMPONENTS_CANVAS_CONTENT } from "./components/ComponentsCanvasContent";

const CODE_TARGET_NAMES = new Set([
  "FrameView",
  "FrameText",
  "FrameTextClamp",
  "FrameImage",
  "FrameScrollView",
  "FrameFlexLayout",
  "FrameGridLayout",
]);

export default function ComponentsCanvasPage() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const didInitRef = useRef(false);
  const pointerRef = useRef<{
    startX: number;
    startY: number;
    x: number;
    y: number;
    moved: boolean;
    time: number;
  } | null>(null);
  const [codePanel, setCodePanel] = useState<{
    rootId: string;
    initialJSX?: string;
  } | null>(null);

  const {
    tree,
    ready,
    scrollManager,
    resizeNode,
    rotateNodeLive,
    moveAbsoluteNodeLive,
    moveNode,
    commitLiveUpdate,
  } = useNodeTree({ initialDescriptor: COMPONENTS_CANVAS_CONTENT });

  const treeRef = useRef(tree);
  useEffect(() => {
    treeRef.current = tree;
  }, [tree]);

  const dispatcherRef = useRef<PointerEventDispatcher | null>(null);
  if (!dispatcherRef.current) {
    dispatcherRef.current = new PointerEventDispatcher(() => treeRef.current, {
      scrollManager,
    });
  }
  useEffect(() => {
    dispatcherRef.current?.setScrollManager(scrollManager);
  }, [scrollManager]);

  const {
    selection,
    scale,
    offset,
    scrollTick,
    setScaleAt,
    resetView,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
  } = useCanvasInteraction(
    tree,
    resizeNode,
    rotateNodeLive,
    moveNode,
    commitLiveUpdate,
    scrollManager,
    moveAbsoluteNodeLive,
    { panOn: "any", selectionEnabled: false, transformEnabled: false },
  );

  const fitRoot = useCallback(
    (animate: boolean) => {
      const el = canvasContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const root = tree.nodes[tree.rootId];
      const rootW = root?.computedLayout.width ?? 0;
      const rootH = root?.computedLayout.height ?? 0;
      if (rootW <= 0 || rootH <= 0) return;

      const pad = 60;
      const scaleX = (rect.width - pad * 2) / rootW;
      const scaleY = (rect.height - pad * 2) / rootH;
      const fit = Math.min(scaleX, scaleY);
      const nextScale = Math.min(1, Math.max(fit, 0.1));

      resetView(rect.width, rect.height, {
        scale: Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1,
        targetId: tree.rootId,
        animate,
        durationMs: 420,
      });
    },
    [resetView, tree.nodes, tree.rootId],
  );

  const zoomTo = useCallback(
    (nextScale: number) => {
      const el = canvasContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const clamped = Math.min(Math.max(nextScale, 0.1), 5);
      setScaleAt(clamped, rect.width / 2, rect.height / 2);
    },
    [setScaleAt],
  );

  const resetZoom = useCallback(() => {
    fitRoot(true);
  }, [fitRoot]);

  useEffect(() => {
    if (!ready) return;
    if (didInitRef.current) return;
    const root = tree.nodes[tree.rootId];
    const rootW = root?.computedLayout.width ?? 0;
    const rootH = root?.computedLayout.height ?? 0;
    if (rootW <= 0 || rootH <= 0) return;
    didInitRef.current = true;
    fitRoot(false);
  }, [ready, tree.nodes, tree.rootId, fitRoot]);

  const handleCanvasMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      pointerRef.current = {
        startX: x,
        startY: y,
        x,
        y,
        moved: false,
        time: Date.now(),
      };
      handleMouseDown(e);
    },
    [handleMouseDown],
  );

  const handleCanvasMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      const ref = pointerRef.current;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (ref) {
        ref.x = x;
        ref.y = y;
        const dx = x - ref.startX;
        const dy = y - ref.startY;
        if (dx * dx + dy * dy > 25) ref.moved = true;
      }
      handleMouseMove(e);
      if (e.buttons !== 0) return;

      const canvasX = (x - offset.x) / scale;
      const canvasY = (y - offset.y) / scale;
      const hits =
        dispatcherRef.current?.getHitPath(canvasX, canvasY).slice(1) ?? [];
      const isOverCodeButton = hits.some((id) =>
        tree.nodes[id]?.name?.startsWith("CodeBtn_"),
      );
      e.currentTarget.style.cursor = isOverCodeButton ? "pointer" : "";
    },
    [handleMouseMove, offset.x, offset.y, scale, tree],
  );

  const getInitialJSXForNodeName = useCallback(
    (name: string | undefined): string | undefined => {
      const clampTitle = "Text: lineClamp";
      const clampLabel1 = "lineClamp: 1";
      const clampLabel3 = "lineClamp: 3";
      const clampSample1 =
        "This is a very long text that should be clamped to a single line with an ellipsis at the end. Keep adding more words so overflow always happens.";
      const clampSample3 =
        "After setting lineClamp, the text will be limited to a maximum number of lines; overflow ends with an ellipsis at the end of the last line. This extra sentence makes sure the content exceeds three lines under typical widths. Add one more sentence to guarantee overflow even on wider containers.";
      const scrollTitle = "ScrollView";
      const scrollHint =
        "Wheel scrolls ScrollView first; elsewhere wheel zooms, drag pans";

      if (name === "FrameTextClamp") {
        return `<View
  name="FrameTextClamp"
  style={{
    width: 1380,
    height: 300,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    boxShadow: { color: "rgba(15, 23, 42, 0.35)", blur: 28, offsetX: 0, offsetY: 14, spread: 0 },
    padding: 18,
    gap: 12,
    position: "relative",
  }}
>
  <Text style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{${JSON.stringify(
    clampTitle,
  )}}</Text>
  <View
    style={{
      width: "100%",
      flex: 1,
      backgroundColor: "#f8fafc",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#e2e8f0",
      padding: 14,
      gap: 10,
    }}
  >
    <Text style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>{${JSON.stringify(
      clampLabel1,
    )}}</Text>
    <Text
      style={{
        width: 320,
        fontSize: 14,
        lineHeight: 1.5,
        color: "#334155",
        whiteSpace: "nowrap",
        lineClamp: 1,
      }}
    >
      {${JSON.stringify(clampSample1)}}
    </Text>
    <Text style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", marginTop: 6 }}>{${JSON.stringify(
      clampLabel3,
    )}}</Text>
    <Text
      style={{
        width: 320,
        fontSize: 14,
        lineHeight: 1.5,
        color: "#334155",
        whiteSpace: "normal",
        lineClamp: 3,
      }}
    >
      {${JSON.stringify(clampSample3)}}
    </Text>
  </View>
</View>`;
      }
      if (name !== "FrameScrollView") return undefined;
      return `<View
  name="FrameScrollView"
  style={{
    width: 760,
    height: 520,
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    boxShadow: { color: "rgba(15, 23, 42, 0.35)", blur: 28, offsetX: 0, offsetY: 14, spread: 0 },
    padding: 18,
    gap: 12,
    position: "relative",
  }}
>
  <Text style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{${JSON.stringify(
    scrollTitle,
  )}}</Text>
  <Text style={{ fontSize: 11, color: "#64748b" }}>
    {${JSON.stringify(scrollHint)}}
  </Text>

  <ScrollView
    name="HorizontalScroll"
    scrollDirection="horizontal"
    scrollBarVisibility="auto"
    style={{
      width: "100%",
      height: 140,
      backgroundColor: "#f8fafc",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#e2e8f0",
      padding: 14,
      flexDirection: "row",
      gap: 12,
    }}
  >
    {Array.from({ length: 10 }).map((_, idx) => (
      <View
        key={idx}
        name={\`Item\${idx + 1}\`}
        style={{
          width: 120,
          height: 120,
          backgroundColor: "#111827",
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          boxShadow: { color: "rgba(15, 23, 42, 0.18)", blur: 18, offsetX: 0, offsetY: 10, spread: 0 },
        }}
      >
        <Text style={{ fontSize: 26, fontWeight: 800, color: "#ffffff" }}>{String(idx + 1)}</Text>
      </View>
    ))}
  </ScrollView>

  <ScrollView
    name="VerticalScroll"
    scrollDirection="vertical"
    scrollBarVisibility="auto"
    style={{
      width: "100%",
      height: 140,
      backgroundColor: "#f8fafc",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#e2e8f0",
      padding: 14,
      flexDirection: "column",
      gap: 10,
    }}
  >
    {Array.from({ length: 14 }).map((_, idx) => (
      <View
        key={idx}
        name={\`Row\${idx + 1}\`}
        style={{
          width: "100%",
          height: 42,
          backgroundColor: idx % 2 === 0 ? "#111827" : "#0b1220",
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          boxShadow: { color: "rgba(15, 23, 42, 0.10)", blur: 14, offsetX: 0, offsetY: 8, spread: 0 },
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: 800, color: "#ffffff" }}>{\`Row \${idx + 1}\`}</Text>
      </View>
    ))}
  </ScrollView>
</View>`;
    },
    [],
  );

  const handleCanvasMouseUp = useCallback(
    (e: ReactMouseEvent<HTMLCanvasElement>) => {
      const ref = pointerRef.current;
      pointerRef.current = null;
      handleMouseUp(e);

      if (!ref || ref.moved) return;
      if (Date.now() - ref.time > 450) return;

      const canvasX = (ref.x - offset.x) / scale;
      const canvasY = (ref.y - offset.y) / scale;
      const hits =
        dispatcherRef.current?.getHitPath(canvasX, canvasY).slice(1) ?? [];
      if (hits.length === 0) return;

      let targetId: string | null = null;
      let foundCodeBtn = false;
      for (let i = hits.length - 1; i >= 0; i--) {
        const node = tree.nodes[hits[i]];
        const name = node?.name;
        if (!name) continue;
        if (name.startsWith("CodeBtn_")) foundCodeBtn = true;
        if (foundCodeBtn && CODE_TARGET_NAMES.has(name)) {
          targetId = node.id;
          break;
        }
      }

      if (!targetId) return;
      const name = tree.nodes[targetId]?.name;
      setCodePanel({
        rootId: targetId,
        initialJSX: getInitialJSXForNodeName(name),
      });
    },
    [getInitialJSXForNodeName, handleMouseUp, offset.x, offset.y, scale, tree],
  );

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
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onWheel={handleWheel}
          onFocusNode={() => fitRoot(true)}
          renderFocusAction={(onFocus) => (
            <DemoTopNav
              variant="overlay"
              leftSlot={
                <button
                  type="button"
                  className="cursor-pointer flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-colors"
                  onClick={() => {
                    window.location.hash = "#/";
                  }}
                  title="Back to Home"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
              }
              centerSlot={
                <ZoomControls
                  scale={scale}
                  initialScale={1}
                  onScaleChange={zoomTo}
                  onResetView={resetZoom}
                />
              }
              rightSlot={
                <button
                  type="button"
                  onClick={onFocus}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50/80 border border-slate-200/70 text-xs font-semibold text-slate-700 hover:bg-white/80 transition-colors"
                  title="Locate"
                >
                  <Crosshair size={14} />
                  <span>Locate</span>
                </button>
              }
            />
          )}
        />
      </div>
      <CodeSidebar
        open={codePanel !== null}
        tree={tree}
        rootNodeId={codePanel?.rootId ?? tree.rootId}
        initialJSX={codePanel?.initialJSX}
        onClose={() => setCodePanel(null)}
      />
    </div>
  );
}

const COMPONENTS_CANVAS_CONTENT_LEGACY: NodeDescriptor = {
  type: "view",
  name: "DesignRoot",
  style: {
    width: 1540,
    height: "auto",
    minHeight: 1900,
    flexDirection: "column",
    backgroundColor: "#0f172a",
    padding: 80,
    gap: 48,
  },
  children: [
    {
      type: "view",
      name: "Header",
      style: { flexDirection: "column", gap: 6 },
      children: [
        {
          type: "text",
          name: "Title",
          content: "Yoga Canvas Component Specs",
          style: { fontSize: 22, fontWeight: 800, color: "#e2e8f0" },
        },
        {
          type: "text",
          name: "SubTitle",
          content:
            "View / Text / Image / ScrollView / Layout (Flex + Gap + Grid-like)",
          style: { fontSize: 12, color: "#94a3b8" },
        },
      ],
    },
    {
      type: "view",
      name: "RowTop",
      style: { flexDirection: "row", gap: 60, alignItems: "flex-start" },
      children: [
        {
          type: "view",
          name: "FrameView",
          style: {
            backgroundColor: "#ffffff",
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            boxShadow: {
              color: "rgba(15, 23, 42, 0.35)",
              blur: 28,
              offsetX: 0,
              offsetY: 14,
              spread: 0,
            },
            padding: 18,
            gap: 12,
            position: "relative",
            width: 560,
            height: 340,
          },
          children: [
            {
              type: "view",
              name: "CodeBtn_FrameView",
              style: {
                position: "absolute",
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 6,
                paddingBottom: 6,
                borderRadius: 999,
                backgroundColor: "#111827",
                boxShadow: {
                  color: "rgba(15, 23, 42, 0.16)",
                  blur: 14,
                  offsetX: 0,
                  offsetY: 8,
                  spread: 0,
                },
                zIndex: 5,
                top: 14,
                right: 14,
              },
              children: [
                {
                  type: "text",
                  name: "CodeBtnText_FrameView",
                  content: "Code",
                  style: { fontSize: 11, fontWeight: 900, color: "#ffffff" },
                },
              ],
            },
            {
              type: "view",
              name: "FrameViewHeader",
              style: {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              },
              children: [
                {
                  type: "text",
                  name: "FrameViewTitle",
                  content: "View",
                  style: { fontSize: 18, fontWeight: 800, color: "#0f172a" },
                },
              ],
            },
            {
              type: "view",
              name: "ViewSamplesRow",
              style: {
                flexDirection: "row",
                flex: 1,
                gap: 16,
                alignItems: "center",
              },
              children: [
                {
                  type: "view",
                  name: "SquareDefault",
                  style: {
                    width: "auto",
                    flex: 1,
                    height: 96,
                    backgroundColor: "#e2e8f0",
                    borderRadius: 0,
                  },
                },
                {
                  type: "view",
                  name: "SquareRounded",
                  style: {
                    width: "auto",
                    flex: 1,
                    height: 96,
                    backgroundColor: "#d1d5db",
                    borderRadius: 16,
                  },
                },
                {
                  type: "view",
                  name: "SquareRounded",
                  style: {
                    width: "auto",
                    flex: 1,
                    height: 96,
                    backgroundColor: "#d1d5db",
                    borderRadius: 9999,
                  },
                },
                {
                  type: "view",
                  name: "SquareBorder",
                  style: {
                    width: "auto",
                    flex: 1,
                    height: 96,
                    backgroundColor: "#e5e7eb",
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: "#64748b",
                  },
                },
                {
                  type: "view",
                  name: "SquareShadow",
                  style: {
                    width: "auto",
                    flex: 1,
                    height: 96,
                    backgroundColor: "#ffffff",
                    borderRadius: 6,
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.22)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                },
              ],
            },
            {
              type: "view",
              name: "ViewPropsList",
              style: { flexDirection: "column", gap: 6, marginTop: 4 },
              children: [
                {
                  type: "text",
                  name: "ViewPropsLine1",
                  content:
                    "Layout: width/height, flexDirection, justifyContent, alignItems, flexWrap",
                  style: { fontSize: 11, color: "#475569" },
                },
                {
                  type: "text",
                  name: "ViewPropsLine2",
                  content:
                    "Box: padding, margin, borderWidth, borderColor, borderRadius",
                  style: { fontSize: 11, color: "#475569" },
                },
                {
                  type: "text",
                  name: "ViewPropsLine3",
                  content:
                    "Visual: backgroundColor, opacity, boxShadow, zIndex",
                  style: { fontSize: 11, color: "#475569" },
                },
                {
                  type: "text",
                  name: "ViewPropsLine4",
                  content: "Position: position, left/top/right/bottom",
                  style: { fontSize: 11, color: "#475569" },
                },
              ],
            },
          ],
        },
        {
          type: "view",
          name: "FrameText",
          style: {
            backgroundColor: "#ffffff",
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            boxShadow: {
              color: "rgba(15, 23, 42, 0.35)",
              blur: 28,
              offsetX: 0,
              offsetY: 14,
              spread: 0,
            },
            padding: 18,
            gap: 10,
            position: "relative",
            width: 760,
            height: 340,
          },
          children: [
            {
              type: "view",
              name: "CodeBtn_FrameText",
              style: {
                position: "absolute",
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 6,
                paddingBottom: 6,
                borderRadius: 999,
                backgroundColor: "#111827",
                boxShadow: {
                  color: "rgba(15, 23, 42, 0.16)",
                  blur: 14,
                  offsetX: 0,
                  offsetY: 8,
                  spread: 0,
                },
                zIndex: 5,
                top: 14,
                right: 14,
              },
              children: [
                {
                  type: "text",
                  name: "CodeBtnText_FrameText",
                  content: "Code",
                  style: { fontSize: 11, fontWeight: 900, color: "#ffffff" },
                },
              ],
            },
            {
              type: "view",
              name: "FrameTextHeader",
              style: {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              },
              children: [
                {
                  type: "text",
                  name: "FrameTextTitle",
                  content: "Text",
                  style: { fontSize: 18, fontWeight: 800, color: "#0f172a" },
                },
              ],
            },
            {
              type: "view",
              name: "TextSamplesArea",
              style: {
                position: "relative",
                flex: 1,
                backgroundColor: "#f8fafc",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                padding: 14,
              },
              children: [
                {
                  type: "text",
                  name: "TextDefault",
                  content: "default style",
                  style: {
                    position: "absolute",
                    left: 44,
                    top: 36,
                    fontSize: 18,
                    color: "#0f172a",
                  },
                },
                {
                  type: "text",
                  name: "TextFontWeight",
                  content: "fontWeight",
                  style: {
                    position: "absolute",
                    left: 270,
                    top: 18,
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#0f172a",
                  },
                },
                {
                  type: "text",
                  name: "TextAlign",
                  content: "textAlign: center",
                  style: {
                    position: "absolute",
                    left: 290,
                    top: 85,
                    fontSize: 14,
                    color: "#334155",
                  },
                },
                {
                  type: "text",
                  name: "TextColor",
                  content: "color: red",
                  style: {
                    position: "absolute",
                    left: 560,
                    top: 22,
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#ef4444",
                  },
                },
                {
                  type: "text",
                  name: "TextFontFamily",
                  content: "fontFamily: serif",
                  style: {
                    position: "absolute",
                    left: 120,
                    top: 112,
                    fontSize: 18,
                    fontFamily: "serif",
                    color: "#0f172a",
                  },
                },
                {
                  type: "text",
                  name: "TextShadow",
                  content: "textShadow",
                  style: {
                    position: "absolute",
                    left: 470,
                    top: 150,
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#0f172a",
                    textShadow: {
                      color: "rgba(15, 23, 42, 0.35)",
                      blur: 10,
                      offsetX: 0,
                      offsetY: 3,
                    },
                  },
                },
              ],
            },
            {
              type: "view",
              name: "TextPropsList",
              style: { flexDirection: "column", gap: 6 },
              children: [
                {
                  type: "text",
                  name: "TextPropsLine1",
                  content: "Props: content, style",
                  style: { fontSize: 11, color: "#475569" },
                },
                {
                  type: "text",
                  name: "TextPropsLine2",
                  content:
                    "Style: fontSize, fontWeight, fontStyle, fontFamily, color",
                  style: { fontSize: 11, color: "#475569" },
                },
                {
                  type: "text",
                  name: "TextPropsLine3",
                  content:
                    "Style: lineHeight, textAlign, whiteSpace, textShadow",
                  style: { fontSize: 11, color: "#475569" },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "view",
      name: "RowTextClamp",
      style: { flexDirection: "row", gap: 60, alignItems: "flex-start" },
      children: [
        {
          type: "view",
          name: "FrameTextClamp",
          style: {
            backgroundColor: "#ffffff",
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            boxShadow: {
              color: "rgba(15, 23, 42, 0.35)",
              blur: 28,
              offsetX: 0,
              offsetY: 14,
              spread: 0,
            },
            padding: 18,
            gap: 10,
            position: "relative",
            width: 1380,
            height: 300,
          },
          children: [
            {
              type: "view",
              name: "CodeBtn_FrameTextClamp",
              style: {
                position: "absolute",
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 6,
                paddingBottom: 6,
                borderRadius: 999,
                backgroundColor: "#111827",
                boxShadow: {
                  color: "rgba(15, 23, 42, 0.16)",
                  blur: 14,
                  offsetX: 0,
                  offsetY: 8,
                  spread: 0,
                },
                zIndex: 5,
                top: 14,
                right: 14,
              },
              children: [
                {
                  type: "text",
                  name: "CodeBtnText_FrameTextClamp",
                  content: "Code",
                  style: { fontSize: 11, fontWeight: 900, color: "#ffffff" },
                },
              ],
            },
            {
              type: "view",
              name: "FrameTextClampHeader",
              style: { flexDirection: "column", gap: 4 },
              children: [
                {
                  type: "text",
                  name: "FrameTextClampTitle",
                  content: "Text: lineClamp",
                  style: { fontSize: 18, fontWeight: 800, color: "#0f172a" },
                },
                {
                  type: "text",
                  name: "FrameTextClampDesc",
                  content: "Clamp to N lines; overflow ends with ellipsis",
                  style: { fontSize: 11, color: "#64748b" },
                },
              ],
            },
            {
              type: "view",
              name: "TextClampArea",
              style: {
                flex: 1,
                backgroundColor: "#f8fafc",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                padding: 14,
                gap: 10,
              },
              children: [
                {
                  type: "text",
                  name: "TextClampLabel1",
                  content: "lineClamp: 1",
                  style: { fontSize: 12, fontWeight: 800, color: "#0f172a" },
                },
                {
                  type: "text",
                  name: "TextClampSample1",
                  content:
                    "This is a very long text that should be clamped to a single line with an ellipsis at the end.",
                  style: {
                    width: 320,
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: "#334155",
                    whiteSpace: "nowrap",
                    lineClamp: 1,
                  },
                },
                {
                  type: "text",
                  name: "TextClampLabel3",
                  content: "lineClamp: 3",
                  style: {
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#0f172a",
                    marginTop: 6,
                  },
                },
                {
                  type: "text",
                  name: "TextClampSample3",
                  content:
                    "After setting lineClamp, the text will be limited to a maximum number of lines; overflow ends with an ellipsis at the end of the last line. This extra sentence makes sure the content exceeds three lines under typical widths. Add one more sentence to guarantee overflow even on wider containers.",
                  style: {
                    width: 320,
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: "#334155",
                    whiteSpace: "normal",
                    lineClamp: 3,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "view",
      name: "RowMiddle",
      style: { flexDirection: "row", gap: 60, alignItems: "flex-start" },
      children: [
        {
          type: "view",
          name: "FrameImage",
          style: {
            backgroundColor: "#ffffff",
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            boxShadow: {
              color: "rgba(15, 23, 42, 0.35)",
              blur: 28,
              offsetX: 0,
              offsetY: 14,
              spread: 0,
            },
            padding: 18,
            gap: 12,
            position: "relative",
            width: 560,
            height: 520,
          },
          children: [
            {
              type: "view",
              name: "CodeBtn_FrameImage",
              style: {
                position: "absolute",
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 6,
                paddingBottom: 6,
                borderRadius: 999,
                backgroundColor: "#111827",
                boxShadow: {
                  color: "rgba(15, 23, 42, 0.16)",
                  blur: 14,
                  offsetX: 0,
                  offsetY: 8,
                  spread: 0,
                },
                zIndex: 5,
                top: 14,
                right: 14,
              },
              children: [
                {
                  type: "text",
                  name: "CodeBtnText_FrameImage",
                  content: "Code",
                  style: { fontSize: 11, fontWeight: 900, color: "#ffffff" },
                },
              ],
            },
            {
              type: "view",
              name: "FrameImageHeader",
              style: {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              },
              children: [
                {
                  type: "text",
                  name: "FrameImageTitle",
                  content: "Image",
                  style: { fontSize: 18, fontWeight: 800, color: "#0f172a" },
                },
              ],
            },
            {
              type: "view",
              name: "ImageRow",
              style: {
                flexDirection: "row",
                gap: 12,
                alignItems: "flex-start",
              },
              children: [
                {
                  type: "view",
                  name: "ImageContainCard",
                  style: {
                    flexDirection: "column",
                    gap: 8,
                    alignItems: "center",
                  },
                  children: [
                    {
                      type: "image",
                      name: "ImageContain",
                      src: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=500&auto=format&fit=crop",
                      objectFit: "contain",
                      style: {
                        width: 150,
                        height: 150,
                        backgroundColor: "#e2e8f0",
                        borderRadius: 12,
                      },
                    },
                    {
                      type: "text",
                      name: "ContainLabel",
                      content: "contain",
                      style: {
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#0f172a",
                      },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "ImageCoverCard",
                  style: {
                    flexDirection: "column",
                    gap: 8,
                    alignItems: "center",
                  },
                  children: [
                    {
                      type: "image",
                      name: "ImageCover",
                      src: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=500&auto=format&fit=crop",
                      objectFit: "cover",
                      style: {
                        width: 150,
                        height: 150,
                        backgroundColor: "#e2e8f0",
                        borderRadius: 12,
                      },
                    },
                    {
                      type: "text",
                      name: "CoverLabel",
                      content: "cover",
                      style: {
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#0f172a",
                      },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "ImageFillCard",
                  style: {
                    flexDirection: "column",
                    gap: 8,
                    alignItems: "center",
                  },
                  children: [
                    {
                      type: "image",
                      name: "ImageFill",
                      src: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=500&auto=format&fit=crop",
                      objectFit: "fill",
                      style: {
                        width: 150,
                        height: 150,
                        backgroundColor: "#e2e8f0",
                        borderRadius: 12,
                      },
                    },
                    {
                      type: "text",
                      name: "FillLabel",
                      content: "fill",
                      style: {
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#0f172a",
                      },
                    },
                  ],
                },
              ],
            },
            {
              type: "view",
              name: "ImagePropsList",
              style: { flexDirection: "column", gap: 6 },
              children: [
                {
                  type: "text",
                  name: "ImagePropsLine1",
                  content: "Props: src, objectFit (cover/contain/fill)",
                  style: { fontSize: 11, color: "#475569" },
                },
                {
                  type: "text",
                  name: "ImagePropsLine2",
                  content: "Style: width/height, borderRadius, backgroundColor",
                  style: { fontSize: 11, color: "#475569" },
                },
              ],
            },
          ],
        },
        {
          type: "view",
          name: "FrameScrollView",
          style: {
            backgroundColor: "#ffffff",
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            boxShadow: {
              color: "rgba(15, 23, 42, 0.35)",
              blur: 28,
              offsetX: 0,
              offsetY: 14,
              spread: 0,
            },
            padding: 18,
            gap: 12,
            position: "relative",
            width: 760,
            height: 520,
          },
          children: [
            {
              type: "view",
              name: "CodeBtn_FrameScrollView",
              style: {
                position: "absolute",
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 6,
                paddingBottom: 6,
                borderRadius: 999,
                backgroundColor: "#111827",
                boxShadow: {
                  color: "rgba(15, 23, 42, 0.16)",
                  blur: 14,
                  offsetX: 0,
                  offsetY: 8,
                  spread: 0,
                },
                zIndex: 5,
                top: 14,
                right: 14,
              },
              children: [
                {
                  type: "text",
                  name: "CodeBtnText_FrameScrollView",
                  content: "Code",
                  style: { fontSize: 11, fontWeight: 900, color: "#ffffff" },
                },
              ],
            },
            {
              type: "view",
              name: "FrameScrollHeader",
              style: {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              },
              children: [
                {
                  type: "text",
                  name: "FrameScrollTitle",
                  content: "ScrollView",
                  style: { fontSize: 18, fontWeight: 800, color: "#0f172a" },
                },
              ],
            },
            {
              type: "text",
              name: "ScrollHint",
              content:
                "Wheel scrolls ScrollView first; elsewhere wheel zooms, drag pans",
              style: { fontSize: 11, color: "#64748b" },
            },
            {
              type: "scrollview",
              name: "HorizontalScroll",
              scrollDirection: "horizontal",
              scrollBarVisibility: "auto",
              style: {
                width: "100%",
                height: 140,
                backgroundColor: "#f8fafc",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                padding: 14,
                flexDirection: "row",
                gap: 12,
              },
              children: [
                {
                  type: "view",
                  name: "Item1",
                  style: {
                    width: 120,
                    height: 120,
                    backgroundColor: "#111827",
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.18)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "ItemLabel1",
                      content: "1",
                      style: { fontSize: 26, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Item2",
                  style: {
                    width: 120,
                    height: 120,
                    backgroundColor: "#111827",
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.18)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "ItemLabel2",
                      content: "2",
                      style: { fontSize: 26, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Item3",
                  style: {
                    width: 120,
                    height: 120,
                    backgroundColor: "#111827",
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.18)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "ItemLabel3",
                      content: "3",
                      style: { fontSize: 26, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Item4",
                  style: {
                    width: 120,
                    height: 120,
                    backgroundColor: "#111827",
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.18)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "ItemLabel4",
                      content: "4",
                      style: { fontSize: 26, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Item5",
                  style: {
                    width: 120,
                    height: 120,
                    backgroundColor: "#111827",
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.18)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "ItemLabel5",
                      content: "5",
                      style: { fontSize: 26, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Item6",
                  style: {
                    width: 120,
                    height: 120,
                    backgroundColor: "#111827",
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.18)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "ItemLabel6",
                      content: "6",
                      style: { fontSize: 26, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Item7",
                  style: {
                    width: 120,
                    height: 120,
                    backgroundColor: "#111827",
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.18)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "ItemLabel7",
                      content: "7",
                      style: { fontSize: 26, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Item8",
                  style: {
                    width: 120,
                    height: 120,
                    backgroundColor: "#111827",
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.18)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "ItemLabel8",
                      content: "8",
                      style: { fontSize: 26, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Item9",
                  style: {
                    width: 120,
                    height: 120,
                    backgroundColor: "#111827",
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.18)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "ItemLabel9",
                      content: "9",
                      style: { fontSize: 26, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Item10",
                  style: {
                    width: 120,
                    height: 120,
                    backgroundColor: "#111827",
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.18)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "ItemLabel10",
                      content: "10",
                      style: { fontSize: 26, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
              ],
            },
            {
              type: "scrollview",
              name: "VerticalScroll",
              scrollDirection: "vertical",
              scrollBarVisibility: "auto",
              style: {
                width: "100%",
                height: 140,
                backgroundColor: "#f8fafc",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                padding: 14,
                flexDirection: "column",
                gap: 10,
              },
              children: [
                {
                  type: "view",
                  name: "Row1",
                  style: {
                    width: "100%",
                    height: 42,
                    backgroundColor: "#111827",
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.10)",
                      blur: 14,
                      offsetX: 0,
                      offsetY: 8,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "RowLabel1",
                      content: "Row 1",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Row2",
                  style: {
                    width: "100%",
                    height: 42,
                    backgroundColor: "#0b1220",
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.10)",
                      blur: 14,
                      offsetX: 0,
                      offsetY: 8,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "RowLabel2",
                      content: "Row 2",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Row3",
                  style: {
                    width: "100%",
                    height: 42,
                    backgroundColor: "#111827",
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.10)",
                      blur: 14,
                      offsetX: 0,
                      offsetY: 8,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "RowLabel3",
                      content: "Row 3",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Row4",
                  style: {
                    width: "100%",
                    height: 42,
                    backgroundColor: "#0b1220",
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.10)",
                      blur: 14,
                      offsetX: 0,
                      offsetY: 8,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "RowLabel4",
                      content: "Row 4",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Row5",
                  style: {
                    width: "100%",
                    height: 42,
                    backgroundColor: "#111827",
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.10)",
                      blur: 14,
                      offsetX: 0,
                      offsetY: 8,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "RowLabel5",
                      content: "Row 5",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Row6",
                  style: {
                    width: "100%",
                    height: 42,
                    backgroundColor: "#0b1220",
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.10)",
                      blur: 14,
                      offsetX: 0,
                      offsetY: 8,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "RowLabel6",
                      content: "Row 6",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Row7",
                  style: {
                    width: "100%",
                    height: 42,
                    backgroundColor: "#111827",
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.10)",
                      blur: 14,
                      offsetX: 0,
                      offsetY: 8,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "RowLabel7",
                      content: "Row 7",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Row8",
                  style: {
                    width: "100%",
                    height: 42,
                    backgroundColor: "#0b1220",
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.10)",
                      blur: 14,
                      offsetX: 0,
                      offsetY: 8,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "RowLabel8",
                      content: "Row 8",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Row9",
                  style: {
                    width: "100%",
                    height: 42,
                    backgroundColor: "#111827",
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.10)",
                      blur: 14,
                      offsetX: 0,
                      offsetY: 8,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "RowLabel9",
                      content: "Row 9",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Row10",
                  style: {
                    width: "100%",
                    height: 42,
                    backgroundColor: "#0b1220",
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.10)",
                      blur: 14,
                      offsetX: 0,
                      offsetY: 8,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "RowLabel10",
                      content: "Row 10",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Row11",
                  style: {
                    width: "100%",
                    height: 42,
                    backgroundColor: "#111827",
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.10)",
                      blur: 14,
                      offsetX: 0,
                      offsetY: 8,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "RowLabel11",
                      content: "Row 11",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Row12",
                  style: {
                    width: "100%",
                    height: 42,
                    backgroundColor: "#0b1220",
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.10)",
                      blur: 14,
                      offsetX: 0,
                      offsetY: 8,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "RowLabel12",
                      content: "Row 12",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Row13",
                  style: {
                    width: "100%",
                    height: 42,
                    backgroundColor: "#111827",
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.10)",
                      blur: 14,
                      offsetX: 0,
                      offsetY: 8,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "RowLabel13",
                      content: "Row 13",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "Row14",
                  style: {
                    width: "100%",
                    height: 42,
                    backgroundColor: "#0b1220",
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.10)",
                      blur: 14,
                      offsetX: 0,
                      offsetY: 8,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "RowLabel14",
                      content: "Row 14",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
              ],
            },
            {
              type: "view",
              name: "ScrollPropsList",
              style: { flexDirection: "column", gap: 6 },
              children: [
                {
                  type: "text",
                  name: "ScrollPropsLine1",
                  content: "Props: scrollDirection (vertical/horizontal)",
                  style: { fontSize: 11, color: "#475569" },
                },
                {
                  type: "text",
                  name: "ScrollPropsLine2",
                  content: "Props: scrollBarVisibility (auto/hidden)",
                  style: { fontSize: 11, color: "#475569" },
                },
                {
                  type: "text",
                  name: "ScrollPropsLine3",
                  content: "Behavior: wheel / drag to scroll (H5)",
                  style: { fontSize: 11, color: "#475569" },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: "view",
      name: "RowBottom",
      style: { flexDirection: "row", gap: 60, alignItems: "flex-start" },
      children: [
        {
          type: "view",
          name: "FrameFlexLayout",
          style: {
            backgroundColor: "#ffffff",
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            boxShadow: {
              color: "rgba(15, 23, 42, 0.35)",
              blur: 28,
              offsetX: 0,
              offsetY: 14,
              spread: 0,
            },
            padding: 18,
            gap: 10,
            position: "relative",
            width: 760,
            height: 760,
          },
          children: [
            {
              type: "view",
              name: "CodeBtn_FrameFlexLayout",
              style: {
                position: "absolute",
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 6,
                paddingBottom: 6,
                borderRadius: 999,
                backgroundColor: "#111827",
                boxShadow: {
                  color: "rgba(15, 23, 42, 0.16)",
                  blur: 14,
                  offsetX: 0,
                  offsetY: 8,
                  spread: 0,
                },
                zIndex: 5,
                top: 14,
                right: 14,
              },
              children: [
                {
                  type: "text",
                  name: "CodeBtnText_FrameFlexLayout",
                  content: "Code",
                  style: { fontSize: 11, fontWeight: 900, color: "#ffffff" },
                },
              ],
            },
            {
              type: "view",
              name: "FlexHeader",
              style: {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              },
              children: [
                {
                  type: "text",
                  name: "FlexTitle",
                  content: "Flex",
                  style: { fontSize: 18, fontWeight: 800, color: "#0f172a" },
                },
              ],
            },
            {
              type: "view",
              name: "FlexExplain",
              style: {
                flexDirection: "column",
                gap: 6,
                backgroundColor: "#eef2ff",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#c7d2fe",
                padding: 10,
              },
              children: [
                {
                  type: "text",
                  name: "FlexExplainLine1",
                  content:
                    "Like CSS Flex: the main axis is flexDirection, and the cross axis is perpendicular",
                  style: { fontSize: 11, fontWeight: 800, color: "#334155" },
                },
                {
                  type: "text",
                  name: "FlexExplainLine2",
                  content:
                    "Container: justifyContent (main-axis) / alignItems (cross-axis) / gap (spacing)",
                  style: { fontSize: 11, color: "#475569" },
                },
                {
                  type: "text",
                  name: "FlexExplainLine3",
                  content:
                    "Items: flex/flexGrow/flexShrink/flexBasis allocate remaining space; alignSelf overrides",
                  style: { fontSize: 11, color: "#475569" },
                },
                {
                  type: "text",
                  name: "FlexExplainLine4",
                  content:
                    "Supported: flexDirection / flexWrap / justifyContent / alignItems / alignSelf / flex* / gap; Not yet: alignContent / order / flexFlow",
                  style: { fontSize: 11, color: "#475569" },
                },
              ],
            },
            {
              type: "view",
              name: "JustifyGallery",
              style: {
                width: "100%",
                flexDirection: "column",
                backgroundColor: "#f8fafc",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                padding: 12,
                gap: 8,
              },
              children: [
                {
                  type: "text",
                  name: "JustifyTitle",
                  content: "justifyContent (row main axis):",
                  style: { fontSize: 11, fontWeight: 800, color: "#334155" },
                },
                {
                  type: "view",
                  name: "JustifyRow_flex_start",
                  style: {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  },
                  children: [
                    {
                      type: "text",
                      name: "JustifyLabel_flex_start",
                      content: "flex-start",
                      style: {
                        width: 92,
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#6b21a8",
                      },
                    },
                    {
                      type: "view",
                      name: "JustifyBar_flex_start",
                      style: {
                        flex: 1,
                        height: 44,
                        backgroundColor: "#7c3aed",
                        borderRadius: 12,
                        paddingLeft: 10,
                        paddingRight: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        gap: 10,
                      },
                      children: [
                        {
                          type: "view",
                          name: "JustifyA_flex_start",
                          style: {
                            width: 74,
                            height: 22,
                            borderRadius: 8,
                            backgroundColor: "#f97316",
                          },
                        },
                        {
                          type: "view",
                          name: "JustifyB_flex_start",
                          style: {
                            width: 44,
                            height: 22,
                            borderRadius: 8,
                            backgroundColor: "#f97316",
                          },
                        },
                        {
                          type: "view",
                          name: "JustifyC_flex_start",
                          style: {
                            width: 106,
                            height: 22,
                            borderRadius: 8,
                            backgroundColor: "#f97316",
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "view",
                  name: "JustifyRow_flex_end",
                  style: {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  },
                  children: [
                    {
                      type: "text",
                      name: "JustifyLabel_flex_end",
                      content: "flex-end",
                      style: {
                        width: 92,
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#6b21a8",
                      },
                    },
                    {
                      type: "view",
                      name: "JustifyBar_flex_end",
                      style: {
                        flex: 1,
                        height: 44,
                        backgroundColor: "#7c3aed",
                        borderRadius: 12,
                        paddingLeft: 10,
                        paddingRight: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 10,
                      },
                      children: [
                        {
                          type: "view",
                          name: "JustifyA_flex_end",
                          style: {
                            width: 74,
                            height: 22,
                            borderRadius: 8,
                            backgroundColor: "#f97316",
                          },
                        },
                        {
                          type: "view",
                          name: "JustifyB_flex_end",
                          style: {
                            width: 44,
                            height: 22,
                            borderRadius: 8,
                            backgroundColor: "#f97316",
                          },
                        },
                        {
                          type: "view",
                          name: "JustifyC_flex_end",
                          style: {
                            width: 106,
                            height: 22,
                            borderRadius: 8,
                            backgroundColor: "#f97316",
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "view",
                  name: "JustifyRow_center",
                  style: {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  },
                  children: [
                    {
                      type: "text",
                      name: "JustifyLabel_center",
                      content: "center",
                      style: {
                        width: 92,
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#6b21a8",
                      },
                    },
                    {
                      type: "view",
                      name: "JustifyBar_center",
                      style: {
                        flex: 1,
                        height: 44,
                        backgroundColor: "#7c3aed",
                        borderRadius: 12,
                        paddingLeft: 10,
                        paddingRight: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                      },
                      children: [
                        {
                          type: "view",
                          name: "JustifyA_center",
                          style: {
                            width: 74,
                            height: 22,
                            borderRadius: 8,
                            backgroundColor: "#f97316",
                          },
                        },
                        {
                          type: "view",
                          name: "JustifyB_center",
                          style: {
                            width: 44,
                            height: 22,
                            borderRadius: 8,
                            backgroundColor: "#f97316",
                          },
                        },
                        {
                          type: "view",
                          name: "JustifyC_center",
                          style: {
                            width: 106,
                            height: 22,
                            borderRadius: 8,
                            backgroundColor: "#f97316",
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "view",
                  name: "JustifyRow_space_between",
                  style: {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  },
                  children: [
                    {
                      type: "text",
                      name: "JustifyLabel_space_between",
                      content: "space-between",
                      style: {
                        width: 92,
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#6b21a8",
                      },
                    },
                    {
                      type: "view",
                      name: "JustifyBar_space_between",
                      style: {
                        flex: 1,
                        height: 44,
                        backgroundColor: "#7c3aed",
                        borderRadius: 12,
                        paddingLeft: 10,
                        paddingRight: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      },
                      children: [
                        {
                          type: "view",
                          name: "JustifyA_space_between",
                          style: {
                            width: 74,
                            height: 22,
                            borderRadius: 8,
                            backgroundColor: "#f97316",
                          },
                        },
                        {
                          type: "view",
                          name: "JustifyB_space_between",
                          style: {
                            width: 44,
                            height: 22,
                            borderRadius: 8,
                            backgroundColor: "#f97316",
                          },
                        },
                        {
                          type: "view",
                          name: "JustifyC_space_between",
                          style: {
                            width: 106,
                            height: 22,
                            borderRadius: 8,
                            backgroundColor: "#f97316",
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "view",
                  name: "JustifyRow_space_around",
                  style: {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  },
                  children: [
                    {
                      type: "text",
                      name: "JustifyLabel_space_around",
                      content: "space-around",
                      style: {
                        width: 92,
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#6b21a8",
                      },
                    },
                    {
                      type: "view",
                      name: "JustifyBar_space_around",
                      style: {
                        flex: 1,
                        height: 44,
                        backgroundColor: "#7c3aed",
                        borderRadius: 12,
                        paddingLeft: 10,
                        paddingRight: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-around",
                      },
                      children: [
                        {
                          type: "view",
                          name: "JustifyA_space_around",
                          style: {
                            width: 74,
                            height: 22,
                            borderRadius: 8,
                            backgroundColor: "#f97316",
                          },
                        },
                        {
                          type: "view",
                          name: "JustifyB_space_around",
                          style: {
                            width: 44,
                            height: 22,
                            borderRadius: 8,
                            backgroundColor: "#f97316",
                          },
                        },
                        {
                          type: "view",
                          name: "JustifyC_space_around",
                          style: {
                            width: 106,
                            height: 22,
                            borderRadius: 8,
                            backgroundColor: "#f97316",
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "view",
                  name: "JustifyRow_space_evenly",
                  style: {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  },
                  children: [
                    {
                      type: "text",
                      name: "JustifyLabel_space_evenly",
                      content: "space-evenly",
                      style: {
                        width: 92,
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#6b21a8",
                      },
                    },
                    {
                      type: "view",
                      name: "JustifyBar_space_evenly",
                      style: {
                        flex: 1,
                        height: 44,
                        backgroundColor: "#7c3aed",
                        borderRadius: 12,
                        paddingLeft: 10,
                        paddingRight: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-evenly",
                      },
                      children: [
                        {
                          type: "view",
                          name: "JustifyA_space_evenly",
                          style: {
                            width: 74,
                            height: 22,
                            borderRadius: 8,
                            backgroundColor: "#f97316",
                          },
                        },
                        {
                          type: "view",
                          name: "JustifyB_space_evenly",
                          style: {
                            width: 44,
                            height: 22,
                            borderRadius: 8,
                            backgroundColor: "#f97316",
                          },
                        },
                        {
                          type: "view",
                          name: "JustifyC_space_evenly",
                          style: {
                            width: 106,
                            height: 22,
                            borderRadius: 8,
                            backgroundColor: "#f97316",
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              type: "view",
              name: "FlexWrapDemo",
              style: {
                width: "100%",
                flex: 1,
                minHeight: 0,
                backgroundColor: "#f8fafc",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                padding: 12,
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
              },
              children: [
                {
                  type: "view",
                  name: "WrapItem1",
                  style: {
                    width: 110,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: "#0ea5e9",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  children: [
                    {
                      type: "text",
                      name: "WrapText1",
                      content: "#1",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "WrapItem2",
                  style: {
                    width: 110,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: "#a855f7",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  children: [
                    {
                      type: "text",
                      name: "WrapText2",
                      content: "#2",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "WrapItem3",
                  style: {
                    width: 110,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: "#14b8a6",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  children: [
                    {
                      type: "text",
                      name: "WrapText3",
                      content: "#3",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "WrapItem4",
                  style: {
                    width: 110,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: "#0ea5e9",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  children: [
                    {
                      type: "text",
                      name: "WrapText4",
                      content: "#4",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "WrapItem5",
                  style: {
                    width: 110,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: "#a855f7",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  children: [
                    {
                      type: "text",
                      name: "WrapText5",
                      content: "#5",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "WrapItem6",
                  style: {
                    width: 110,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: "#14b8a6",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  children: [
                    {
                      type: "text",
                      name: "WrapText6",
                      content: "#6",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "WrapItem7",
                  style: {
                    width: 110,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: "#0ea5e9",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  children: [
                    {
                      type: "text",
                      name: "WrapText7",
                      content: "#7",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "WrapItem8",
                  style: {
                    width: 110,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: "#a855f7",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  children: [
                    {
                      type: "text",
                      name: "WrapText8",
                      content: "#8",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "WrapItem9",
                  style: {
                    width: 110,
                    height: 46,
                    borderRadius: 14,
                    backgroundColor: "#14b8a6",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                  children: [
                    {
                      type: "text",
                      name: "WrapText9",
                      content: "#9",
                      style: { fontSize: 14, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
              ],
            },
            {
              type: "text",
              name: "WrapHint",
              content: "flexWrap: wrap + gap → card-flow layout",
              style: { fontSize: 11, color: "#64748b" },
            },
          ],
        },
        {
          type: "view",
          name: "FrameGridLayout",
          style: {
            backgroundColor: "#ffffff",
            borderRadius: 18,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            boxShadow: {
              color: "rgba(15, 23, 42, 0.35)",
              blur: 28,
              offsetX: 0,
              offsetY: 14,
              spread: 0,
            },
            padding: 18,
            gap: 10,
            position: "relative",
            width: 560,
            height: 760,
          },
          children: [
            {
              type: "view",
              name: "CodeBtn_FrameGridLayout",
              style: {
                position: "absolute",
                paddingLeft: 10,
                paddingRight: 10,
                paddingTop: 6,
                paddingBottom: 6,
                borderRadius: 999,
                backgroundColor: "#111827",
                boxShadow: {
                  color: "rgba(15, 23, 42, 0.16)",
                  blur: 14,
                  offsetX: 0,
                  offsetY: 8,
                  spread: 0,
                },
                zIndex: 5,
                top: 14,
                right: 14,
              },
              children: [
                {
                  type: "text",
                  name: "CodeBtnText_FrameGridLayout",
                  content: "Code",
                  style: { fontSize: 11, fontWeight: 900, color: "#ffffff" },
                },
              ],
            },
            {
              type: "view",
              name: "GridHeader",
              style: {
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              },
              children: [
                {
                  type: "text",
                  name: "GridTitle",
                  content: "Grid-like",
                  style: { fontSize: 18, fontWeight: 800, color: "#0f172a" },
                },
              ],
            },
            {
              type: "text",
              name: "GridExplain",
              content:
                "Yoga has no native grid; approximate with flexWrap + % width + rowGap/columnGap",
              style: { fontSize: 11, color: "#64748b" },
            },
            {
              type: "view",
              name: "GridLikeDemo",
              style: {
                width: "100%",
                flex: 1,
                minHeight: 0,
                backgroundColor: "#f8fafc",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                padding: 12,
                flexDirection: "row",
                flexWrap: "wrap",
                columnGap: 10,
                rowGap: 10,
              },
              children: [
                {
                  type: "view",
                  name: "GridItem1",
                  style: {
                    width: "31%",
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: "#111827",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.12)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "GridText1",
                      content: "Cell 1",
                      style: { fontSize: 12, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "GridItem2",
                  style: {
                    width: "31%",
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: "#111827",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.12)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "GridText2",
                      content: "Cell 2",
                      style: { fontSize: 12, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "GridItem3",
                  style: {
                    width: "31%",
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: "#111827",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.12)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "GridText3",
                      content: "Cell 3",
                      style: { fontSize: 12, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "GridItem4",
                  style: {
                    width: "31%",
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: "#111827",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.12)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "GridText4",
                      content: "Cell 4",
                      style: { fontSize: 12, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "GridItem5",
                  style: {
                    width: "31%",
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: "#111827",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.12)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "GridText5",
                      content: "Cell 5",
                      style: { fontSize: 12, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "GridItem6",
                  style: {
                    width: "31%",
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: "#111827",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.12)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "GridText6",
                      content: "Cell 6",
                      style: { fontSize: 12, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "GridItem7",
                  style: {
                    width: "31%",
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: "#111827",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.12)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "GridText7",
                      content: "Cell 7",
                      style: { fontSize: 12, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "GridItem8",
                  style: {
                    width: "31%",
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: "#111827",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.12)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "GridText8",
                      content: "Cell 8",
                      style: { fontSize: 12, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "GridItem9",
                  style: {
                    width: "31%",
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: "#111827",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.12)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "GridText9",
                      content: "Cell 9",
                      style: { fontSize: 12, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "GridItem10",
                  style: {
                    width: "31%",
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: "#111827",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.12)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "GridText10",
                      content: "Cell 10",
                      style: { fontSize: 12, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "GridItem11",
                  style: {
                    width: "31%",
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: "#111827",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.12)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "GridText11",
                      content: "Cell 11",
                      style: { fontSize: 12, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
                {
                  type: "view",
                  name: "GridItem12",
                  style: {
                    width: "31%",
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: "#111827",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: {
                      color: "rgba(15, 23, 42, 0.12)",
                      blur: 18,
                      offsetX: 0,
                      offsetY: 10,
                      spread: 0,
                    },
                  },
                  children: [
                    {
                      type: "text",
                      name: "GridText12",
                      content: "Cell 12",
                      style: { fontSize: 12, fontWeight: 800, color: "#ffffff" },
                    },
                  ],
                },
              ],
            },
            {
              type: "view",
              name: "LayoutPropsList",
              style: { flexDirection: "column", gap: 6, marginTop: 6 },
              children: [
                {
                  type: "text",
                  name: "LayoutProps1",
                  content:
                    "Flex: flexDirection / justifyContent / alignItems / flexWrap / gap",
                  style: { fontSize: 11, color: "#475569" },
                },
                {
                  type: "text",
                  name: "LayoutProps2",
                  content:
                    "Flex items: flex / flexGrow / flexShrink / flexBasis / alignSelf",
                  style: { fontSize: 11, color: "#475569" },
                },
                {
                  type: "text",
                  name: "LayoutProps3",
                  content: "Grid-like: flexWrap + % width + rowGap/columnGap",
                  style: { fontSize: 11, color: "#475569" },
                },
                {
                  type: "text",
                  name: "LayoutProps4",
                  content: "Not yet: alignContent / order / flexFlow",
                  style: { fontSize: 11, color: "#475569" },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

void COMPONENTS_CANVAS_CONTENT_LEGACY;
