import { LABEL_BLOCK_CLASS, LABEL_INLINE_CLASS, SELECT_BASE_CLASS } from "./styles";

export function SelectField({
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
        <label className={LABEL_INLINE_CLASS}>{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${SELECT_BASE_CLASS} w-full min-w-0`}
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
      <label className={LABEL_BLOCK_CLASS}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full ${SELECT_BASE_CLASS}`}
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

