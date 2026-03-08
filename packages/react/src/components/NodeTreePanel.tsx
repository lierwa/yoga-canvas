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
  selectedNodeIds,
  onSelectNode,
  onSelectNodes,
  onRenameNode,
  onDeleteNode,
  onMoveNode,
  canDelete = true,
  canRename = true,
  disabled = false,
  icons,
  title = 'Node Tree',
  className,
  maxDepth,
}: {
  tree: NodeTree;
  selectedNodeId: string | null;
  selectedNodeIds?: string[];
  onSelectNode: (nodeId: string | null) => void;
  onSelectNodes?: (nodeIds: string[], primaryNodeId: string | null) => void;
  onRenameNode?: (nodeId: string, nextName: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onMoveNode?: (nodeId: string, newParentId: string, insertIndex?: number) => void;
  canDelete?: boolean;
  canRename?: boolean;
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
  const anchorIdRef = useRef<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState<string>('');

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
  const effectiveCanRename = canRename && !disabled && Boolean(onRenameNode);

  const effectiveSelectedIds = useMemo(() => {
    if (selectedNodeIds) return selectedNodeIds;
    if (selectedNodeId) return [selectedNodeId];
    return [];
  }, [selectedNodeId, selectedNodeIds]);

  const selectedIdSet = useMemo(() => new Set(effectiveSelectedIds), [effectiveSelectedIds]);
  const primarySelectedId = selectedNodeId ?? (effectiveSelectedIds.length ? effectiveSelectedIds[0] : null);

  const visibleNodeIds = useMemo(() => {
    const out: string[] = [];
    const walk = (nodeId: string, depth: number) => {
      out.push(nodeId);
      const node = tree.nodes[nodeId];
      if (!node) return;
      if (nodeId !== tree.rootId && collapsedIds.has(nodeId)) return;
      if (maxDepth !== undefined && depth >= maxDepth) return;
      for (const childId of node.children) {
        if (!tree.nodes[childId]) continue;
        walk(childId, depth + 1);
      }
    };
    if (tree.nodes[tree.rootId]) walk(tree.rootId, 0);
    return out;
  }, [tree, collapsedIds, maxDepth]);

  const applySelection = useCallback(
    (nextIds: string[], nextPrimaryId: string | null) => {
      const primary = nextPrimaryId ?? (nextIds.length ? nextIds[nextIds.length - 1] : null);
      onSelectNodes?.(nextIds, primary);
      onSelectNode(primary);
    },
    [onSelectNode, onSelectNodes],
  );

  const startRename = useCallback(
    (nodeId: string) => {
      if (!effectiveCanRename) return;
      const node = tree.nodes[nodeId];
      if (!node) return;
      if (nodeId === tree.rootId) return;
      setEditingNodeId(nodeId);
      setDraftName(node.name ?? '');
    },
    [effectiveCanRename, tree],
  );

  const cancelRename = useCallback(() => {
    setEditingNodeId(null);
    setDraftName('');
  }, []);

  const commitRename = useCallback(
    (nodeId: string) => {
      if (!effectiveCanRename) {
        cancelRename();
        return;
      }
      const node = tree.nodes[nodeId];
      if (!node) {
        cancelRename();
        return;
      }
      const next = draftName.trim();
      if (!next) {
        cancelRename();
        return;
      }
      if (next !== node.name) {
        onRenameNode?.(nodeId, next);
      }
      cancelRename();
    },
    [cancelRename, draftName, effectiveCanRename, onRenameNode, tree],
  );

  const handleRowClick = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      if (disabled) return;

      const isMeta = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;

      if (isShift) {
        const anchor = anchorIdRef.current ?? primarySelectedId ?? nodeId;
        const a = visibleNodeIds.indexOf(anchor);
        const b = visibleNodeIds.indexOf(nodeId);
        if (a >= 0 && b >= 0) {
          const [start, end] = a < b ? [a, b] : [b, a];
          const range = visibleNodeIds.slice(start, end + 1);
          anchorIdRef.current = anchor;
          applySelection(range, nodeId);
          return;
        }
      }

      if (isMeta) {
        const next = new Set(effectiveSelectedIds);
        if (next.has(nodeId)) next.delete(nodeId);
        else next.add(nodeId);
        const ids = Array.from(next);
        anchorIdRef.current = nodeId;
        applySelection(ids, nodeId);
        return;
      }

      if (effectiveSelectedIds.length > 1) {
        anchorIdRef.current = nodeId;
        applySelection([nodeId], nodeId);
        return;
      }

      if (primarySelectedId !== nodeId || effectiveSelectedIds.length !== 1) {
        anchorIdRef.current = nodeId;
        applySelection([nodeId], nodeId);
        return;
      }

      anchorIdRef.current = nodeId;
      applySelection([nodeId], nodeId);
    },
    [applySelection, disabled, effectiveSelectedIds, primarySelectedId, visibleNodeIds],
  );

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
          selectedIdSet={selectedIdSet}
          primarySelectedId={primarySelectedId}
          rootId={tree.rootId}
          depth={0}
          collapsedIds={collapsedIds}
          onToggleCollapse={toggleCollapse}
          registerRowElement={registerRowElement}
          onRowClick={handleRowClick}
          onTitleClick={startRename}
          editingNodeId={editingNodeId}
          draftName={draftName}
          setDraftName={setDraftName}
          onCommitRename={commitRename}
          onCancelRename={cancelRename}
          disabled={disabled}
          canDelete={effectiveCanDelete}
          canRename={effectiveCanRename}
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
  selectedIdSet,
  primarySelectedId,
  rootId,
  depth,
  collapsedIds,
  onToggleCollapse,
  registerRowElement,
  onRowClick,
  onTitleClick,
  editingNodeId,
  draftName,
  setDraftName,
  onCommitRename,
  onCancelRename,
  disabled,
  canDelete,
  canRename,
  onDelete,
  onMoveNode,
  icons,
  maxDepth,
}: {
  node: CanvasNode;
  tree: NodeTree;
  selectedIdSet: Set<string>;
  primarySelectedId: string | null;
  rootId: string;
  depth: number;
  collapsedIds: Set<string>;
  onToggleCollapse: (nodeId: string) => void;
  registerRowElement: (nodeId: string, el: HTMLDivElement | null) => void;
  onRowClick: (nodeId: string, e: React.MouseEvent) => void;
  onTitleClick: (nodeId: string) => void;
  editingNodeId: string | null;
  draftName: string;
  setDraftName: (next: string) => void;
  onCommitRename: (nodeId: string) => void;
  onCancelRename: () => void;
  disabled: boolean;
  canDelete: boolean;
  canRename: boolean;
  onDelete?: ((nodeId: string) => void) | undefined;
  onMoveNode?: ((nodeId: string, newParentId: string, insertIndex?: number) => void) | undefined;
  icons?: NodeTreePanelIcons;
  maxDepth?: number;
}): JSX.Element | null {
  const [dropZone, setDropZone] = useState<DropZone>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);

  const isRoot = node.id === rootId;
  const hasChildren = node.children.length > 0;
  const isSelected = selectedIdSet.has(node.id);
  const isPrimarySelected = node.id === primarySelectedId;
  const expanded = isRoot ? true : !collapsedIds.has(node.id);
  const canAcceptChildren = node.type !== 'text';
  const canDrag = !disabled && Boolean(onMoveNode) && !isRoot;
  const allowRenderChildren = maxDepth === undefined ? true : depth < maxDepth;
  const isEditing = editingNodeId === node.id;

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
          ${
            isPrimarySelected
              ? 'bg-blue-50 text-blue-700'
              : isSelected
                ? 'bg-blue-50/60 text-blue-700'
                : 'hover:bg-gray-50 text-gray-600'
          }
          ${dropIndicatorClass}`}
        style={{ paddingLeft: depth * 14 + 6 }}
        onClick={(e) => onRowClick(node.id, e)}
        draggable={canDrag}
        onDragStart={canDrag ? handleDragStart : undefined}
        onDragOver={canDrag ? handleDragOver : undefined}
        onDragLeave={canDrag ? handleDragLeave : undefined}
        onDrop={canDrag ? handleDrop : undefined}
      >
        {hasChildren ? (
          <button
            type="button"
            className="p-0.5 shrink-0 rounded"
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

        {isEditing ? (
          <input
            className="flex-1 min-w-0 ml-0.5 px-1 py-0.5 text-xs rounded bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={draftName}
            autoFocus
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => onCommitRename(node.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onCommitRename(node.id);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onCancelRename();
              }
            }}
          />
        ) : (
          <span
            className="truncate flex-1 ml-0.5"
            onClick={(e) => {
              if (!canRename) return;
              if (isRoot) return;
              if (disabled) return;
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              if (!isPrimarySelected) return;
              if (!isSelected || selectedIdSet.size !== 1) return;
              e.stopPropagation();
              onTitleClick(node.id);
            }}
          >
            {node.name}
          </span>
        )}

        {Boolean(onDelete) && !isRoot && (
          <button
            type="button"
            className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-red-500 shrink-0 transition-opacity rounded disabled:opacity-40 disabled:cursor-not-allowed"
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
                selectedIdSet={selectedIdSet}
                primarySelectedId={primarySelectedId}
                rootId={rootId}
                depth={depth + 1}
                collapsedIds={collapsedIds}
                onToggleCollapse={onToggleCollapse}
                registerRowElement={registerRowElement}
                onRowClick={onRowClick}
                onTitleClick={onTitleClick}
                editingNodeId={editingNodeId}
                draftName={draftName}
                setDraftName={setDraftName}
                onCommitRename={onCommitRename}
                onCancelRename={onCancelRename}
                disabled={disabled}
                canDelete={canDelete}
                canRename={canRename}
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
