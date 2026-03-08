import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "../../../components/Button";

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
  collapsible = true,
  defaultCollapsed = false,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  noBorder?: boolean;
  isLast?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const canCollapse = !!title && collapsible;
  return (
    <div
      className={`px-4 py-3 ${
        isLast || noBorder ? "" : "border-b border-gray-100"
      }`}
    >
      {title && (
        <div
          className="flex items-center justify-between mb-2 cursor-pointer"
          onClick={() => setCollapsed((v) => !v)}
        >
          <h4 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
            {title}
          </h4>
          <div className="flex items-center gap-1">
            {actions ? <div className="shrink-0">{actions}</div> : null}
            {canCollapse ? (
              <Button
                variant="icon"
                className="w-6 h-6 border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                title={collapsed ? "Expand" : "Collapse"}
              >
                {collapsed ? (
                  <ChevronRight size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </Button>
            ) : null}
          </div>
        </div>
      )}
      {canCollapse && collapsed ? null : children}
    </div>
  );
}
