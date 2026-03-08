import { useState, useEffect, type ChangeEvent } from "react";
import { Trash2 } from "lucide-react";
import type {
  CanvasNode,
  FlexStyle,
  VisualStyle,
  TextProps,
  ImageProps,
} from "../types";
import type { MotionSpec } from "@yoga-canvas/core";
import type { NodeEventBindings } from "@yoga-canvas/core";
import {
  ColorField,
  DimensionField,
  FieldGrid,
  FileInputButton,
  IconButton,
  NumberField,
  Section,
  SelectField,
  SubHeader,
  TextAreaField,
} from "./property-controls";
import MotionPanel from "./MotionPanel";
import EventsPanel from "./EventsPanel";
import { Button } from "../../components/Button";

interface PropertiesPanelProps {
  node: CanvasNode | null;
  onUpdateFlexStyle: (nodeId: string, updates: Partial<FlexStyle>) => void;
  onUpdateVisualStyle: (nodeId: string, updates: Partial<VisualStyle>) => void;
  onUpdateTextProps: (nodeId: string, updates: Partial<TextProps>) => void;
  onUpdateImageProps: (nodeId: string, updates: Partial<ImageProps>) => void;
  onUpdateMotion?: (nodeId: string, motion: MotionSpec | undefined) => void;
  onUpdateEvents?: (nodeId: string, events: NodeEventBindings | undefined) => void;
}

