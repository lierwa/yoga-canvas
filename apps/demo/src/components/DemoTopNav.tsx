import type { ReactNode } from "react";

type DemoTopNavVariant = "static" | "sticky" | "overlay";

export function DemoTopNav({
  variant = "static",
  constrainWidth = false,
  leftSlot,
  centerSlot,
  rightSlot,
}: {
  variant?: DemoTopNavVariant;
  constrainWidth?: boolean;
  leftSlot: ReactNode;
  centerSlot?: ReactNode;
  rightSlot?: ReactNode;
}) {
  const outerClassName =
    variant === "sticky"
      ? "sticky top-0 z-20 border-b border-white/70 bg-white/75 backdrop-blur"
      : variant === "overlay"
        ? "absolute top-0 left-0 right-0 z-10 bg-white/85 backdrop-blur border-b border-white/35"
        : "bg-white/90 backdrop-blur border-b border-gray-200";

  const innerClassName = constrainWidth
    ? "mx-auto max-w-6xl relative px-6 py-3 flex items-center gap-4"
    : "relative px-6 py-3 flex items-center gap-4";

  return (
    <div className={outerClassName}>
      <div className={innerClassName}>
        <div className="shrink-0">{leftSlot}</div>
        {centerSlot}
        <div className="flex-1" />
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
    </div>
  );
}

