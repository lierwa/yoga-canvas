import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CanvasNode, NodeTree } from '@yoga-canvas/core';

type DropZone = 'before' | 'inside' | 'after' | null;

export type NodeTreePanelIcons = {
  reveal?: ReactNode;
  delete?: ReactNode;
  expand?: ReactNode;
  collapse?: ReactNode;
  renderNodeType?: (node: CanvasNode) => ReactNode;
};

export function NodeTreePanel({
  tree,
  selectedNodeId,
  onSelectNode,
  onDeleteNode,
  onMoveNode,
  canDelete = true,
  disabled = false,
  icons,
  title = 'Node Tree',
  className,
  maxDepth,
}: {
  tree: NodeTree;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onDeleteNode?: (nodeId: string) => void;
  onMoveNode?: (nodeId: string, newParentId: string, insertIndex?: number) => void;
  canDelete?: boolean;
  disabled?: boolean;
  icons?: NodeTreePanelIcons;
  title?: string;
  className?: string;
  maxDepth?: number;
}): JSX.Element | null {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rowElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [pendingRevealId, setPendingRevealId] = useState<string | null>(null);

  const registerRowElement = useCallback((nodeId: string, el: HTMLDivElement | null) => {
    const map = rowElementsRef.current;
    if (el) map.set(nodeId, el);
    else map.delete(nodeId);
  }, []);

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
        const container = containerRef.current;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const containerCenter = containerRect.top + containerRect.height / 2;
          const elCenter = elRect.top + elRect.height / 2;
          const delta = elCenter - containerCenter;
          const targetTop = container.scrollTop + delta;
          const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
          const nextTop = Math.min(Math.max(0, targetTop), maxTop);
          container.scrollTo({ top: nextTop, behavior: 'smooth' });
        } else {
          el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
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

  useEffect(() => {
    if (!selectedNodeId) return;
    revealSelectedNode();
  }, [revealSelectedNode, selectedNodeId]);

  const canReveal = Boolean(selectedNodeId);
  const root = tree.nodes[tree.rootId] ?? null;
  const effectiveCanDelete = canDelete && !disabled;
  const effectiveOnMoveNode = disabled ? undefined : onMoveNode;

  if (!root) return null;

  return (
    <div className={`flex flex-col h-full overflow-hidden ${className ?? ''}`}>
      <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1">{title}</h4>
        <button
          type="button"
          className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={revealSelectedNode}
          disabled={!canReveal}
          title="Reveal selected node"
        >
          {icons?.reveal ?? '⦿'}
        </button>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
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
          disabled={disabled}
          canDelete={effectiveCanDelete}
          onDelete={onDeleteNode}
          onMoveNode={effectiveOnMoveNode}
          icons={icons}
          maxDepth={maxDepth}
        />
      </div>
    </div>
  );
}

