import type { ChangeEvent } from "react";

export function FileInputButton({
  label,
  buttonText,
  accept,
  onChange,
}: {
  label: string;
  buttonText: string;
  accept?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      <label className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded cursor-pointer hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors">
        <span>{buttonText}</span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={onChange}
        />
      </label>
    </div>
  );
}

