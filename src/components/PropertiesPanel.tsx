import { useState, useEffect } from "react";
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
    <div className="h-full w-full border-l border-gray-200 bg-white overflow-y-auto">
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
                value={node.textProps.fontWeight}
                options={["normal", "bold"] as const}
                onChange={(val) =>
                  updateText({ fontWeight: val as "normal" | "bold" })
                }
              />
            </FieldGrid>
            <ColorField
              label="Color"
              value={node.textProps.color}
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
          </div>
        </Section>
      )}

      {node.imageProps && (
        <Section title="Image">
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
            {node.imageProps.src && (
              <button
                onClick={() => updateImage({ src: "" })}
                className="text-[10px] text-red-500 hover:text-red-700 transition-colors"
              >
                Remove Image
              </button>
            )}
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
        </div>
      </Section>

      <Section title="Appearance">
        <div className="space-y-2">
          <ColorField
            label="Background"
            value={v.backgroundColor}
            onChange={(c) => updateVisual({ backgroundColor: c })}
          />
          <ColorField
            label="Border Color"
            value={v.borderColor}
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

function Section({
  title,
  children,
  noBorder = false,
  isLast = false,
}: {
  title?: string;
  children: React.ReactNode;
  noBorder?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      className={`px-4 py-3 ${isLast || noBorder ? "" : "border-b border-gray-100"}`}
    >
      {title && (
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {title}
        </h4>
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
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-500 shrink-0 w-20">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-gray-50
            focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400
            w-full max-w-35"
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

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-gray-500 shrink-0 w-20">{label}</label>
      <div className="flex items-center gap-1.5 flex-1 max-w-[140px]">
        <input
          type="color"
          value={value === "transparent" ? "#ffffff" : value}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded border border-gray-200 cursor-pointer p-0 bg-transparent
            [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-none"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 text-xs border border-gray-200 rounded px-1.5 py-1 bg-gray-50
            focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
        />
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
