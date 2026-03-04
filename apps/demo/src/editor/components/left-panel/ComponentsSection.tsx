import type { ComponentType } from "react";
import type { NodeType } from "../../types";
import { LeftPanelSection } from "./LeftPanelSection";

export function ComponentsSection({
  addToLabel,
  targetId,
  items,
  onAddNode,
}: {
  addToLabel: string;
  targetId: string;
  items: readonly {
    type: NodeType;
    label: string;
    icon: ComponentType<{ size?: string | number; className?: string }>;
    desc: string;
  }[];
  onAddNode: (parentId: string, type: NodeType) => void;
}) {
  return (
    <LeftPanelSection title="Components">
      <p className="text-[10px] text-gray-400 mb-2">{addToLabel}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((item) => (
          <button
            key={item.type}
            onClick={() => onAddNode(targetId, item.type)}
            className="flex flex-col items-center gap-1 px-2 py-2 rounded-md border border-gray-200
              hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600
              text-gray-600 transition-colors group"
            title={item.desc}
          >
            <item.icon size={18} className="group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </LeftPanelSection>
  );
}
