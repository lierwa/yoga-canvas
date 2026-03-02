import type { ReactNode } from "react";

export function SubHeader({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-1">
      <div className="text-xs text-gray-400">{title}</div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export function Section({
  title,
  actions,
  children,
  noBorder = false,
  isLast = false,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  noBorder?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      className={`px-4 py-3 ${isLast || noBorder ? "" : "border-b border-gray-100"}`}
    >
      {title && (
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
            {title}
          </h4>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      )}
      {children}
    </div>
  );
}

