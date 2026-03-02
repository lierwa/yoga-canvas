import type { ReactNode } from "react";

export function IconButton({
  title,
  ariaLabel,
  disabled,
  onClick,
  children,
  className = "",
}: {
  title?: string;
  ariaLabel?: string;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel ?? title}
      className={`w-6 h-6 inline-flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

