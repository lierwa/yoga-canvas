import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { exportToJSON, type NodeDescriptor } from '@yoga-canvas/core';
import { EditorCanvas, ResizablePanels, useCanvasInteraction } from '@yoga-canvas/react';
import { ArrowLeft, Crosshair } from 'lucide-react';
import Toolbar from '../components/Toolbar';
import LeftPanel from '../components/LeftPanel';
import PropertiesPanel from '../components/PropertiesPanel';
import PreviewModal from '../components/PreviewModal';
import LiveCodeEditorPanel from '../components/LiveCodeEditorPanel';
import { buildDescriptorFromTree } from '../components/live-code-editor/descriptor';
import { useNodeTree } from '../hooks/useNodeTree';
import { getProject, saveProjectPayload } from '../workspace/projectStore';
import { useDemoI18n } from '../../i18n';

type EditorPageProps = {
  projectId: string;
  onExit: () => void;
};

export default function EditorPage({ projectId, onExit }: EditorPageProps) {
  const { t } = useDemoI18n();
  const project = useMemo(() => getProject(projectId), [projectId]);
  const initial = project?.payload ?? null;

  const {
    tree,
    ready,
    canUndo,
    canRedo,
    scrollManager,
    undo,
    redo,
    updateNodeFlexStyle,
    updateNodeVisualStyle,
    updateTextProps,
    addNodeByType,
    deleteNode,
    moveNode,
    resizeNode,
    rotateNodeLive,
    moveAbsoluteNodeLive,
    commitLiveUpdate,
    updateImageProps,
    updateCanvasContainer,
    replaceDescriptor,
    updateNodeName,
    insertNodeDescriptors,
  } = useNodeTree(
    initial?.kind === 'tree'
      ? { initialTreeJSON: initial.treeJSON }
      : initial?.kind === 'descriptor'
        ? { initialDescriptor: initial.descriptor }
        : undefined,
  );

  const {
    selection,
    scale,
    offset,
    scrollTick,
    selectNode,
    focusNode,
    setScaleAt,
    resetView,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
    handleWheel,
  } = useCanvasInteraction(tree, resizeNode, rotateNodeLive, moveNode, commitLiveUpdate, scrollManager, moveAbsoluteNodeLive);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const initialViewRef = useRef<{ scale: number; offset: { x: number; y: number } } | null>(null);
  const didInitViewRef = useRef(false);
  const [viewInitialized, setViewInitialized] = useState(false);
  const selectedNode = selection.selectedNodeId ? tree.nodes[selection.selectedNodeId] ?? null : null;
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const copyBufferRef = useRef<NodeDescriptor[] | null>(null);
  const treeRef = useRef(tree);
  treeRef.current = tree;
  const selectedNodeIdsRef = useRef<string[]>([]);
  selectedNodeIdsRef.current = selectedNodeIds;
  const selectedPrimaryIdRef = useRef<string | null>(null);
  selectedPrimaryIdRef.current = selection.selectedNodeId;

  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<number | null>(null);
  const didPersistSeedRef = useRef(false);

  useEffect(() => {
    if (!project) return;
    document.title = `${project.name} · Yoga Canvas`;
  }, [project]);

  useEffect(() => {
    if (!ready) return;
    if (!project) return;
    if (didPersistSeedRef.current) return;
    if (project.payload.kind === 'descriptor') {
      const treeJSON = exportToJSON(tree);
      saveProjectPayload(projectId, { kind: 'tree', treeJSON });
    }
    didPersistSeedRef.current = true;
  }, [ready, project, projectId, tree]);

  useEffect(() => {
    if (!ready) return;
    if (!project) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setSaving(true);
    saveTimerRef.current = window.setTimeout(() => {
      const treeJSON = exportToJSON(tree);
      saveProjectPayload(projectId, { kind: 'tree', treeJSON });
      setSaving(false);
      saveTimerRef.current = null;
    }, 400);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    };
  }, [tree, ready, project, projectId]);

  const blurActiveFormElement = useCallback(() => {
    const el = document.activeElement;
    if (!el) return;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      (el as HTMLElement).blur();
    }
  }, []);

  const handleCanvasMouseDown = useCallback(
    (e: Parameters<typeof handleMouseDown>[0]) => {
      blurActiveFormElement();
      handleMouseDown(e);
    },
    [blurActiveFormElement, handleMouseDown],
  );

  const handleCanvasDoubleClick = useCallback(
    (e: Parameters<typeof handleDoubleClick>[0]) => {
      blurActiveFormElement();
      handleDoubleClick(e);
    },
    [blurActiveFormElement, handleDoubleClick],
  );

  const handleCanvasWheel = useCallback(
    (e: Parameters<typeof handleWheel>[0]) => {
      blurActiveFormElement();
      handleWheel(e);
    },
    [blurActiveFormElement, handleWheel],
  );

  const handleFocusNode = useCallback(() => {
    if (!selection.selectedNodeId) return;
    const el = canvasContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    focusNode(selection.selectedNodeId, rect.width, rect.height, { animate: true, durationMs: 320 });
  }, [selection.selectedNodeId, focusNode]);

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const parentId = tree.nodes[nodeId]?.parentId;
      deleteNode(nodeId);
      selectNode(parentId ?? null);
      setSelectedNodeIds(parentId ? [parentId] : []);
    },
    [tree.nodes, deleteNode, selectNode],
  );

  const handleSelectNodes = useCallback((nodeIds: string[]) => {
    setSelectedNodeIds(nodeIds);
  }, []);

  const handleRenameNode = useCallback(
    (nodeId: string, nextName: string) => {
      updateNodeName(nodeId, nextName);
    },
    [updateNodeName],
  );

  useEffect(() => {
    const id = selection.selectedNodeId;
    setSelectedNodeIds((prev) => {
      if (!id) return prev.length ? [] : prev;
      if (prev.includes(id)) return prev;
      return [id];
    });
  }, [selection.selectedNodeId]);

  useEffect(() => {
    const isEditable = (el: Element | null): boolean => {
      if (!el) return false;
      if (el instanceof HTMLElement && el.isContentEditable) return true;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };

    const getCopyIdsInOrder = (tree: typeof treeRef.current, selectedIds: string[]): string[] => {
      const selectedSet = new Set(selectedIds);
      selectedSet.delete(tree.rootId);
      if (!selectedSet.size) return [];

      const topLevelSet = new Set<string>();
      for (const id of selectedSet) {
        let parentId = tree.nodes[id]?.parentId ?? null;
        let blocked = false;
        while (parentId) {
          if (selectedSet.has(parentId)) {
            blocked = true;
            break;
          }
          parentId = tree.nodes[parentId]?.parentId ?? null;
        }
        if (!blocked) topLevelSet.add(id);
      }

      const ordered: string[] = [];
      const walk = (nodeId: string) => {
        if (topLevelSet.has(nodeId)) ordered.push(nodeId);
        const node = tree.nodes[nodeId];
        if (!node) return;
        for (const childId of node.children) walk(childId);
      };
      if (tree.nodes[tree.rootId]) walk(tree.rootId);
      return ordered;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.altKey) return;
      if (isEditable(document.activeElement)) return;

      const key = e.key.toLowerCase();
      if (key === 'c') {
        const tree = treeRef.current;
        const ids = getCopyIdsInOrder(tree, selectedNodeIdsRef.current);
        if (!ids.length) return;
        e.preventDefault();
        const descriptors = ids.map((id) => buildDescriptorFromTree(tree, id));
        copyBufferRef.current = descriptors;
        const text = JSON.stringify({ kind: 'yoga-canvas/nodes', descriptors });
        void navigator.clipboard?.writeText(text).catch(() => {});
        return;
      }

      if (key === 'v') {
        e.preventDefault();
        const run = async () => {
          let descriptors = copyBufferRef.current;
          if (!descriptors) {
            const text = await navigator.clipboard?.readText?.().catch(() => '');
            if (text) {
              try {
                const parsed = JSON.parse(text) as unknown;
                if (
                  typeof parsed === 'object' &&
                  parsed &&
                  'descriptors' in parsed &&
                  Array.isArray((parsed as { descriptors?: unknown }).descriptors)
                ) {
                  descriptors = (parsed as { descriptors: NodeDescriptor[] }).descriptors;
                }
              } catch {
                // ignore
              }
            }
          }
          if (!descriptors?.length) return;

          const tree = treeRef.current;
          const primaryId = selectedPrimaryIdRef.current;
          const primaryNode = primaryId ? tree.nodes[primaryId] ?? null : null;
          const parentId = primaryNode?.parentId ?? tree.rootId;
          const parent = tree.nodes[parentId] ?? null;
          if (!parent || parent.type === 'text') return;
          const insertIndex =
            primaryNode && primaryNode.parentId === parentId
              ? parent.children.indexOf(primaryNode.id) + 1
              : undefined;

          const childIds = insertNodeDescriptors(parentId, descriptors, insertIndex);
          if (!childIds.length) return;
          setSelectedNodeIds(childIds);
          selectNode(childIds[childIds.length - 1] ?? null);
        };
        void run();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [insertNodeDescriptors, selectNode]);

  const handleScaleChange = useCallback(
    (nextScale: number) => {
      const el = canvasContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setScaleAt(nextScale, rect.width / 2, rect.height / 2);
    },
    [setScaleAt],
  );

  const handleResetView = useCallback(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const root = tree.nodes[tree.rootId];
    const rootW = root?.computedLayout.width ?? 0;
    const rootH = root?.computedLayout.height ?? 0;
    const pad = 60;
    const scaleX = rootW > 0 ? (rect.width - pad * 2) / rootW : 1;
    const scaleY = rootH > 0 ? (rect.height - pad * 2) / rootH : 1;
    const fit = Math.min(scaleX, scaleY);
    const nextScale = Math.min(1, Math.max(fit, 0.1));
    const next = resetView(rect.width, rect.height, {
      scale: Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1,
      targetId: tree.rootId,
      animate: true,
      durationMs: 260,
    });
    initialViewRef.current = next;
  }, [resetView, tree.nodes, tree.rootId]);

  const canResetView = useMemo(() => {
    const initial = initialViewRef.current;
    if (!initial) return Math.abs(scale - 1) > 0.0005 || Math.abs(offset.x) > 0.5 || Math.abs(offset.y) > 0.5;
    return (
      Math.abs(scale - initial.scale) > 0.0005 ||
      Math.abs(offset.x - initial.offset.x) > 0.5 ||
      Math.abs(offset.y - initial.offset.y) > 0.5
    );
  }, [offset.x, offset.y, scale]);

  useEffect(() => {
    if (didInitViewRef.current) return;
    if (!ready) return;
    const root = tree.nodes[tree.rootId];
    const rootW = root?.computedLayout.width ?? 0;
    const rootH = root?.computedLayout.height ?? 0;
    if (rootW <= 0 || rootH <= 0) return;
    const el = canvasContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const pad = 60;
    const scaleX = (rect.width - pad * 2) / rootW;
    const scaleY = (rect.height - pad * 2) / rootH;
    const fit = Math.min(scaleX, scaleY);
    const nextScale = Math.min(1, Math.max(fit, 0.1));
    const next = resetView(rect.width, rect.height, {
      scale: Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1,
      targetId: tree.rootId,
    });
    initialViewRef.current = next;
    didInitViewRef.current = true;
    setViewInitialized(true);
  }, [ready, resetView, tree.nodes, tree.rootId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection.selectedNodeId && selection.selectedNodeId !== tree.rootId) {
          handleDeleteNode(selection.selectedNodeId);
        }
      }
      if (e.key === 'Escape') {
        selectNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selection.selectedNodeId, tree.rootId, handleDeleteNode, selectNode]);

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-sm font-semibold text-slate-800">{t('editor.projectMissing')}</div>
          <button
            type="button"
            className="mt-3 px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
            onClick={onExit}
          >
            {t('editor.backWorkspace')}
          </button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-gray-500">{t('editor.loading')}</p>
        </div>
      </div>
    );
  }

  if (showPreview) {
    return <PreviewModal tree={tree} onClose={() => setShowPreview(false)} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Toolbar
        title={project.name}
        leftContent={
          <button
            type="button"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            onClick={onExit}
            title={t('editor.backWorkspaceTitle')}
          >
            <ArrowLeft size={14} />
            {t('editor.back')}
          </button>
        }
        rightContent={
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" style={{ opacity: saving ? 1 : 0.25 }} />
            <span>{saving ? t('editor.saving') : t('editor.saved')}</span>
          </div>
        }
        canUndo={canUndo}
        canRedo={canRedo}
        scale={scale}
        initialScale={1}
        onScaleChange={handleScaleChange}
        canResetView={canResetView}
        onResetView={handleResetView}
        onUndo={undo}
        onRedo={redo}
        onPreview={() => setShowPreview(true)}
        onCodeEditor={() => setShowCodeEditor((v) => !v)}
      />
      <ResizablePanels
        left={
          <LeftPanel
            tree={tree}
            selectedNodeId={selection.selectedNodeId}
            selectedNodeIds={selectedNodeIds}
            onAddNode={addNodeByType}
            onUpdateContainer={updateCanvasContainer}
            onSelectNode={selectNode}
            onSelectNodes={handleSelectNodes}
            onRenameNode={handleRenameNode}
            onDeleteNode={handleDeleteNode}
            onMoveNode={moveNode}
          />
        }
        center={
          <div ref={canvasContainerRef} className="flex-1 overflow-hidden">
            <div style={{ opacity: viewInitialized ? 1 : 0, transition: 'opacity 120ms' }} className="w-full h-full">
              <EditorCanvas
                tree={tree}
                selection={selection}
                scale={scale}
                offset={offset}
                scrollManager={scrollManager}
                renderTick={scrollTick}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleCanvasWheel}
                onDoubleClick={handleCanvasDoubleClick}
                onFocusNode={handleFocusNode}
                onSelectNode={(nodeId) => {
                  selectNode(nodeId);
                  setSelectedNodeIds(nodeId ? [nodeId] : []);
                }}
                renderTopOverlay={(onFocus) => (
                  <button
                    onClick={onFocus}
                    className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5
                      bg-white/90 backdrop-blur border border-gray-200 rounded-lg shadow-sm
                      text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300
                      transition-colors"
                    title={t('nav.locateTitle')}
                  >
                    <Crosshair size={14} />
                    <span>{t('nav.locate')}</span>
                  </button>
                )}
              />
            </div>
          </div>
        }
        rightPanels={[
          <PropertiesPanel
            node={selectedNode}
            onUpdateFlexStyle={updateNodeFlexStyle}
            onUpdateVisualStyle={updateNodeVisualStyle}
            onUpdateTextProps={updateTextProps}
            onUpdateImageProps={updateImageProps}
          />,
          ...(showCodeEditor
            ? [
                <LiveCodeEditorPanel
                  tree={tree}
                  embedded
                  onClose={() => setShowCodeEditor(false)}
                  onDescriptorChange={(descriptor) => {
                    replaceDescriptor(descriptor);
                    selectNode(null);
                  }}
                />,
              ]
            : []),
        ]}
        defaultLeftWidth={240}
        defaultRightWidths={[320, 560]}
        minWidth={200}
      />
    </div>
  );
}
