import { useEffect, useRef, useState } from "react";
import { RgbaColorPicker } from "react-colorful";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";
import { LABEL_INLINE_CLASS, TEXT_INPUT_WHITE_CLASS } from "./styles";
import { Button } from "../../../components/Button";

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

function hslToRgb(
  h: number,
  s: number,
  l: number,
): { r: number; g: number; b: number } {
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
  const rgbaMatch = input.match(
    /^rgba?\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i,
  );
  if (rgbaMatch) {
    const r = Math.min(255, Math.max(0, Number(rgbaMatch[1])));
    const g = Math.min(255, Math.max(0, Number(rgbaMatch[2])));
    const b = Math.min(255, Math.max(0, Number(rgbaMatch[3])));
    const a =
      rgbaMatch[4] !== undefined
        ? Math.min(1, Math.max(0, Number(rgbaMatch[4])))
        : 1;
    return { r, g, b, a, ok: true };
  }
  const hslaMatch = input.match(
    /^hsla?\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%(?:\s*,\s*([0-9.]+))?\s*\)$/i,
  );
  if (hslaMatch) {
    const h = Number(hslaMatch[1]);
    const s = clamp01(Number(hslaMatch[2]) / 100);
    const l = clamp01(Number(hslaMatch[3]) / 100);
    const a = hslaMatch[4] !== undefined ? clamp01(Number(hslaMatch[4])) : 1;
    if ([h, s, l, a].some((n) => Number.isNaN(n)))
      return { r: 0, g: 0, b: 0, a: 1, ok: false };
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
  const to = (n: number) =>
    Math.min(255, Math.max(0, n)).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function toSerializedColor(value: ColorParse, format: ColorFormat): string {
  if (value.a === 0) return "transparent";
  if (format === "hex") return toHex(value.r, value.g, value.b);
  if (format === "rgb") return `rgb(${value.r}, ${value.g}, ${value.b})`;
  if (format === "rgba")
    return `rgba(${value.r}, ${value.g}, ${value.b}, ${Number(
      clamp01(value.a).toFixed(3),
    )})`;

  const { h, s, l } = rgbToHsl(value.r, value.g, value.b);
  const hs = Number((s * 100).toFixed(1));
  const hl = Number((l * 100).toFixed(1));
  const hh = Number(h.toFixed(1));
  if (format === "hsl") return `hsl(${hh}, ${hs}%, ${hl}%)`;
  return `hsla(${hh}, ${hs}%, ${hl}%, ${Number(clamp01(value.a).toFixed(3))})`;
}

function toCssColor({ r, g, b, a }: ColorParse) {
  if (a === 0) return "transparent";
  if (a === 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})`;
}

export function ColorField({
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
  const [internalColor, setInternalColor] = useState<{
    r: number;
    g: number;
    b: number;
    a: number;
  }>(() => {
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
    const effective = {
      r,
      g,
      b,
      a: hasExplicitAlpha(value) ? a : internalColor.a,
      ok: true,
    };
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
      <label className={`${LABEL_INLINE_CLASS} pt-1`}>{label}</label>
      <div ref={popoverRef} className="relative min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen((v) => !v)}
            className={`w-6 h-6 rounded border border-gray-200 shrink-0 cursor-pointer ${
              isTransparent
                ? "bg-[repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb_4px,#ffffff_4px,#ffffff_8px)]"
                : "bg-white"
            }`}
            style={
              isTransparent || !ok
                ? undefined
                : {
                    backgroundColor: toCssColor({ ...internalColor, ok: true }),
                  }
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
            className={TEXT_INPUT_WHITE_CLASS}
          />
          <IconButton
            title="Clear"
            ariaLabel="Clear color"
            onClick={() => {
              setOpen(false);
              onChange(clearValue);
            }}
            className="shrink-0"
          >
            <X size={14} />
          </IconButton>
        </div>

        {open && (
          <div className="absolute right-0 z-50 mt-2 w-60 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
            <div className="flex items-center gap-1 mb-2">
              {(["hex", "rgb", "rgba", "hsl", "hsla"] as const).map((f) => (
                <Button
                  variant="ghost"
                  size="sm"
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-2 py-1 rounded text-[11px] border ${
                    format === f
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {f.toUpperCase()}
                </Button>
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
