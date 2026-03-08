import { useEffect, useState } from "react";
import type { FlexValue } from "../../types";
import { Button } from "../../../components/Button";
import { INPUT_BASE_CLASS, LABEL_BLOCK_CLASS } from "./styles";

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

export function DimensionField({
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
    parsed.num !== undefined ? String(parsed.num) : "",
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
      <label className={LABEL_BLOCK_CLASS}>{label}</label>
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
          className={`${INPUT_BASE_CLASS} flex-1 min-w-0 rounded-l rounded-r-none disabled:bg-gray-100 disabled:text-gray-400
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={cycleUnit}
          className="shrink-0 text-[9px] font-semibold px-1.5 py-1 border border-l-0 border-gray-200 rounded-r bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors min-w-7"
          title="Toggle unit"
        >
          {localUnit}
        </Button>
      </div>
    </div>
  );
}

