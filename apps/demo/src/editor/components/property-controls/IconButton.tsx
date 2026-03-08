import type { ReactNode } from "react";
import { Button } from "../../../components/Button";

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
    <Button
      variant="icon"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel ?? title}
      className={className}
    >
      {children}
    </Button>
  );
}

