import { useState, useEffect, type ChangeEvent } from "react";
import { Trash2 } from "lucide-react";
import type {
  CanvasNode,
  FlexStyle,
  VisualStyle,
  TextProps,
  ImageProps,
} from "../types";
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
}: PropertiesPanelProps) {
  const [textContent, setTextContent] = useState(node?.textProps?.content ?? "");
  const [textContentFocused, setTextContentFocused] = useState(false);

  useEffect(() => {
    if (!textContentFocused) {
      setTextContent(node?.textProps?.content ?? "");
    }
  }, [node?.id, node?.textProps?.content, textContentFocused]);

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
    <div className="h-full w-full border-l border-gray-200 bg-white overflow-y-auto overflow-x-hidden min-w-0">
      <Section noBorder>
        <h3 className="text-sm font-semibold text-gray-800">{node.name}</h3>
        <p className="text-xs text-gray-400 mt-0.5">ID: {node.id}</p>
      </Section>

      {node.textProps && (
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

      {node.imageProps && (
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
        </div>
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
