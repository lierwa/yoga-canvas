import { useState, useEffect } from "react";
import {
  Box,
  Type,
  ImageIcon,
  ScrollText,
  ChevronRight,
  ChevronDown,
  Trash2,
  Crosshair,
} from "lucide-react";
import { NodeTreePanel } from "@yoga-canvas/react";
import type {
  NodeTree,
  NodeType,
  CanvasContainerConfig,
} from "../types";
import { DEVICE_PRESETS } from "../types";
import { CanvasContainerSection } from "./left-panel/CanvasContainerSection";
import { ComponentsSection } from "./left-panel/ComponentsSection";

interface LeftPanelProps {
  tree: NodeTree;
  selectedNodeId: string | null;
  selectedNodeIds?: string[];
  onAddNode: (parentId: string, type: NodeType) => void;
  onUpdateContainer: (config: CanvasContainerConfig) => void;
  onSelectNode: (nodeId: string | null) => void;
  onSelectNodes?: (nodeIds: string[], primaryNodeId: string | null) => void;
  onRenameNode?: (nodeId: string, nextName: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onMoveNode: (
    nodeId: string,
    newParentId: string,
    insertIndex?: number,
  ) => void;
}

const COMPONENT_ITEMS: {
  type: NodeType;
  label: string;
  icon: typeof Box;
  desc: string;
}[] = [
  { type: "view", label: "Box", icon: Box, desc: "Basic flex container" },
  { type: "text", label: "Text", icon: Type, desc: "Multiline text node" },
  { type: "image", label: "Image", icon: ImageIcon, desc: "Image placeholder" },
  {
    type: "scrollview",
    label: "ScrollView",
    icon: ScrollText,
    desc: "Scrollable container",
  },
];

const NODE_TYPE_ICONS: Record<NodeType, typeof Box> = {
  view: Box,
  text: Type,
  image: ImageIcon,
  scrollview: ScrollText,
};

export default function LeftPanel({
  tree,
  selectedNodeId,
  selectedNodeIds,
  onAddNode,
  onUpdateContainer,
  onSelectNode,
  onSelectNodes,
  onRenameNode,
  onDeleteNode,
  onMoveNode,
}: LeftPanelProps) {
  const root = tree.nodes[tree.rootId];
  const [containerWidth, setContainerWidth] = useState(() =>
    typeof root?.flexStyle.width === "number" ? root.flexStyle.width : 375,
  );
  const [containerHeight, setContainerHeight] = useState<number | "auto">(() => {
    const h = root?.flexStyle.height;
    if (typeof h === "number") return h;
    if (h === "auto") return "auto";
    return 667;
  });
  const [selectedPreset, setSelectedPreset] = useState("Custom");

  useEffect(() => {
    const nextW = typeof root?.flexStyle.width === "number" ? root.flexStyle.width : 375;
    const rawH = root?.flexStyle.height;
    const nextH: number | "auto" =
      typeof rawH === "number" ? rawH : rawH === "auto" ? "auto" : 667;

    setContainerWidth(nextW);
    setContainerHeight(nextH);

    if (nextH === "auto") {
      setSelectedPreset("Auto Height");
      return;
    }

    const matched = DEVICE_PRESETS.find(
      (p) => p.name !== "Custom" && p.width === nextW && p.height === nextH,
    );
    setSelectedPreset(matched?.name ?? "Custom");
  }, [root?.flexStyle.height, root?.flexStyle.width]);

  const handlePresetChange = (name: string) => {
    setSelectedPreset(name);
    if (name === "Auto Height") {
      setContainerHeight("auto");
      onUpdateContainer({
        name: "Auto Height",
        width: containerWidth,
        height: "auto",
      });
      return;
    }
    const preset = DEVICE_PRESETS.find((p) => p.name === name);
    if (preset && preset.name !== "Custom") {
      setContainerWidth(preset.width);
      setContainerHeight(preset.height);
      onUpdateContainer({
        name: preset.name,
        width: preset.width,
        height: preset.height,
      });
    }
  };

  const handleCustomSize = (w: number, h: number | "auto") => {
    setContainerWidth(w);
    setContainerHeight(h);
    setSelectedPreset("Custom");
    onUpdateContainer({ name: "Custom", width: w, height: h });
  };

  const targetId = selectedNodeId ?? tree.rootId;
  const addToLabel = selectedNodeId
    ? `Add to: ${tree.nodes[selectedNodeId]?.name}`
    : "Add to: Root";
  const presetOptions = DEVICE_PRESETS.filter((p) => p.name !== "Custom");

  return (
    <div className="h-full w-full border-r border-gray-200 bg-white flex flex-col overflow-hidden">
      <div className="shrink-0">
        <CanvasContainerSection
          selectedPreset={selectedPreset}
          containerWidth={containerWidth}
          containerHeight={containerHeight}
          presets={presetOptions}
          onPresetChange={handlePresetChange}
          onCustomSize={handleCustomSize}
        />

        <ComponentsSection
          addToLabel={addToLabel}
          targetId={targetId}
          items={COMPONENT_ITEMS}
          onAddNode={onAddNode}
        />
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <NodeTreePanel
          tree={tree}
          selectedNodeId={selectedNodeId}
          selectedNodeIds={selectedNodeIds}
          onSelectNode={onSelectNode}
          onSelectNodes={onSelectNodes}
          onRenameNode={onRenameNode}
          onDeleteNode={onDeleteNode}
          onMoveNode={onMoveNode}
          icons={{
            reveal: <Crosshair size={14} />,
            delete: <Trash2 size={10} />,
            expand: <ChevronRight size={10} />,
            collapse: <ChevronDown size={10} />,
            renderNodeType: (node) => {
              const Icon = NODE_TYPE_ICONS[node.type as NodeType] ?? Box;
              return <Icon size={11} />;
            },
          }}
          className="flex-1 min-h-0"
        />
      </div>
    </div>
  );
}
