import type { ReactNode } from "react";

export function FieldGrid({
  cols = 2,
  gap = "gap-2",
  children,
}: {
  cols?: 2 | 3;
  gap?: string;
  children: ReactNode;
}) {
  const colsClass = cols === 3 ? "grid-cols-3" : "grid-cols-2";
  return <div className={`grid ${colsClass} ${gap}`}>{children}</div>;
}