const FLEX_DIRECTIONS = [
  "row",
  "column",
  "row-reverse",
  "column-reverse",
] as const;
const JUSTIFY_OPTIONS = [
  "flex-start",
  "center",
  "flex-end",
  "space-between",
  "space-around",
  "space-evenly",
] as const;
const ALIGN_OPTIONS = ["flex-start", "center", "flex-end", "stretch"] as const;
const WRAP_OPTIONS = ["nowrap", "wrap"] as const;
const TEXT_WRAP_OPTIONS = ["wrap", "nowrap"] as const;
const FONT_STYLE_OPTIONS = ["normal", "italic", "oblique"] as const;
const OVERFLOW_OPTIONS = ["visible", "hidden"] as const;
const FONT_WEIGHT_OPTIONS = [
  "normal",
  "bold",
  "bolder",
  "lighter",
  "400",
  "500",
  "600",
  "700",
] as const;
export default function PropertiesPanel({
  node,
  onUpdateFlexStyle,
  onUpdateVisualStyle,
  onUpdateTextProps,
  onUpdateImageProps,
  onUpdateMotion,
  onUpdateEvents,
}: PropertiesPanelProps) {
  const [textContent, setTextContent] = useState(
    node?.textProps?.content ?? "",
  );
  const [textContentFocused, setTextContentFocused] = useState(false);
  const [gradientCss, setGradientCss] = useState(() => {
    const g = node?.visualStyle?.linearGradient;
    return typeof g === "string" ? g : "";
  });
  const [gradientCssFocused, setGradientCssFocused] = useState(false);
  const [panelTab, setPanelTab] = useState<"properties" | "animation" | "events">(
    "properties",
  );

  useEffect(() => {
    if (!textContentFocused) {
      setTextContent(node?.textProps?.content ?? "");
    }
  }, [node?.id, node?.textProps?.content, textContentFocused]);

  useEffect(() => {
    if (!gradientCssFocused) {
      const g = node?.visualStyle?.linearGradient;
      setGradientCss(typeof g === "string" ? g : "");
    }
  }, [node?.id, node?.visualStyle?.linearGradient, gradientCssFocused]);

  if (!node) {
    return (
      <div className="w-72 border-l border-gray-200 bg-white p-4 overflow-y-auto shrink-0">
        <p className="text-sm text-gray-400 text-center mt-8">
          Select a node to edit properties
        </p>
      </div>
    );
  }

  const hasAnimationPanel = !!onUpdateMotion;
  const hasEventsPanel = !!onUpdateEvents;
  const activeTab =
    panelTab === "animation" && !hasAnimationPanel
      ? "properties"
      : panelTab === "events" && !hasEventsPanel
        ? "properties"
        : panelTab;

  const s = node.flexStyle;
  const v = node.visualStyle;
  const boxShadow = v.boxShadow ?? null;
  const gradient = v.linearGradient ?? null;
  const textShadow = node.textProps?.textShadow ?? null;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const textFontSizeRaw = node.textProps?.fontSize ?? 14;
  const textFontSize = Number.isFinite(textFontSizeRaw) && textFontSizeRaw > 0 ? textFontSizeRaw : 14;
  const rawLineHeight = node.textProps?.lineHeight ?? 1.4;
  const lineHeightPx =
    Number.isFinite(rawLineHeight) && rawLineHeight > 0
      ? rawLineHeight < 4
        ? rawLineHeight * textFontSize
        : rawLineHeight
      : textFontSize * 1.4;
  const lineHeightMultiplier =
    Number.isFinite(rawLineHeight) && rawLineHeight > 0
      ? rawLineHeight < 4
        ? rawLineHeight
        : rawLineHeight / textFontSize
      : 1.4;

  type GradientValue = NonNullable<VisualStyle["linearGradient"]>;
  type RadialGradientValue = Extract<
    Exclude<GradientValue, string>,
    { type: "radial" }
  >;
  type LinearGradientValue = Exclude<Exclude<GradientValue, string>, { type: "radial" }>;

  const isRadialGradientValue = (
    g: GradientValue,
  ): g is RadialGradientValue =>
    typeof g === "object" && g !== null && (g as { type?: string }).type === "radial";

  const gradientKind =
    gradient === null
      ? ("none" as const)
      : typeof gradient === "string"
        ? ("css" as const)
        : isRadialGradientValue(gradient)
          ? ("radial" as const)
          : ("linear" as const);

  const linearGradient =
    gradientKind === "linear" && gradient && typeof gradient === "object"
      ? (gradient as LinearGradientValue)
      : null;

  const radialGradient =
    gradientKind === "radial" && gradient && typeof gradient === "object"
      ? (gradient as RadialGradientValue)
      : null;

  const gradientStops =
    gradient && typeof gradient === "object"
      ? (gradient as { colors: Array<{ offset: number; color: string }> }).colors
      : [];
  const gradientStartColor = gradientStops[0]?.color ?? "#000000";
  const gradientEndColor =
    gradientStops[gradientStops.length - 1]?.color ?? "#ffffff";

  const linearStart = linearGradient?.start ?? { x: 0, y: 0 };
  const linearEnd = linearGradient?.end ?? { x: 1, y: 0 };
  const linearMode =
    typeof linearGradient?.angle === "number" &&
    Number.isFinite(linearGradient.angle)
      ? ("angle" as const)
      : ("points" as const);

  const radialCenter = radialGradient?.center ?? { x: 0.5, y: 0.5 };
  const radialRadius = radialGradient?.radius ?? 0.5;

  const linearPresetOptions = [
    "custom",
    "to top",
    "to right",
    "to bottom",
    "to left",
    "to top right",
    "to bottom right",
    "to bottom left",
    "to top left",
  ] as const;

  const linearPointsPreset = (() => {
    if (linearMode !== "points") return "custom";
    const eps = 1e-6;
    const eq = (a: number, b: number) => Math.abs(a - b) <= eps;
    const match = (
      start: { x: number; y: number },
      end: { x: number; y: number },
    ) =>
      eq(linearStart.x, start.x) &&
      eq(linearStart.y, start.y) &&
      eq(linearEnd.x, end.x) &&
      eq(linearEnd.y, end.y);

    if (match({ x: 0.5, y: 1 }, { x: 0.5, y: 0 })) return "to top";
    if (match({ x: 0, y: 0.5 }, { x: 1, y: 0.5 })) return "to right";
    if (match({ x: 0.5, y: 0 }, { x: 0.5, y: 1 })) return "to bottom";
    if (match({ x: 1, y: 0.5 }, { x: 0, y: 0.5 })) return "to left";
    if (match({ x: 0, y: 1 }, { x: 1, y: 0 })) return "to top right";
    if (match({ x: 0, y: 0 }, { x: 1, y: 1 })) return "to bottom right";
    if (match({ x: 1, y: 0 }, { x: 0, y: 1 })) return "to bottom left";
    if (match({ x: 1, y: 1 }, { x: 0, y: 0 })) return "to top left";
    return "custom";
  })();

  const linearAnglePreset = (() => {
    if (linearMode !== "angle") return "custom";
    const raw = linearGradient?.angle;
    if (typeof raw !== "number" || !Number.isFinite(raw)) return "custom";
    const a = ((raw % 360) + 360) % 360;
    const diff = (x: number, y: number) => Math.abs(((x - y + 540) % 360) - 180);
    const eps = 1e-3;
    if (diff(a, 0) <= eps) return "to top";
    if (diff(a, 90) <= eps) return "to right";
    if (diff(a, 180) <= eps) return "to bottom";
    if (diff(a, 270) <= eps) return "to left";
    if (diff(a, 45) <= eps) return "to top right";
    if (diff(a, 135) <= eps) return "to bottom right";
    if (diff(a, 225) <= eps) return "to bottom left";
    if (diff(a, 315) <= eps) return "to top left";
    return "custom";
  })();

  const setLinearAnglePreset = (preset: string) => {
    const nextAngle =
      preset === "to top"
        ? 0
        : preset === "to right"
          ? 90
          : preset === "to bottom"
            ? 180
            : preset === "to left"
              ? 270
              : preset === "to top right"
                ? 45
                : preset === "to bottom right"
                  ? 135
                  : preset === "to bottom left"
                    ? 225
                    : preset === "to top left"
                      ? 315
                      : 90;
    updateVisual({
      linearGradient: {
        type: "linear",
        start: linearStart,
        end: linearEnd,
        colors: [
          { offset: 0, color: gradientStartColor },
          { offset: 1, color: gradientEndColor },
        ],
        angle: nextAngle,
      },
    });
  };

  const update = (updates: Partial<FlexStyle>) => {
    onUpdateFlexStyle(node.id, updates);
  };

  const updateVisual = (updates: Partial<VisualStyle>) => {
    onUpdateVisualStyle(node.id, updates);
  };

  const updateText = (updates: Partial<TextProps>) => {
    onUpdateTextProps(node.id, updates);
  };

  const updateImage = (updates: Partial<ImageProps>) => {
    onUpdateImageProps(node.id, updates);
  };

  const updateEvents = (events: NodeEventBindings | undefined) => {
    onUpdateEvents?.(node.id, events);
  };

  const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateImage({ src: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="h-full w-full border-l border-gray-200 bg-white overflow-y-auto overflow-x-hidden min-w-0"
      style={{ scrollbarGutter: "stable" }}
    >
      <Section noBorder>
        <h3 className="text-sm font-semibold text-gray-800">{node.name}</h3>
        <p className="text-xs text-gray-400 mt-0.5">ID: {node.id}</p>
      </Section>

      <div className="px-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 rounded-md bg-gray-50 p-1 border border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPanelTab("properties")}
              className={`flex-1 rounded transition-colors ${
                activeTab === "properties"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Properties
            </Button>
            {hasAnimationPanel ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPanelTab("animation")}
                className={`flex-1 rounded transition-colors ${
                  activeTab === "animation"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Animation
              </Button>
            ) : null}
            {hasEventsPanel ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPanelTab("events")}
                className={`flex-1 rounded transition-colors ${
                  activeTab === "events"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Events
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {activeTab === "properties" && node.textProps && (
        <Section title="Text">
          <div className="space-y-2">
            <TextAreaField
              label="Content"
              value={textContent}
              rows={3}
              onFocus={() => setTextContentFocused(true)}
              onBlur={() => {
                setTextContentFocused(false);
                updateText({ content: textContent });
              }}
              onChange={(val) => setTextContent(val)}
            />
            <FieldGrid cols={2}>
              <NumberField
                label="Font Size"
                value={node.textProps.fontSize}
                onChange={(val) => updateText({ fontSize: val ?? 14 })}
              />
              <SelectField
                label="Weight"
                value={String(node.textProps.fontWeight)}
                options={FONT_WEIGHT_OPTIONS}
                onChange={(val) =>
                  updateText({
                    fontWeight: /^-?\d+(\.\d+)?$/.test(val)
                      ? Number(val)
                      : (val as TextProps["fontWeight"]),
                  })
                }
              />
            </FieldGrid>
            <SelectField
              inline
              label="Style"
              value={node.textProps.fontStyle}
              options={FONT_STYLE_OPTIONS}
              onChange={(val) =>
                updateText({ fontStyle: val as TextProps["fontStyle"] })
              }
            />
            <ColorField
              key={`${node.id}-text-color`}
              label="Color"
              value={node.textProps.color}
              clearValue="#000000"
              onChange={(c) => updateText({ color: c })}
            />
            <FieldGrid cols={3}>
              <NumberField
                label="Line H(px)"
                value={round1(lineHeightPx)}
                onChange={(val) =>
                  updateText({
                    lineHeight: val ?? round1(textFontSize * 1.4),
                  })
                }
              />
              <NumberField
                label="Line H(×)"
                value={round1(lineHeightMultiplier)}
                onChange={(val) => updateText({ lineHeight: val ?? 1.4 })}
              />
              <SelectField
                label="Align"
                value={node.textProps.textAlign}
                options={["left", "center", "right"] as const}
                onChange={(val) =>
                  updateText({ textAlign: val as "left" | "center" | "right" })
                }
              />
            </FieldGrid>
            <FieldGrid cols={2}>
              <SelectField
                label="Wrap"
                value={
                  node.textProps.whiteSpace === "nowrap" ? "nowrap" : "wrap"
                }
                options={TEXT_WRAP_OPTIONS}
                onChange={(val) =>
                  updateText({
                    whiteSpace: val === "nowrap" ? "nowrap" : "normal",
                  })
                }
              />
              <NumberField
                label="Line Clamp"
                value={node.textProps.lineClamp}
                onChange={(val) => {
                  const n = val === undefined ? undefined : Math.floor(val);
                  updateText({ lineClamp: n && n > 0 ? n : undefined });
                }}
              />
            </FieldGrid>
            <div className="pt-1">
              <SubHeader
                title="Text Shadow"
                actions={
                  <IconButton
                    onClick={() => updateText({ textShadow: null })}
                    disabled={!textShadow}
                    title="Clear shadow"
                  >
                    <Trash2 size={14} />
                  </IconButton>
                }
              />
              <ColorField
                key={`${node.id}-text-shadow-color`}
                label="Color"
                value={textShadow?.color ?? "#000000"}
                clearValue="#000000"
                onChange={(c) =>
                  updateText({
                    textShadow: {
                      color: c,
                      blur: textShadow?.blur ?? 0,
                      offsetX: textShadow?.offsetX ?? 0,
                      offsetY: textShadow?.offsetY ?? 0,
                    },
                  })
                }
              />
              <FieldGrid cols={2}>
                <NumberField
                  label="Blur"
                  value={textShadow?.blur ?? 0}
                  onChange={(val) =>
                    updateText({
                      textShadow: {
                        color: textShadow?.color ?? "#000000",
                        blur: val ?? 0,
                        offsetX: textShadow?.offsetX ?? 0,
                        offsetY: textShadow?.offsetY ?? 0,
                      },
                    })
                  }
                />
                <NumberField
                  label="Offset X"
                  value={textShadow?.offsetX ?? 0}
                  onChange={(val) =>
                    updateText({
                      textShadow: {
                        color: textShadow?.color ?? "#000000",
                        blur: textShadow?.blur ?? 0,
                        offsetX: val ?? 0,
                        offsetY: textShadow?.offsetY ?? 0,
                      },
                    })
                  }
                />
                <NumberField
                  label="Offset Y"
                  value={textShadow?.offsetY ?? 0}
                  onChange={(val) =>
                    updateText({
                      textShadow: {
                        color: textShadow?.color ?? "#000000",
                        blur: textShadow?.blur ?? 0,
                        offsetX: textShadow?.offsetX ?? 0,
                        offsetY: val ?? 0,
                      },
                    })
                  }
                />
              </FieldGrid>
            </div>
          </div>
        </Section>
      )}

      {activeTab === "properties" && node.imageProps && (
        <Section
          title="Image"
          actions={
            node.imageProps.src ? (
              <IconButton
                onClick={() => updateImage({ src: "" })}
                title="Remove image"
              >
                <Trash2 size={14} />
              </IconButton>
            ) : null
          }
        >
          <div className="space-y-2">
            <FileInputButton
              label="Source"
              buttonText={node.imageProps.src ? "Change Image" : "Choose Image"}
              accept="image/*"
              onChange={handleImageFileChange}
            />
            {node.imageProps.src && (
              <div className="border border-gray-200 rounded overflow-hidden">
                <img
                  src={node.imageProps.src}
                  alt="preview"
                  className="w-full h-24 object-contain bg-gray-50"
                />
              </div>
            )}
            <SelectField
              inline
              label="Object Fit"
              value={node.imageProps.objectFit}
              options={["cover", "contain", "fill"] as const}
              onChange={(val) =>
                updateImage({
                  objectFit: val as "cover" | "contain" | "fill",
                })
              }
            />
          </div>
        </Section>
      )}

      {activeTab === "properties" && (
        <Section title="Layout">
        <div className="space-y-3">
          {node.type !== "text" && (
            <div className="space-y-2.5">
              <SubHeader title="Flexbox" />
              <SelectField
                inline
                label="Direction"
                value={s.flexDirection ?? "column"}
                options={FLEX_DIRECTIONS}
                onChange={(val) =>
                  update({ flexDirection: val as FlexStyle["flexDirection"] })
                }
              />
              <SelectField
                inline
                label="Justify"
                value={s.justifyContent ?? "flex-start"}
                options={JUSTIFY_OPTIONS}
                onChange={(val) =>
                  update({ justifyContent: val as FlexStyle["justifyContent"] })
                }
              />
              <SelectField
                inline
                label="Align Items"
                value={s.alignItems ?? "stretch"}
                options={ALIGN_OPTIONS}
                onChange={(val) =>
                  update({ alignItems: val as FlexStyle["alignItems"] })
                }
              />
              <SelectField
                inline
                label="Wrap"
                value={s.flexWrap ?? "nowrap"}
                options={WRAP_OPTIONS}
                onChange={(val) =>
                  update({ flexWrap: val as FlexStyle["flexWrap"] })
                }
              />
              {node.type === "view" && (
                <SelectField
                  inline
                  label="Overflow"
                  value={s.overflow ?? "visible"}
                  options={OVERFLOW_OPTIONS}
                  onChange={(val) =>
                    update({ overflow: val as FlexStyle["overflow"] })
                  }
                />
              )}
            </div>
          )}

          <div className="space-y-2.5">
            <SubHeader title="Size" />
            <FieldGrid cols={2}>
              <DimensionField
                label="Width"
                value={s.width}
                supportAuto
                onChange={(val) => update({ width: val })}
              />
              <DimensionField
                label="Height"
                value={s.height}
                supportAuto
                onChange={(val) => update({ height: val })}
              />
            </FieldGrid>
            <FieldGrid cols={2}>
              <DimensionField
                label="Min W"
                value={s.minWidth}
                onChange={(val) => update({ minWidth: val })}
              />
              <DimensionField
                label="Min H"
                value={s.minHeight}
                onChange={(val) => update({ minHeight: val })}
              />
              <DimensionField
                label="Max W"
                value={s.maxWidth}
                onChange={(val) => update({ maxWidth: val })}
              />
              <DimensionField
                label="Max H"
                value={s.maxHeight}
                onChange={(val) => update({ maxHeight: val })}
              />
            </FieldGrid>
          </div>

          <div className="space-y-2.5">
            <SubHeader title="Position" />
            <SelectField
              inline
              label="Type"
              value={s.position ?? "static"}
              options={["static", "relative", "absolute"] as const}
              onChange={(val) =>
                update({ position: val as FlexStyle["position"] })
              }
            />
            {s.position && s.position !== "static" && (
              <FieldGrid cols={2}>
                <DimensionField
                  label="Top"
                  value={s.top}
                  onChange={(val) => update({ top: val })}
                />
                <DimensionField
                  label="Right"
                  value={s.right}
                  onChange={(val) => update({ right: val })}
                />
                <DimensionField
                  label="Bottom"
                  value={s.bottom}
                  onChange={(val) => update({ bottom: val })}
                />
                <DimensionField
                  label="Left"
                  value={s.left}
                  onChange={(val) => update({ left: val })}
                />
              </FieldGrid>
            )}
            <NumberField
              label="Z-Index"
              value={v.zIndex}
              onChange={(val) => updateVisual({ zIndex: val ?? 0 })}
            />
          </div>

          <div className="space-y-2.5">
            <SubHeader title="Flex Item" />
            <FieldGrid cols={3}>
              <DimensionField
                label="Basis"
                value={s.flexBasis}
                supportAuto
                onChange={(val) => update({ flexBasis: val })}
              />
              <NumberField
                label="Grow"
                value={s.flexGrow}
                onChange={(val) => update({ flexGrow: val })}
              />
              <NumberField
                label="Shrink"
                value={s.flexShrink}
                onChange={(val) => update({ flexShrink: val })}
              />
            </FieldGrid>
          </div>

          {node.type !== "text" && (
            <div className="space-y-2.5">
              <SubHeader title="Gap" />
              <FieldGrid cols={3}>
                <DimensionField
                  label="Gap"
                  value={s.gap}
                  onChange={(val) => update({ gap: val })}
                />
                <DimensionField
                  label="Row"
                  value={s.rowGap}
                  onChange={(val) => update({ rowGap: val })}
                />
                <DimensionField
                  label="Col"
                  value={s.columnGap}
                  onChange={(val) => update({ columnGap: val })}
                />
              </FieldGrid>
            </div>
          )}
        </div>
      </Section>
      )}

      {activeTab === "properties" && (
        <Section title="Spacing">
        <div className="space-y-3">
          <div>
            <SubHeader title="Padding" />
            <FieldGrid cols={2}>
              <DimensionField
                label="Top"
                value={s.paddingTop}
                onChange={(val) => update({ paddingTop: val })}
              />
              <DimensionField
                label="Right"
                value={s.paddingRight}
                onChange={(val) => update({ paddingRight: val })}
              />
              <DimensionField
                label="Bottom"
                value={s.paddingBottom}
                onChange={(val) => update({ paddingBottom: val })}
              />
              <DimensionField
                label="Left"
                value={s.paddingLeft}
                onChange={(val) => update({ paddingLeft: val })}
              />
            </FieldGrid>
          </div>

          <div>
            <SubHeader title="Margin" />
            <FieldGrid cols={2}>
              <DimensionField
                label="Top"
                value={s.marginTop}
                supportAuto
                onChange={(val) => update({ marginTop: val })}
              />
              <DimensionField
                label="Right"
                value={s.marginRight}
                supportAuto
                onChange={(val) => update({ marginRight: val })}
              />
              <DimensionField
                label="Bottom"
                value={s.marginBottom}
                supportAuto
                onChange={(val) => update({ marginBottom: val })}
              />
              <DimensionField
                label="Left"
                value={s.marginLeft}
                supportAuto
                onChange={(val) => update({ marginLeft: val })}
              />
            </FieldGrid>
          </div>
        </div>
      </Section>
      )}

      {activeTab === "properties" && (
        <Section title="Appearance">
        <div className="space-y-2">
          <ColorField
            key={`${node.id}-bg-color`}
            label="Background"
            value={v.backgroundColor}
            clearValue="transparent"
            onChange={(c) => updateVisual({ backgroundColor: c })}
          />
          <SelectField
            inline
            label="Gradient"
            value={gradientKind}
            options={["none", "linear", "radial", "css"] as const}
            onChange={(val) => {
              if (val === "none") {
                updateVisual({ linearGradient: null });
                return;
              }
              if (val === "css") {
                const fallback = `linear-gradient(to right, ${gradientStartColor}, ${gradientEndColor})`;
                const next = typeof gradient === "string" ? gradient : fallback;
                setGradientCss(next);
                updateVisual({ linearGradient: next });
                return;
              }
              if (val === "radial") {
                updateVisual({
                  linearGradient: {
                    type: "radial",
                    center: radialCenter,
                    radius: radialRadius,
                    colors: [
                      { offset: 0, color: gradientStartColor },
                      { offset: 1, color: gradientEndColor },
                    ],
                  },
                });
                return;
              }
              updateVisual({
                linearGradient: {
                  type: "linear",
                  start: linearStart,
                  end: linearEnd,
                  colors: [
                    { offset: 0, color: gradientStartColor },
                    { offset: 1, color: gradientEndColor },
                  ],
                  angle:
                    typeof linearGradient?.angle === "number" &&
                    Number.isFinite(linearGradient.angle)
                      ? linearGradient.angle
                      : undefined,
                },
              });
            }}
          />
          {gradientKind === "css" && (
            <TextAreaField
              label="CSS"
              value={gradientCss}
              rows={3}
              onFocus={() => setGradientCssFocused(true)}
              onBlur={() => setGradientCssFocused(false)}
              onChange={(val) => {
                setGradientCss(val);
                updateVisual({ linearGradient: val.trim() ? val : null });
              }}
            />
          )}
          {gradientKind === "linear" && linearGradient && (
            <div className="space-y-2">
              <FieldGrid cols={2}>
                <SelectField
                  label="Mode"
                  value={linearMode}
                  options={["points", "angle"] as const}
                  onChange={(val) => {
                    if (val === "points") {
                      updateVisual({
                        linearGradient: {
                          type: "linear",
                          start: linearStart,
                          end: linearEnd,
                          colors: [
                            { offset: 0, color: gradientStartColor },
                            { offset: 1, color: gradientEndColor },
                          ],
                          angle: undefined,
                        },
                      });
                      return;
                    }

                    const dx = linearEnd.x - linearStart.x;
                    const dy = linearEnd.y - linearStart.y;
                    const a =
                      dx === 0 && dy === 0
                        ? 90
                        : ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
                    updateVisual({
                      linearGradient: {
                        type: "linear",
                        start: linearStart,
                        end: linearEnd,
                        colors: [
                          { offset: 0, color: gradientStartColor },
                          { offset: 1, color: gradientEndColor },
                        ],
                        angle: a,
                      },
                    });
                  }}
                />
                {linearMode === "angle" ? (
                  <SelectField
                    label="Preset"
                    value={linearAnglePreset}
                    options={linearPresetOptions}
                    onChange={(val) => {
                      if (val === "custom") return;
                      setLinearAnglePreset(val);
                    }}
                  />
                ) : (
                  <SelectField
                    label="Preset"
                    value={linearPointsPreset}
                    options={linearPresetOptions}
                    onChange={(val) => {
                      if (val === "custom") return;
                      const nextStartEnd =
                        val === "to top"
                          ? { start: { x: 0.5, y: 1 }, end: { x: 0.5, y: 0 } }
                          : val === "to right"
                            ? {
                                start: { x: 0, y: 0.5 },
                                end: { x: 1, y: 0.5 },
                              }
                            : val === "to bottom"
                              ? {
                                  start: { x: 0.5, y: 0 },
                                  end: { x: 0.5, y: 1 },
                                }
                              : val === "to left"
                                ? {
                                    start: { x: 1, y: 0.5 },
                                    end: { x: 0, y: 0.5 },
                                  }
                                : val === "to top right"
                                  ? {
                                      start: { x: 0, y: 1 },
                                      end: { x: 1, y: 0 },
                                    }
                                  : val === "to bottom right"
                                    ? {
                                        start: { x: 0, y: 0 },
                                        end: { x: 1, y: 1 },
                                      }
                                    : val === "to bottom left"
                                      ? {
                                          start: { x: 1, y: 0 },
                                          end: { x: 0, y: 1 },
                                        }
                                      : {
                                          start: { x: 1, y: 1 },
                                          end: { x: 0, y: 0 },
                                        };
                      updateVisual({
                        linearGradient: {
                          type: "linear",
                          ...nextStartEnd,
                          colors: [
                            { offset: 0, color: gradientStartColor },
                            { offset: 1, color: gradientEndColor },
                          ],
                          angle: undefined,
                        },
                      });
                    }}
                  />
                )}
              </FieldGrid>
              {linearMode === "angle" ? (
                <NumberField
                  label="Angle"
                  value={linearGradient.angle ?? 90}
                  onChange={(val) =>
                    updateVisual({
                      linearGradient: {
                        type: "linear",
                        start: linearStart,
                        end: linearEnd,
                        colors: [
                          { offset: 0, color: gradientStartColor },
                          { offset: 1, color: gradientEndColor },
                        ],
                        angle: val ?? 90,
                      },
                    })
                  }
                />
              ) : null}
              <FieldGrid cols={2}>
                <NumberField
                  label="Start X"
                  value={linearStart.x}
                  onChange={(val) =>
                    updateVisual({
                      linearGradient: {
                        type: "linear",
                        start: { x: val ?? 0, y: linearStart.y },
                        end: linearEnd,
                        colors: [
                          { offset: 0, color: gradientStartColor },
                          { offset: 1, color: gradientEndColor },
                        ],
                        angle: undefined,
                      },
                    })
                  }
                />
                <NumberField
                  label="Start Y"
                  value={linearStart.y}
                  onChange={(val) =>
                    updateVisual({
                      linearGradient: {
                        type: "linear",
                        start: { x: linearStart.x, y: val ?? 0 },
                        end: linearEnd,
                        colors: [
                          { offset: 0, color: gradientStartColor },
                          { offset: 1, color: gradientEndColor },
                        ],
                        angle: undefined,
                      },
                    })
                  }
                />
                <NumberField
                  label="End X"
                  value={linearEnd.x}
                  onChange={(val) =>
                    updateVisual({
                      linearGradient: {
                        type: "linear",
                        start: linearStart,
                        end: { x: val ?? 1, y: linearEnd.y },
                        colors: [
                          { offset: 0, color: gradientStartColor },
                          { offset: 1, color: gradientEndColor },
                        ],
                        angle: undefined,
                      },
                    })
                  }
                />
                <NumberField
                  label="End Y"
                  value={linearEnd.y}
                  onChange={(val) =>
                    updateVisual({
                      linearGradient: {
                        type: "linear",
                        start: linearStart,
                        end: { x: linearEnd.x, y: val ?? 0 },
                        colors: [
                          { offset: 0, color: gradientStartColor },
                          { offset: 1, color: gradientEndColor },
                        ],
                        angle: undefined,
                      },
                    })
                  }
                />
              </FieldGrid>
              <ColorField
                key={`${node.id}-gradient-start-color`}
                label="Start"
                value={linearGradient.colors[0]?.color ?? "#000000"}
                clearValue="#000000"
                onChange={(c) =>
                  updateVisual({
                    linearGradient: {
                      ...linearGradient,
                      colors: [
                        { offset: 0, color: c },
                        {
                          offset: 1,
                          color: gradientEndColor,
                        },
                      ],
                    },
                  })
                }
              />
              <ColorField
                key={`${node.id}-gradient-end-color`}
                label="End"
                value={
                  linearGradient.colors[linearGradient.colors.length - 1]
                    ?.color ?? "#ffffff"
                }
                clearValue="#ffffff"
                onChange={(c) =>
                  updateVisual({
                    linearGradient: {
                      ...linearGradient,
                      colors: [
                        { offset: 0, color: gradientStartColor },
                        { offset: 1, color: c },
                      ],
                    },
                  })
                }
              />
            </div>
          )}
          {gradientKind === "radial" && radialGradient && (
            <div className="space-y-2">
              <FieldGrid cols={3}>
                <NumberField
                  label="Center X"
                  value={radialCenter.x}
                  onChange={(val) =>
                    updateVisual({
                      linearGradient: {
                        type: "radial",
                        center: { x: val ?? 0.5, y: radialCenter.y },
                        radius: radialRadius,
                        colors: [
                          { offset: 0, color: gradientStartColor },
                          { offset: 1, color: gradientEndColor },
                        ],
                      },
                    })
                  }
                />
                <NumberField
                  label="Center Y"
                  value={radialCenter.y}
                  onChange={(val) =>
                    updateVisual({
                      linearGradient: {
                        type: "radial",
                        center: { x: radialCenter.x, y: val ?? 0.5 },
                        radius: radialRadius,
                        colors: [
                          { offset: 0, color: gradientStartColor },
                          { offset: 1, color: gradientEndColor },
                        ],
                      },
                    })
                  }
                />
                <NumberField
                  label="Radius"
                  value={radialRadius}
                  onChange={(val) =>
                    updateVisual({
                      linearGradient: {
                        type: "radial",
                        center: radialCenter,
                        radius: val ?? 0.5,
                        colors: [
                          { offset: 0, color: gradientStartColor },
                          { offset: 1, color: gradientEndColor },
                        ],
                      },
                    })
                  }
                />
              </FieldGrid>
              <ColorField
                key={`${node.id}-gradient-start-color`}
                label="Start"
                value={gradientStartColor}
                clearValue="#000000"
                onChange={(c) =>
                  updateVisual({
                    linearGradient: {
                      type: "radial",
                      center: radialCenter,
                      radius: radialRadius,
                      colors: [
                        { offset: 0, color: c },
                        { offset: 1, color: gradientEndColor },
                      ],
                    },
                  })
                }
              />
              <ColorField
                key={`${node.id}-gradient-end-color`}
                label="End"
                value={gradientEndColor}
                clearValue="#ffffff"
                onChange={(c) =>
                  updateVisual({
                    linearGradient: {
                      type: "radial",
                      center: radialCenter,
                      radius: radialRadius,
                      colors: [
                        { offset: 0, color: gradientStartColor },
                        { offset: 1, color: c },
                      ],
                    },
                  })
                }
              />
            </div>
          )}
          <ColorField
            key={`${node.id}-border-color`}
            label="Border Color"
            value={v.borderColor}
            clearValue="transparent"
            onChange={(c) => updateVisual({ borderColor: c })}
          />
          <FieldGrid cols={2}>
            <NumberField
              label="Border W"
              value={v.borderWidth}
              onChange={(val) => updateVisual({ borderWidth: val ?? 0 })}
            />
            <NumberField
              label="Radius"
              value={v.borderRadius}
              onChange={(val) => updateVisual({ borderRadius: val ?? 0 })}
            />
          </FieldGrid>
          <NumberField
            label="Opacity"
            value={v.opacity}
            onChange={(val) => updateVisual({ opacity: val ?? 1 })}
          />
          {node.type !== "text" && (
            <div className="pt-1">
              <SubHeader
                title="Box Shadow"
                actions={
                  <IconButton
                    onClick={() => updateVisual({ boxShadow: null })}
                    disabled={!boxShadow}
                    title="Clear shadow"
                  >
                    <Trash2 size={14} />
                  </IconButton>
                }
              />
              <ColorField
                key={`${node.id}-shadow-color`}
                label="Color"
                value={boxShadow?.color ?? "#000000"}
                clearValue="#000000"
                onChange={(c) =>
                  updateVisual({
                    boxShadow: {
                      color: c,
                      blur: boxShadow?.blur ?? 0,
                      offsetX: boxShadow?.offsetX ?? 0,
                      offsetY: boxShadow?.offsetY ?? 0,
                      spread: boxShadow?.spread ?? 0,
                    },
                  })
                }
              />
              <FieldGrid cols={2}>
                <NumberField
                  label="Blur"
                  value={boxShadow?.blur ?? 0}
                  onChange={(val) =>
                    updateVisual({
                      boxShadow: {
                        color: boxShadow?.color ?? "#000000",
                        blur: val ?? 0,
                        offsetX: boxShadow?.offsetX ?? 0,
                        offsetY: boxShadow?.offsetY ?? 0,
                        spread: boxShadow?.spread ?? 0,
                      },
                    })
                  }
                />
                <NumberField
                  label="Offset X"
                  value={boxShadow?.offsetX ?? 0}
                  onChange={(val) =>
                    updateVisual({
                      boxShadow: {
                        color: boxShadow?.color ?? "#000000",
                        blur: boxShadow?.blur ?? 0,
                        offsetX: val ?? 0,
                        offsetY: boxShadow?.offsetY ?? 0,
                        spread: boxShadow?.spread ?? 0,
                      },
                    })
                  }
                />
                <NumberField
                  label="Offset Y"
                  value={boxShadow?.offsetY ?? 0}
                  onChange={(val) =>
                    updateVisual({
                      boxShadow: {
                        color: boxShadow?.color ?? "#000000",
                        blur: boxShadow?.blur ?? 0,
                        offsetX: boxShadow?.offsetX ?? 0,
                        offsetY: val ?? 0,
                        spread: boxShadow?.spread ?? 0,
                      },
                    })
                  }
                />
                <NumberField
                  label="Spread"
                  value={boxShadow?.spread ?? 0}
                  onChange={(val) =>
                    updateVisual({
                      boxShadow: {
                        color: boxShadow?.color ?? "#000000",
                        blur: boxShadow?.blur ?? 0,
                        offsetX: boxShadow?.offsetX ?? 0,
                        offsetY: boxShadow?.offsetY ?? 0,
                        spread: val ?? 0,
                      },
                    })
                  }
                />
              </FieldGrid>
            </div>
          )}
        </div>
      </Section>
      )}

      {activeTab === "properties" && (
        <Section title="Transform">
          <div className="space-y-2">
            <FieldGrid cols={2}>
              <NumberField
                label="Translate X"
                value={v.translateX}
                onChange={(val) => updateVisual({ translateX: val ?? 0 })}
              />
              <NumberField
                label="Translate Y"
                value={v.translateY}
                onChange={(val) => updateVisual({ translateY: val ?? 0 })}
              />
            </FieldGrid>
            <FieldGrid cols={2}>
              <NumberField
                label="Scale X"
                value={v.scaleX}
                onChange={(val) => updateVisual({ scaleX: val ?? 1 })}
              />
              <NumberField
                label="Scale Y"
                value={v.scaleY}
                onChange={(val) => updateVisual({ scaleY: val ?? 1 })}
              />
            </FieldGrid>
            <NumberField
              label="Rotate (deg)"
              value={v.rotate}
              onChange={(val) => updateVisual({ rotate: val ?? 0 })}
            />
          </div>
        </Section>
      )}

      {activeTab === "properties" && (
        <Section title="Computed Layout">
        <FieldGrid cols={2} gap="gap-1">
          <span className="text-xs text-gray-500">
            x: {Math.round(node.computedLayout.left)}
          </span>
          <span className="text-xs text-gray-500">
            y: {Math.round(node.computedLayout.top)}
          </span>
          <span className="text-xs text-gray-500">
            w: {Math.round(node.computedLayout.width)}
          </span>
          <span className="text-xs text-gray-500">
            h: {Math.round(node.computedLayout.height)}
          </span>
        </FieldGrid>
      </Section>
      )}

      {activeTab === "events" && onUpdateEvents && (
        <EventsPanel events={node.events} onEventsChange={updateEvents} />
      )}

      {activeTab === "animation" && onUpdateMotion && (
        <MotionPanel
          motion={node.motion}
          nodeType={node.type}
          onMotionChange={(motion) => onUpdateMotion(node.id, motion)}
        />
      )}
    </div>
  );
}
