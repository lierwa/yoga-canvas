import { useState, useRef, useCallback, useEffect } from "react";
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
import type {
  CanvasNode,
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
  onAddNode: (parentId: string, type: NodeType) => void;
  onUpdateContainer: (config: CanvasContainerConfig) => void;
  onSelectNode: (nodeId: string | null) => void;
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
  onAddNode,
  onUpdateContainer,
  onSelectNode,
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
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [pendingRevealId, setPendingRevealId] = useState<string | null>(null);
  const rowElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const nodeTreeScrollRef = useRef<HTMLDivElement | null>(null);

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

  const registerRowElement = useCallback(
    (nodeId: string, el: HTMLDivElement | null) => {
      const map = rowElementsRef.current;
      if (el) map.set(nodeId, el);
      else map.delete(nodeId);
    },
    [],
  );

  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const revealSelectedNode = useCallback(() => {
    const id = selectedNodeId;
    if (!id) return;
    if (!tree.nodes[id]) return;

    const ancestorIds: string[] = [];
    let current = tree.nodes[id];
    while (current?.parentId) {
      ancestorIds.push(current.parentId);
      current = tree.nodes[current.parentId];
    }

    setCollapsedIds((prev) => {
      const next = new Set(prev);
      for (const aid of ancestorIds) next.delete(aid);
      return next;
    });
    setPendingRevealId(id);
  }, [selectedNodeId, tree.nodes]);

  useEffect(() => {
    if (!pendingRevealId) return;

    let raf = 0;
    let tries = 0;
    const attempt = () => {
      const el = rowElementsRef.current.get(pendingRevealId);
      if (el) {
        const container = nodeTreeScrollRef.current;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const containerCenter = containerRect.top + containerRect.height / 2;
          const elCenter = elRect.top + elRect.height / 2;
          const delta = elCenter - containerCenter;
          const targetTop = container.scrollTop + delta;
          const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
          const nextTop = Math.min(Math.max(0, targetTop), maxTop);
          container.scrollTo({ top: nextTop, behavior: "smooth" });
        } else {
          el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
        }
        setPendingRevealId(null);
        return;
      }

      tries += 1;
      if (tries < 12) {
        raf = requestAnimationFrame(attempt);
      } else {
        setPendingRevealId(null);
      }
    };

    raf = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(raf);
  }, [pendingRevealId]);

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
        <div className="px-3 py-3 border-b border-gray-100 flex items-center gap-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1">
            Node Tree
          </h4>
          <button
            type="button"
            className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={revealSelectedNode}
            disabled={!selectedNodeId}
            title="Reveal selected node"
          >
            <Crosshair size={14} />
          </button>
        </div>
        <div ref={nodeTreeScrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
          <NodeTreeItem
            node={root}
            tree={tree}
            selectedNodeId={selectedNodeId}
            rootId={tree.rootId}
            depth={0}
            collapsedIds={collapsedIds}
            onToggleCollapse={toggleCollapse}
            registerRowElement={registerRowElement}
            onSelect={onSelectNode}
            onDelete={onDeleteNode}
            onMoveNode={onMoveNode}
          />
        </div>
      </div>
    </div>
  );
}

type DropZone = "before" | "inside" | "after" | null;

function isDescendant(
  tree: NodeTree,
  ancestorId: string,
  nodeId: string,
): boolean {
  let current = tree.nodes[nodeId];
  while (current) {
    if (current.id === ancestorId) return true;
    if (!current.parentId) return false;
    current = tree.nodes[current.parentId];
  }
  return false;
}