function isDescendant(tree: NodeTree, ancestorId: string, nodeId: string): boolean {
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
  disabled,
  canDelete,
  onDelete,
  onMoveNode,
  icons,
  maxDepth,
}: {
  node: CanvasNode;
  tree: NodeTree;
  selectedNodeId: string | null;
  rootId: string;
  depth: number;
  collapsedIds: Set<string>;
  onToggleCollapse: (nodeId: string) => void;
  registerRowElement: (nodeId: string, el: HTMLDivElement | null) => void;
  onSelect: (nodeId: string | null) => void;
  disabled: boolean;
  canDelete: boolean;
  onDelete?: ((nodeId: string) => void) | undefined;
  onMoveNode?: ((nodeId: string, newParentId: string, insertIndex?: number) => void) | undefined;
  icons?: NodeTreePanelIcons;
  maxDepth?: number;
}): JSX.Element | null {
  const [dropZone, setDropZone] = useState<DropZone>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);

  const isRoot = node.id === rootId;
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedNodeId;
  const expanded = isRoot ? true : !collapsedIds.has(node.id);
  const canAcceptChildren = node.type !== 'text';
  const canDrag = !disabled && Boolean(onMoveNode) && !isRoot;
  const allowRenderChildren = maxDepth === undefined ? true : depth < maxDepth;

  const getDropZone = useCallback(
    (e: React.DragEvent): DropZone => {
      const rect = rowRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const y = e.clientY - rect.top;
      const ratio = y / rect.height;
      if (isRoot) return 'inside';
      if (ratio < 0.25) return 'before';
      if (ratio > 0.75) return 'after';
      return 'inside';
    },
    [isRoot],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!canDrag) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData('text/plain', node.id);
      e.dataTransfer.effectAllowed = 'move';
    },
    [canDrag, node.id],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled || !onMoveNode) return;
      e.preventDefault();
      e.stopPropagation();
      const draggedId = e.dataTransfer.types.includes('text/plain') ? 'pending' : null;
      if (!draggedId) return;
      const zone = getDropZone(e);
      if (zone === 'inside' && !canAcceptChildren) {
        setDropZone(null);
        e.dataTransfer.dropEffect = 'none';
        return;
      }
      e.dataTransfer.dropEffect = 'move';
      setDropZone(zone);
    },
    [disabled, getDropZone, canAcceptChildren, onMoveNode],
  );

  const handleDragLeave = useCallback(() => {
    setDropZone(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (disabled || !onMoveNode) return;
      e.preventDefault();
      e.stopPropagation();
      const draggedId = e.dataTransfer.getData('text/plain');
      if (!draggedId || draggedId === node.id) {
        setDropZone(null);
        return;
      }
      if (isDescendant(tree, draggedId, node.id)) {
        setDropZone(null);
        return;
      }

      const zone = getDropZone(e);
      if (zone === 'inside') {
        if (canAcceptChildren) {
          onMoveNode(draggedId, node.id);
        }
      } else if (zone === 'before' || zone === 'after') {
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
        const insertIndex = zone === 'before' ? idx : idx + 1;
        onMoveNode(draggedId, parentId, insertIndex);
      }
      setDropZone(null);
    },
    [disabled, getDropZone, canAcceptChildren, node.id, node.parentId, onMoveNode, tree],
  );

  const dropIndicatorClass =
    dropZone === 'before'
      ? 'border-t-2 border-blue-500'
      : dropZone === 'after'
        ? 'border-b-2 border-blue-500'
        : dropZone === 'inside'
          ? 'bg-blue-100'
          : '';

  const typeLetter = useMemo(() => {
    const t = node.type || '';
    return (t[0] ?? '?').toUpperCase();
  }, [node.type]);

  const expandCollapseIcon = expanded ? (icons?.collapse ?? '▾') : (icons?.expand ?? '▸');
  const typeIcon = icons?.renderNodeType ? icons.renderNodeType(node) : null;
  const deleteIcon = icons?.delete ?? '×';

  return (
    <div>
      <div
        ref={(el) => {
          rowRef.current = el;
          registerRowElement(node.id, el);
        }}
        className={`group flex items-center gap-1 py-1.5 pr-1.5 rounded-md cursor-pointer text-xs
          ${isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'}
          ${dropIndicatorClass}`}
        style={{ paddingLeft: depth * 14 + 6 }}
        onClick={() => onSelect(node.id)}
        draggable={canDrag}
        onDragStart={canDrag ? handleDragStart : undefined}
        onDragOver={canDrag ? handleDragOver : undefined}
        onDragLeave={canDrag ? handleDragLeave : undefined}
        onDrop={canDrag ? handleDrop : undefined}
      >
        {hasChildren ? (
          <button
            className="p-0.5 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              if (!isRoot) onToggleCollapse(node.id);
            }}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expandCollapseIcon}
          </button>
        ) : (
          <span className="w-[16px] shrink-0" />
        )}

        {typeIcon ? (
          <span className="shrink-0 opacity-60">{typeIcon}</span>
        ) : (
          <span className="text-[10px] font-mono font-bold opacity-70 w-[14px] text-center shrink-0">{typeLetter}</span>
        )}
        <span className="truncate flex-1 ml-0.5">{node.name}</span>

        {Boolean(onDelete) && !isRoot && (
          <button
            className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-red-500 shrink-0 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={(e) => {
              e.stopPropagation();
              if (disabled || !canDelete) return;
              onDelete?.(node.id);
            }}
            disabled={disabled || !canDelete}
            title="Delete node"
          >
            {deleteIcon}
          </button>
        )}
      </div>

      {hasChildren && expanded && allowRenderChildren && (
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
                disabled={disabled}
                canDelete={canDelete}
                onDelete={onDelete}
                onMoveNode={onMoveNode}
                icons={icons}
                maxDepth={maxDepth}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
