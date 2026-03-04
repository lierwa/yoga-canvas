import { useEffect, useState } from "react";
import { INPUT_BASE_CLASS, LABEL_BLOCK_CLASS } from "./styles";

export function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  const [localValue, setLocalValue] = useState<string>(
    value !== undefined ? String(value) : "",
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
      <label className={LABEL_BLOCK_CLASS}>{label}</label>
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
        className={`${INPUT_BASE_CLASS}
          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
      />
    </div>
  );
}

