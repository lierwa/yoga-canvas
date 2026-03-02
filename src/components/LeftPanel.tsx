import { useState, useRef, useCallback, useEffect } from "react";
import {
  Box,
  Type,
  ImageIcon,
  ScrollText,
  Smartphone,
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
        <Section title="Canvas Container">
          <div className="flex items-center gap-1.5 mb-2">
            <Smartphone size={14} className="text-gray-400 shrink-0" />
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="flex-1 text-xs border border-gray-200 rounded px-1.5 py-1 bg-gray-50
                focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="Auto Height">
                Auto Height ({containerWidth}×auto)
              </option>
              {DEVICE_PRESETS.filter((p) => p.name !== "Custom").map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.width}×{p.height})
                </option>
              ))}
              <option value="Custom">
                Custom ({containerWidth}×{containerHeight === "auto" ? "auto" : containerHeight})
              </option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10px] text-gray-400 block">Width</label>
              <input
                type="number"
                value={containerWidth}
                onChange={(e) =>
                  handleCustomSize(Number(e.target.value), containerHeight)
                }
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
                    handleCustomSize(containerWidth, "auto");
                    return;
                  }
                  const next = Number(raw);
                  if (!Number.isFinite(next)) return;
                  handleCustomSize(containerWidth, next);
                }}
                className="w-full text-xs border border-gray-200 rounded px-1.5 py-1 bg-gray-50
                  focus:outline-none focus:ring-1 focus:ring-blue-400
                  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
        </Section>

        <Section title="Components">
          <p className="text-[10px] text-gray-400 mb-2">
            {selectedNodeId
              ? `Add to: ${tree.nodes[selectedNodeId]?.name}`
              : "Add to: Root"}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {COMPONENT_ITEMS.map((item) => (
              <button
                key={item.type}
                onClick={() => onAddNode(targetId, item.type)}
                className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-md border border-gray-200
                  hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600
                  text-gray-600 transition-colors group"
                title={item.desc}
              >
                <item.icon
                  size={18}
                  className="group-hover:scale-110 transition-transform"
                />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </Section>
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-3 py-3 border-b border-gray-100">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {title}
      </h4>
      {children}
    </div>
  );
}