function NodeTreeItem({
  node,
  tree,
  selectedNodeId,
  rootId,
  depth,
  collapsedIds,
  onToggleCollapse,
  registerRowElement,
  onSelect,
  onDelete,
  onMoveNode,
}: {
  node: CanvasNode;
  tree: NodeTree;
  selectedNodeId: string | null;
  rootId: string;
  depth: number;
  collapsedIds: Set<string>;
  onToggleCollapse: (nodeId: string) => void;
  registerRowElement: (nodeId: string, el: HTMLDivElement | null) => void;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  onMoveNode: (
    nodeId: string,
    newParentId: string,
    insertIndex?: number,
  ) => void;
}) {
  const [dropZone, setDropZone] = useState<DropZone>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedNodeId;
  const isRoot = node.id === rootId;
  const expanded = isRoot ? true : !collapsedIds.has(node.id);
  const Icon = NODE_TYPE_ICONS[node.type] ?? Box;
  const canAcceptChildren = node.type !== "text";

  const getDropZone = useCallback(
    (e: React.DragEvent): DropZone => {
      const rect = rowRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const y = e.clientY - rect.top;
      const ratio = y / rect.height;
      if (isRoot) return "inside";
      if (ratio < 0.25) return "before";
      if (ratio > 0.75) return "after";
      return "inside";
    },
    [isRoot],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (isRoot) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData("text/plain", node.id);
      e.dataTransfer.effectAllowed = "move";
    },
    [node.id, isRoot],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const draggedId = e.dataTransfer.types.includes("text/plain")
        ? "pending"
        : null;
      if (!draggedId) return;
      const zone = getDropZone(e);
      if (zone === "inside" && !canAcceptChildren) {
        setDropZone(null);
        e.dataTransfer.dropEffect = "none";
        return;
      }
      e.dataTransfer.dropEffect = "move";
      setDropZone(zone);
    },
    [getDropZone, canAcceptChildren],
  );

  const handleDragLeave = useCallback(() => {
    setDropZone(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const draggedId = e.dataTransfer.getData("text/plain");
      if (!draggedId || draggedId === node.id) {
        setDropZone(null);
        return;
      }
      // Prevent dropping a node into its own descendant
      if (isDescendant(tree, draggedId, node.id)) {
        setDropZone(null);
        return;
      }

      const zone = getDropZone(e);
      if (zone === "inside") {
        if (canAcceptChildren) {
          onMoveNode(draggedId, node.id);
        }
      } else if (zone === "before" || zone === "after") {
        const parentId = node.parentId;
        if (!parentId) {
          setDropZone(null);
          return;
        }
        const parent = tree.nodes[parentId];
        if (!parent) {
          setDropZone(null);
          return;
        }
        const idx = parent.children.indexOf(node.id);
        const insertIndex = zone === "before" ? idx : idx + 1;
        onMoveNode(draggedId, parentId, insertIndex);
      }
      setDropZone(null);
    },
    [node.id, node.parentId, tree, canAcceptChildren, getDropZone, onMoveNode],
  );

  const dropIndicatorClass =
    dropZone === "before"
      ? "border-t-2 border-blue-500"
      : dropZone === "after"
        ? "border-b-2 border-blue-500"
        : dropZone === "inside"
          ? "bg-blue-100"
          : "";

  return (
    <div>
      <div
        ref={(el) => {
          rowRef.current = el;
          registerRowElement(node.id, el);
        }}
        className={`group flex items-center gap-0.5 py-1 pr-1 rounded cursor-pointer text-[11px]
          ${isSelected ? "bg-blue-50 text-blue-700" : "hover:bg-gray-50 text-gray-600"}
          ${dropIndicatorClass}`}
        style={{ paddingLeft: depth * 12 + 4 }}
        onClick={() => onSelect(node.id)}
        draggable={!isRoot}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {hasChildren ? (
          <button
            className="p-0.5 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              if (!isRoot) onToggleCollapse(node.id);
            }}
          >
            {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </button>
        ) : (
          <span className="w-[14px] shrink-0" />
        )}
        <Icon size={11} className="shrink-0 opacity-60" />
        <span className="truncate flex-1 ml-0.5">{node.name}</span>
        {!isRoot && (
          <button
            className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-red-500 shrink-0 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            title="Delete node"
          >
            <Trash2 size={10} />
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children.map((childId: string) => {
            const child = tree.nodes[childId];
            if (!child) return null;
            return (
              <NodeTreeItem
                key={childId}
                node={child}
                tree={tree}
                selectedNodeId={selectedNodeId}
                rootId={rootId}
                depth={depth + 1}
                collapsedIds={collapsedIds}
                onToggleCollapse={onToggleCollapse}
                registerRowElement={registerRowElement}
                onSelect={onSelect}
                onDelete={onDelete}
                onMoveNode={onMoveNode}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
