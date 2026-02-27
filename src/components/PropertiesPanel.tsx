import { useState, useEffect, useRef } from "react";
import { RgbaColorPicker } from "react-colorful";
import { Trash2, X } from "lucide-react";
import type {
  CanvasNode,
  FlexStyle,
  FlexValue,
  VisualStyle,
  TextProps,
  ImageProps,
} from "../types";

interface PropertiesPanelProps {
  node: CanvasNode | null;
  onUpdateFlexStyle: (nodeId: string, updates: Partial<FlexStyle>) => void;
  onUpdateVisualStyle: (nodeId: string, updates: Partial<VisualStyle>) => void;
  onUpdateTextProps: (nodeId: string, updates: Partial<TextProps>) => void;
  onUpdateImageProps: (nodeId: string, updates: Partial<ImageProps>) => void;
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

type DimUnit = "px" | "%" | "auto";

function parseFlexValue(v: FlexValue | undefined): {
  num: number | undefined;
  unit: DimUnit;
} {
  if (v === undefined) return { num: undefined, unit: "px" };
  if (v === "auto") return { num: undefined, unit: "auto" };
  if (typeof v === "string" && v.endsWith("%"))
    return { num: parseFloat(v), unit: "%" };
  return { num: v as number, unit: "px" };
}

function buildFlexValue(
  num: number | undefined,
  unit: DimUnit,
): FlexValue | undefined {
  if (unit === "auto") return "auto";
  if (num === undefined) return undefined;
  if (unit === "%") return `${num}%` as FlexValue;
  return num;
}

export default function PropertiesPanel({
  node,
  onUpdateFlexStyle,
  onUpdateVisualStyle,
  onUpdateTextProps,
  onUpdateImageProps,
}: PropertiesPanelProps) {
  if (!node) {
    return (
      <div className="w-72 border-l border-gray-200 bg-white p-4 overflow-y-auto shrink-0">
        <p className="text-sm text-gray-400 text-center mt-8">
          Select a node to edit properties
        </p>
      </div>
    );
  }

  const s = node.flexStyle;
  const v = node.visualStyle;
  const boxShadow = v.boxShadow ?? null;
  const linearGradient = v.linearGradient ?? null;
  const textShadow = node.textProps?.textShadow ?? null;
  const gradientStartColor = linearGradient?.colors?.[0]?.color ?? "#000000";
  const gradientEndColor =
    linearGradient?.colors?.[linearGradient.colors.length - 1]?.color ?? "#ffffff";
  const gradientStart = linearGradient?.start ?? { x: 0, y: 0 };
  const gradientEnd = linearGradient?.end ?? { x: 1, y: 0 };

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

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    <div className="h-full w-full border-l border-gray-200 bg-white overflow-y-auto overflow-x-hidden min-w-0">
      <Section noBorder>
        <h3 className="text-sm font-semibold text-gray-800">{node.name}</h3>
        <p className="text-xs text-gray-400 mt-0.5">ID: {node.id}</p>
      </Section>

      {node.type !== "text" && (
        <Section title="Layout">
          <div className="space-y-2.5">
            <SelectField
              inline
              label="Direction"
              value={s.flexDirection ?? "column"}
              options={FLEX_DIRECTIONS}
              onChange={(v) =>
                update({ flexDirection: v as FlexStyle["flexDirection"] })
              }
            />
            <SelectField
              inline
              label="Justify"
              value={s.justifyContent ?? "flex-start"}
              options={JUSTIFY_OPTIONS}
              onChange={(v) =>
                update({ justifyContent: v as FlexStyle["justifyContent"] })
              }
            />
            <SelectField
              inline
              label="Align Items"
              value={s.alignItems ?? "stretch"}
              options={ALIGN_OPTIONS}
              onChange={(v) =>
                update({ alignItems: v as FlexStyle["alignItems"] })
              }
            />
            <SelectField
              inline
              label="Wrap"
              value={s.flexWrap ?? "nowrap"}
              options={WRAP_OPTIONS}
              onChange={(v) => update({ flexWrap: v as FlexStyle["flexWrap"] })}
            />
          </div>
        </Section>
      )}

      {node.textProps && (
        <Section title="Text">
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-400 block mb-0.5">
                Content
              </label>
              <textarea
                value={node.textProps.content}
                onChange={(e) => updateText({ content: e.target.value })}
                rows={3}
                className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 bg-gray-50
                  focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 resize-none"
              />
            </div>
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
                    fontWeight: /^-?\d+(\.\d+)?$/.test(val) ? Number(val) : (val as TextProps["fontWeight"]),
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
            <FieldGrid cols={2}>
              <NumberField
                label="Line H"
                value={node.textProps.lineHeight}
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
            <SelectField
              inline
              label="Wrap"
              value={node.textProps.whiteSpace === "nowrap" ? "nowrap" : "wrap"}
              options={TEXT_WRAP_OPTIONS}
              onChange={(val) =>
                updateText({ whiteSpace: val === "nowrap" ? "nowrap" : "normal" })
              }
            />
            <div className="pt-1">
              <SubHeader
                title="Text Shadow"
                actions={
                  <button
                    type="button"
                    onClick={() => updateText({ textShadow: null })}
                    className="w-7 h-7 inline-flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={!textShadow}
                    title="Clear shadow"
                  >
                    <Trash2 size={14} />
                  </button>
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

      {node.imageProps && (
        <Section
          title="Image"
          actions={
            node.imageProps.src ? (
              <button
                type="button"
                onClick={() => updateImage({ src: "" })}
                className="w-7 h-7 inline-flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50"
                title="Remove image"
              >
                <Trash2 size={14} />
              </button>
            ) : null
          }
        >
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Source</label>
              <label
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200
                  rounded cursor-pointer hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                <span>{node.imageProps.src ? "Change Image" : "Choose Image"}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFileChange}
                />
              </label>
            </div>
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

      <Section title="Position">
        <div className="space-y-2">
          <SelectField
            inline
            label="Type"
            value={s.position ?? "static"}
            options={["static", "relative", "absolute"] as const}
            onChange={(v) =>
              update({ position: v as FlexStyle["position"] })
            }
          />
          {s.position && s.position !== "static" && (
            <FieldGrid cols={2}>
              <DimensionField
                label="Top"
                value={s.top}
                onChange={(v) => update({ top: v })}
              />
              <DimensionField
                label="Right"
                value={s.right}
                onChange={(v) => update({ right: v })}
              />
              <DimensionField
                label="Bottom"
                value={s.bottom}
                onChange={(v) => update({ bottom: v })}
              />
              <DimensionField
                label="Left"
                value={s.left}
                onChange={(v) => update({ left: v })}
              />
            </FieldGrid>
          )}
          <NumberField
            label="Z-Index"
            value={v.zIndex}
            onChange={(val) => updateVisual({ zIndex: val ?? 0 })}
          />
        </div>
      </Section>

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
            value={linearGradient ? "linear" : "none"}
            options={["none", "linear"] as const}
            onChange={(val) =>
              updateVisual({
                linearGradient:
                  val === "linear"
                    ? {
                        start: { x: gradientStart.x, y: gradientStart.y },
                        end: { x: gradientEnd.x, y: gradientEnd.y },
                        colors: [
                          { offset: 0, color: gradientStartColor },
                          {
                            offset: 1,
                            color: gradientEndColor,
                          },
                        ],
                      }
                    : null,
              })
            }
          />
          {linearGradient && (
            <div className="space-y-2">
              <FieldGrid cols={2}>
                <NumberField
                  label="Start X"
                  value={linearGradient.start.x}
                  onChange={(val) =>
                    updateVisual({
                      linearGradient: {
                        ...linearGradient,
                        start: { x: val ?? 0, y: linearGradient.start.y },
                      },
                    })
                  }
                />
                <NumberField
                  label="Start Y"
                  value={linearGradient.start.y}
                  onChange={(val) =>
                    updateVisual({
                      linearGradient: {
                        ...linearGradient,
                        start: { x: linearGradient.start.x, y: val ?? 0 },
                      },
                    })
                  }
                />
                <NumberField
                  label="End X"
                  value={linearGradient.end.x}
                  onChange={(val) =>
                    updateVisual({
                      linearGradient: {
                        ...linearGradient,
                        end: { x: val ?? 1, y: linearGradient.end.y },
                      },
                    })
                  }
                />
                <NumberField
                  label="End Y"
                  value={linearGradient.end.y}
                  onChange={(val) =>
                    updateVisual({
                      linearGradient: {
                        ...linearGradient,
                        end: { x: linearGradient.end.x, y: val ?? 0 },
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
                  value={linearGradient.colors[linearGradient.colors.length - 1]?.color ?? "#ffffff"}
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
          <FieldGrid cols={2}>
            <NumberField
              label="Opacity"
              value={v.opacity}
              onChange={(val) => updateVisual({ opacity: val ?? 1 })}
            />
            <NumberField
              label="Rotation"
              value={v.rotate}
              onChange={(val) => updateVisual({ rotate: val ?? 0 })}
            />
          </FieldGrid>
          <div className="pt-1">
            <SubHeader
              title="Box Shadow"
              actions={
                <button
                  type="button"
                  onClick={() => updateVisual({ boxShadow: null })}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  disabled={!boxShadow}
                  title="Clear shadow"
                >
                  <Trash2 size={14} />
                </button>
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
        </div>
      </Section>

      <Section title="Size">
        <FieldGrid cols={2}>
          <DimensionField
            label="Width"
            value={s.width}
            supportAuto
            onChange={(v) => update({ width: v })}
          />
          <DimensionField
            label="Height"
            value={s.height}
            supportAuto
            onChange={(v) => update({ height: v })}
          />
        </FieldGrid>
      </Section>

      <Section title="Flex">
        <FieldGrid cols={3}>
          <DimensionField
            label="Basis"
            value={s.flexBasis}
            supportAuto
            onChange={(v) => update({ flexBasis: v })}
          />
          <NumberField
            label="Grow"
            value={s.flexGrow}
            onChange={(v) => update({ flexGrow: v })}
          />
          <NumberField
            label="Shrink"
            value={s.flexShrink}
            onChange={(v) => update({ flexShrink: v })}
          />
        </FieldGrid>
      </Section>

      <Section title="Gap">
        <FieldGrid cols={3}>
          <DimensionField
            label="Gap"
            value={s.gap}
            onChange={(v) => update({ gap: v })}
          />
          <DimensionField
            label="Row"
            value={s.rowGap}
            onChange={(v) => update({ rowGap: v })}
          />
          <DimensionField
            label="Col"
            value={s.columnGap}
            onChange={(v) => update({ columnGap: v })}
          />
        </FieldGrid>
      </Section>

      <Section title="Padding">
        <FieldGrid cols={2}>
          <DimensionField
            label="Top"
            value={s.paddingTop}
            onChange={(v) => update({ paddingTop: v })}
          />
          <DimensionField
            label="Right"
            value={s.paddingRight}
            onChange={(v) => update({ paddingRight: v })}
          />
          <DimensionField
            label="Bottom"
            value={s.paddingBottom}
            onChange={(v) => update({ paddingBottom: v })}
          />
          <DimensionField
            label="Left"
            value={s.paddingLeft}
            onChange={(v) => update({ paddingLeft: v })}
          />
        </FieldGrid>
      </Section>

      <Section title="Margin">
        <FieldGrid cols={2}>
          <DimensionField
            label="Top"
            value={s.marginTop}
            supportAuto
            onChange={(v) => update({ marginTop: v })}
          />
          <DimensionField
            label="Right"
            value={s.marginRight}
            supportAuto
            onChange={(v) => update({ marginRight: v })}
          />
          <DimensionField
            label="Bottom"
            value={s.marginBottom}
            supportAuto
            onChange={(v) => update({ marginBottom: v })}
          />
          <DimensionField
            label="Left"
            value={s.marginLeft}
            supportAuto
            onChange={(v) => update({ marginLeft: v })}
          />
        </FieldGrid>
      </Section>

      <Section title="Computed Layout" isLast>
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
    </div>
  );
}

function SubHeader({
  title,
  actions,
}: {
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-1">
      <div className="text-xs text-gray-400">{title}</div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

function Section({
  title,
  actions,
  children,
  noBorder = false,
  isLast = false,
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  noBorder?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      className={`px-4 py-3 ${isLast || noBorder ? "" : "border-b border-gray-100"}`}
    >
      {title && (
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
            {title}
          </h4>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      )}
      {children}
    </div>
  );
}

function FieldGrid({
  cols = 2,
  gap = "gap-2",
  children,
}: {
  cols?: 2 | 3;
  gap?: string;
  children: React.ReactNode;
}) {
  const colsClass = cols === 3 ? "grid-cols-3" : "grid-cols-2";
  return <div className={`grid ${colsClass} ${gap}`}>{children}</div>;
}

function SelectField({
  label,
  value,
  options,
  onChange,
  inline = false,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  inline?: boolean;
}) {
  if (inline) {
    return (
      <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-2">
        <label className="text-xs text-gray-500">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-gray-50
            focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400
            w-full min-w-0"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div>
      <label className="text-xs text-gray-400 block mb-0.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 bg-gray-50
          focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  const [localValue, setLocalValue] = useState<string>(
    value !== undefined ? String(value) : ""
  );
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setLocalValue(value !== undefined ? String(value) : "");
    }
  }, [value, focused]);

  const commit = (str: string) => {
    if (str === "" || str === "-") {
      onChange(undefined);
    } else {
      const n = Number(str);
      if (!isNaN(n)) onChange(n);
    }
  };

  return (
    <div>
      <label className="text-xs text-gray-400 block mb-0.5">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        value={localValue}
        placeholder="-"
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit(localValue);
        }}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "" || v === "-" || /^-?\d*\.?\d*$/.test(v)) {
            setLocalValue(v);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit(localValue);
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 bg-gray-50
          focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400
          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
}

type ColorParse = {
  r: number;
  g: number;
  b: number;
  a: number;
  ok: boolean;
};

type ColorFormat = "hex" | "rgb" | "rgba" | "hsl" | "hsla";

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function hasExplicitAlpha(input: string) {
  const v = input.trim().toLowerCase();
  if (!v) return false;
  if (v === "transparent") return true;
  if (v.startsWith("rgba(") || v.startsWith("hsla(")) return true;
  const hex = v.startsWith("#") ? v.slice(1) : v;
  return hex.length === 4 || hex.length === 8;
}

function guessFormat(input: string): ColorFormat {
  const v = input.trim().toLowerCase();
  if (v.startsWith("hsla(")) return "hsla";
  if (v.startsWith("hsl(")) return "hsl";
  if (v.startsWith("rgba(")) return "rgba";
  if (v.startsWith("rgb(")) return "rgb";
  if (v.startsWith("#")) return "hex";
  return "hex";
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp01(s);
  const lig = clamp01(l);

  if (sat === 0) {
    const v = Math.round(lig * 255);
    return { r: v, g: v, b: v };
  }

  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lig - c / 2;

  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (hue < 60) {
    rp = c;
    gp = x;
  } else if (hue < 120) {
    rp = x;
    gp = c;
  } else if (hue < 180) {
    gp = c;
    bp = x;
  } else if (hue < 240) {
    gp = x;
    bp = c;
  } else if (hue < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }

  const r = Math.round((rp + m) * 255);
  const g = Math.round((gp + m) * 255);
  const b = Math.round((bp + m) * 255);
  return {
    r: Math.min(255, Math.max(0, r)),
    g: Math.min(255, Math.max(0, g)),
    b: Math.min(255, Math.max(0, b)),
  };
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = Math.min(255, Math.max(0, r)) / 255;
  const gn = Math.min(255, Math.max(0, g)) / 255;
  const bn = Math.min(255, Math.max(0, b)) / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

function parseColorValue(input: string): ColorParse {
  if (!input) return { r: 0, g: 0, b: 0, a: 1, ok: false };
  if (input === "transparent") return { r: 0, g: 0, b: 0, a: 0, ok: true };
  const rgbaMatch = input.match(/^rgba?\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i);
  if (rgbaMatch) {
    const r = Math.min(255, Math.max(0, Number(rgbaMatch[1])));
    const g = Math.min(255, Math.max(0, Number(rgbaMatch[2])));
    const b = Math.min(255, Math.max(0, Number(rgbaMatch[3])));
    const a = rgbaMatch[4] !== undefined ? Math.min(1, Math.max(0, Number(rgbaMatch[4]))) : 1;
    return { r, g, b, a, ok: true };
  }
  const hslaMatch = input.match(
    /^hsla?\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%(?:\s*,\s*([0-9.]+))?\s*\)$/i
  );
  if (hslaMatch) {
    const h = Number(hslaMatch[1]);
    const s = clamp01(Number(hslaMatch[2]) / 100);
    const l = clamp01(Number(hslaMatch[3]) / 100);
    const a = hslaMatch[4] !== undefined ? clamp01(Number(hslaMatch[4])) : 1;
    if ([h, s, l, a].some((n) => Number.isNaN(n))) return { r: 0, g: 0, b: 0, a: 1, ok: false };
    const { r, g, b } = hslToRgb(h, s, l);
    return { r, g, b, a, ok: true };
  }
  const hex = input.startsWith("#") ? input.slice(1) : input;
  const isShort = hex.length === 3 || hex.length === 4;
  const isLong = hex.length === 6 || hex.length === 8;
  if (!isShort && !isLong) return { r: 0, g: 0, b: 0, a: 1, ok: false };
  const expand = (v: string) => v + v;
  const value = isShort ? hex.split("").map(expand).join("") : hex;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const a = value.length >= 8 ? parseInt(value.slice(6, 8), 16) / 255 : 1;
  if ([r, g, b, a].some((n) => Number.isNaN(n))) {
    return { r: 0, g: 0, b: 0, a: 1, ok: false };
  }
  return { r, g, b, a: Math.min(1, Math.max(0, a)), ok: true };
}

function toHex(r: number, g: number, b: number) {
  const to = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function toCssColor({ r, g, b, a }: ColorParse) {
  if (a === 0) return "transparent";
  if (a === 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
}

function toSerializedColor(value: ColorParse, format: ColorFormat): string {
  if (value.a === 0) return "transparent";
  if (format === "hex") return toHex(value.r, value.g, value.b);
  if (format === "rgb") return `rgb(${value.r}, ${value.g}, ${value.b})`;
  if (format === "rgba") return `rgba(${value.r}, ${value.g}, ${value.b}, ${Number(clamp01(value.a).toFixed(3))})`;

  const { h, s, l } = rgbToHsl(value.r, value.g, value.b);
  const hs = Number((s * 100).toFixed(1));
  const hl = Number((l * 100).toFixed(1));
  const hh = Number(h.toFixed(1));
  if (format === "hsl") return `hsl(${hh}, ${hs}%, ${hl}%)`;
  return `hsla(${hh}, ${hs}%, ${hl}%, ${Number(clamp01(value.a).toFixed(3))})`;
}

function ColorField({
  label,
  value,
  onChange,
  clearValue = "transparent",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  clearValue?: string;
}) {
  const parsed = parseColorValue(value);
  const { ok, r, g, b, a } = parsed;
  const isTransparent = value === "transparent" || (ok && a === 0);
  const [format, setFormat] = useState<ColorFormat>(() => guessFormat(value));
  const [textValue, setTextValue] = useState<string>(value);
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const didInitOpenRef = useRef(false);
  const [internalColor, setInternalColor] = useState<{ r: number; g: number; b: number; a: number }>(() => {
    if (ok) return { r, g, b, a };
    return { r: 0, g: 0, b: 0, a: 1 };
  });
  useEffect(() => {
    if (open) return;
    didInitOpenRef.current = false;
    setFormat(guessFormat(value));
    if (!ok) return;
    setInternalColor((prev) => {
      const nextA = hasExplicitAlpha(value) ? a : prev.a;
      return { r, g, b, a: nextA };
    });
  }, [value, open, ok, r, g, b, a]);
  useEffect(() => {
    if (!open) {
      didInitOpenRef.current = false;
      return;
    }
    if (didInitOpenRef.current) return;
    didInitOpenRef.current = true;
    if (!ok) return;
    setInternalColor((prev) => {
      const nextA = hasExplicitAlpha(value) ? a : prev.a;
      return { r, g, b, a: nextA };
    });
  }, [open, ok, r, g, b, a, value]);
  useEffect(() => {
    if (editing) return;
    if (!ok) {
      setTextValue(value);
      return;
    }
    const effective = { r, g, b, a: hasExplicitAlpha(value) ? a : internalColor.a, ok: true };
    setTextValue(toSerializedColor(effective, format));
  }, [value, format, editing, ok, r, g, b, a, internalColor.a]);
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = popoverRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [open]);
  const commit = (next: ColorParse, overrideFormat?: ColorFormat) => {
    if (!next.ok) return;
    const serialized = toSerializedColor(next, overrideFormat ?? format);
    onChange(serialized);
  };
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-2">
      <label className="text-xs text-gray-500 pt-1">{label}</label>
      <div ref={popoverRef} className="relative min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`w-7 h-7 rounded border border-gray-200 shrink-0 ${
              isTransparent
                ? "bg-[repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb_4px,#ffffff_4px,#ffffff_8px)]"
                : "bg-white"
            }`}
            style={
              isTransparent || !ok
                ? undefined
                : { backgroundColor: toCssColor({ ...internalColor, ok: true }) }
            }
            aria-label="Open color picker"
          />
          <input
            type="text"
            value={textValue}
            onFocus={() => setEditing(true)}
            onBlur={() => {
              setEditing(false);
              const next = parseColorValue(textValue);
              if (next.ok) {
                setInternalColor((prev) => {
                  const nextA = hasExplicitAlpha(textValue) ? next.a : prev.a;
                  return { r: next.r, g: next.g, b: next.b, a: nextA };
                });
                commit(next);
              }
            }}
            onChange={(e) => {
              const v = e.target.value;
              setTextValue(v);
              const next = parseColorValue(v);
              if (next.ok) {
                setInternalColor((prev) => {
                  const nextA = hasExplicitAlpha(v) ? next.a : prev.a;
                  return { r: next.r, g: next.g, b: next.b, a: nextA };
                });
                commit(next);
              }
            }}
            className="min-w-0 flex-1 text-xs border border-gray-200 rounded px-2 py-1 bg-white
              focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
          />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onChange(clearValue);
            }}
            className="w-7 h-7 inline-flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 shrink-0"
            title="Clear"
            aria-label="Clear color"
          >
            <X size={14} />
          </button>
        </div>

        {open && (
          <div className="absolute right-0 z-50 mt-2 w-60 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
            <div className="flex items-center gap-1 mb-2">
              {(["hex", "rgb", "rgba", "hsl", "hsla"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`px-2 py-1 rounded text-[11px] border ${
                    format === f
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            <RgbaColorPicker
              color={internalColor}
              onChange={(c) => {
                setInternalColor(c);
                commit({ r: c.r, g: c.g, b: c.b, a: c.a, ok: true });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function DimensionField({
  label,
  value,
  supportAuto = false,
  onChange,
}: {
  label: string;
  value: FlexValue | undefined;
  supportAuto?: boolean;
  onChange: (value: FlexValue | undefined) => void;
}) {
  const parsed = parseFlexValue(value);
  const units: DimUnit[] = supportAuto ? ["px", "%", "auto"] : ["px", "%"];
  const [localUnit, setLocalUnit] = useState<DimUnit>(parsed.unit);
  const [localNum, setLocalNum] = useState<string>(
    parsed.num !== undefined ? String(parsed.num) : ""
  );
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const p = parseFlexValue(value);
    setLocalUnit(p.unit);
    if (!focused) {
      setLocalNum(p.num !== undefined ? String(p.num) : "");
    }
  }, [value, focused]);

  const commitNum = (str: string) => {
    const num = str === "" ? undefined : Number(str);
    if (num !== undefined && isNaN(num)) return;
    onChange(buildFlexValue(num, localUnit));
  };

  const cycleUnit = () => {
    const idx = units.indexOf(localUnit);
    const nextUnit = units[(idx + 1) % units.length];
    setLocalUnit(nextUnit);
    const num = localNum === "" ? undefined : Number(localNum);
    if (nextUnit === "auto") {
      onChange("auto");
    } else if (nextUnit === "%") {
      onChange(num !== undefined ? (`${num}%` as FlexValue) : undefined);
    } else {
      onChange(num !== undefined ? num : undefined);
    }
  };

  return (
    <div>
      <label className="text-xs text-gray-400 block mb-0.5">{label}</label>
      <div className="flex">
        <input
          type="text"
          inputMode="numeric"
          value={localUnit === "auto" ? "" : localNum}
          placeholder={localUnit === "auto" ? "auto" : "-"}
          disabled={localUnit === "auto"}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commitNum(localNum);
          }}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || v === "-" || /^-?\d*\.?\d*$/.test(v)) {
              setLocalNum(v);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitNum(localNum);
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="flex-1 min-w-0 text-xs border border-gray-200 rounded-l px-1.5 py-1 bg-gray-50
            focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400
            disabled:bg-gray-100 disabled:text-gray-400
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          onClick={cycleUnit}
          className="shrink-0 text-[9px] font-semibold px-1.5 py-1 border border-l-0 border-gray-200 rounded-r
            bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors min-w-7"
          title="Toggle unit"
        >
          {localUnit}
        </button>
      </div>
    </div>
  );
}
