import { INPUT_BASE_CLASS, LABEL_BLOCK_CLASS } from "./styles";

export function TextAreaField({
  label,
  value,
  rows,
  onFocus,
  onBlur,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  onFocus?: () => void;
  onBlur?: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className={LABEL_BLOCK_CLASS}>{label}</label>
      <textarea
        value={value}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={`${INPUT_BASE_CLASS} resize-none`}
      />
    </div>
  );
}

