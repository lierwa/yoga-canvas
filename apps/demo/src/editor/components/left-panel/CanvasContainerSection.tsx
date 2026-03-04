import { Smartphone } from "lucide-react";
import type { CanvasContainerConfig } from "../../types";
import { LeftPanelSection } from "./LeftPanelSection";

export function CanvasContainerSection({
  selectedPreset,
  containerWidth,
  containerHeight,
  presets,
  onPresetChange,
  onCustomSize,
}: {
  selectedPreset: string;
  containerWidth: number;
  containerHeight: number | "auto";
  presets: readonly CanvasContainerConfig[];
  onPresetChange: (name: string) => void;
  onCustomSize: (w: number, h: number | "auto") => void;
}) {
  return (
    <LeftPanelSection title="Canvas Container">
      <div className="flex items-center gap-1.5 mb-2">
        <Smartphone size={14} className="text-gray-400 shrink-0" />
        <select
          value={selectedPreset}
          onChange={(e) => onPresetChange(e.target.value)}
          className="flex-1 text-xs border border-gray-200 rounded px-1.5 py-1 bg-gray-50
            focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="Auto Height">
            Auto Height ({containerWidth}×auto)
          </option>
          {presets.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name} ({p.width}×{p.height})
            </option>
          ))}
          <option value="Custom">
            Custom ({containerWidth}×
            {containerHeight === "auto" ? "auto" : containerHeight})
          </option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <label className="text-[10px] text-gray-400 block">Width</label>
          <input
            type="number"
            value={containerWidth}
            onChange={(e) => onCustomSize(Number(e.target.value), containerHeight)}
            className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 bg-gray-50
              focus:outline-none focus:ring-1 focus:ring-blue-400
              [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 block">Height</label>
          <input
            value={containerHeight === "auto" ? "auto" : String(containerHeight)}
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (!raw || raw.toLowerCase() === "auto") {
                onCustomSize(containerWidth, "auto");
                return;
              }
              const next = Number(raw);
              if (!Number.isFinite(next)) return;
              onCustomSize(containerWidth, next);
            }}
            className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 bg-gray-50
              focus:outline-none focus:ring-1 focus:ring-blue-400
              [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>
    </LeftPanelSection>
  );
}

