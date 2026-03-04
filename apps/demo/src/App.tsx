import { useCallback, useMemo, useRef } from 'react';
import {
  EditorCanvas,
  NodeTreePanel,
  ResizablePanels,
  useCanvasInteraction,
  type CanvasNode,
  type NodeDescriptor,
} from '@yoga-canvas/react';
import {
  Box,
  ChevronDown,
  ChevronRight,
  Crosshair,
  ImageIcon,
  ScrollText,
  Trash2,
  Type,
} from 'lucide-react';
import PropertiesPanel from '../../editor/src/components/PropertiesPanel';
import { useNodeTree } from '../../editor/src/hooks/useNodeTree';
import { LiveEditor } from './LiveEditor';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const {
    tree,
    ready,
    scrollManager,
    replaceDescriptor,
    resizeNode,
    rotateNodeLive,
    moveAbsoluteNodeLive,
    moveNode,
    deleteNode,
    commitLiveUpdate,
    updateNodeFlexStyle,
    updateNodeVisualStyle,
    updateTextProps,
    updateImageProps,
  } = useNodeTree();

  const {
    selection,
    scale,
    offset,
    scrollTick,
    selectNode,
    focusNode,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleDoubleClick,
  } = useCanvasInteraction(tree, resizeNode, rotateNodeLive, moveNode, commitLiveUpdate, scrollManager, moveAbsoluteNodeLive);

  const handleDescriptorChange = useCallback((descriptor: NodeDescriptor) => {
    replaceDescriptor(descriptor);
    selectNode(null);
  }, [replaceDescriptor, selectNode]);

  const handleDeleteFromTree = useCallback((nodeId: string) => {
    const parentId = tree.nodes[nodeId]?.parentId;
    deleteNode(nodeId);
    selectNode(parentId ?? null);
  }, [tree.nodes, deleteNode, selectNode]);

  const handleSelectFromTree = useCallback((nodeId: string | null) => {
    selectNode(nodeId);
    if (!nodeId) return;
    const el = canvasContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    focusNode(nodeId, rect.width, rect.height, { animate: true, durationMs: 280 });
  }, [selectNode, focusNode]);

  const handleFocusNode = useCallback(() => {
    if (!selection.selectedNodeId) return;
    const el = canvasContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    focusNode(selection.selectedNodeId, rect.width, rect.height, { animate: true, durationMs: 320 });
  }, [selection.selectedNodeId, focusNode]);

  const selectedNode = useMemo(
    () => (selection.selectedNodeId ? tree.nodes[selection.selectedNodeId] ?? null : null),
    [selection.selectedNodeId, tree.nodes],
  );

  const leftPanel = (
    <LiveEditor defaultCode={DEFAULT_EDITOR_CODE} onDescriptorChange={handleDescriptorChange} />
  );

  const centerPanel = (
    <div ref={canvasContainerRef} className="flex-1 overflow-hidden bg-gray-100">
      <div className="w-full h-full">
        <EditorCanvas
          tree={tree}
          selection={selection}
          scale={scale}
          offset={offset}
          scrollManager={scrollManager}
          renderTick={scrollTick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          onFocusNode={handleFocusNode}
          renderFocusAction={(onFocus) => (
            <button
              onClick={onFocus}
              className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-white/90 backdrop-blur border border-gray-200 rounded-lg shadow-sm text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
              title="Focus selected node"
            >
              <Crosshair size={14} />
              <span>Locate</span>
            </button>
          )}
        />
      </div>
    </div>
  );

  const rightPanel = (
    <div className="bg-white flex flex-col h-full">
      <div
        className="border-b h-full border-gray-200 overflow-hidden shrink-0 bg-white"
        style={{ flexBasis: '44%', minHeight: 260, maxHeight: '58%' }}
      >
        {ready && (
          <NodeTreePanel
            tree={tree}
            selectedNodeId={selection.selectedNodeId}
            onSelectNode={handleSelectFromTree}
            canDelete
            onDeleteNode={handleDeleteFromTree}
            onMoveNode={moveNode}
            icons={{
              reveal: <Crosshair size={14} />,
              delete: <Trash2 size={10} />,
              expand: <ChevronRight size={10} />,
              collapse: <ChevronDown size={10} />,
              renderNodeType: (node: CanvasNode) => {
                switch (node.type) {
                  case 'view':
                    return <Box size={11} className="shrink-0" />;
                  case 'text':
                    return <Type size={11} className="shrink-0" />;
                  case 'image':
                    return <ImageIcon size={11} className="shrink-0" />;
                  case 'scrollview':
                    return <ScrollText size={11} className="shrink-0" />;
                  default:
                    return null;
                }
              },
            }}
            className="h-full"
          />
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <PropertiesPanel
          node={selectedNode}
          onUpdateFlexStyle={updateNodeFlexStyle}
          onUpdateVisualStyle={updateNodeVisualStyle}
          onUpdateTextProps={updateTextProps}
          onUpdateImageProps={updateImageProps}
        />
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <h1 className="text-lg font-bold text-indigo-600">Yoga Canvas</h1>
        <span className="text-xs text-gray-400">Low-Code Canvas + React Live Editor</span>
        <div className="flex-1" />
      </div>
      <ResizablePanels
        left={leftPanel}
        center={centerPanel}
        rightPanels={[rightPanel]}
        defaultLeftWidth={420}
        defaultRightWidths={[280]}
        minWidth={200}
      />
    </div>
  );
}

const DEFAULT_EDITOR_CODE = `const StatCard = ({ name, value, label, valueColor, shadow, withBadge = false }) => (
  <View name={name} style={{ flex: 1, flexDirection: 'column', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 4, borderWidth: 1, borderColor: '#e2e8f0', boxShadow: shadow }}>
    <Text style={{ fontSize: 20, fontWeight: 'bold', color: valueColor }}>{value}</Text>
    <Text style={{ fontSize: 11, color: '#94a3b8' }}>{label}</Text>
    {withBadge ? (
      <View name="BadgeBack" style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#fde047', borderRadius: 9, padding: 2, paddingLeft: 7, paddingRight: 7, zIndex: 0 }}>
        <Text style={{ fontSize: 9, width: 22, height: 12, flexDirection: 'row', fontWeight: 700, color: '#78350f' }}>HOT</Text>
      </View>
    ) : null}
    {withBadge ? (
      <View name="Badge" style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', borderRadius: 8, padding: 2, paddingLeft: 6, paddingRight: 6, zIndex: 2 }}>
        <Text style={{ fontSize: 9, width: 22, height: 12, flexDirection: 'row', fontWeight: 700, color: '#ffffff' }}>NEW</Text>
      </View>
    ) : null}
  </View>
);

const StatsCards = () => (
  <View name="StatsRow" style={{ flexDirection: 'row', gap: 8, position: 'relative' }}>
    <StatCard
      name="CardA"
      value="128"
      label="Nodes"
      valueColor="#8b5cf6"
      shadow={{ color: 'rgba(15, 23, 42, 0.18)', blur: 18, offsetX: 0, offsetY: 8, spread: 0 }}
      withBadge
    />
    <StatCard
      name="CardB"
      value="16ms"
      label="Render"
      valueColor="#06b6d4"
      shadow={{ color: 'rgba(15, 23, 42, 0.14)', blur: 16, offsetX: 0, offsetY: 7, spread: 0 }}
    />
    <View name="CardC" style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 4, borderWidth: 1, borderColor: '#e2e8f0', boxShadow: { color: 'rgba(15, 23, 42, 0.12)', blur: 14, offsetX: 0, offsetY: 6, spread: 0 } }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#10b981' }}>60</Text>
      <Text style={{ fontSize: 11, flex: 1, color: '#94a3b8' }}>FPS</Text>
    </View>
  </View>
);

const FEATURES = [
  { name: 'View', desc: 'Flex container with all CSS props', color: '#6366f1' },
  { name: 'Text', desc: 'Auto word-wrapping text node', color: '#f59e0b' },
  { name: 'Image', desc: 'Cover / Contain / Fill modes', color: '#ec4899' },
  { name: 'ScrollView', desc: 'Real scrolling with wheel events!', color: '#14b8a6' },
  { name: 'Export', desc: 'JSON / DataURL / DOM string', color: '#8b5cf6' },
  { name: 'Hit Test', desc: 'Click to select nodes', color: '#ef4444' },
  { name: 'JSX API', desc: 'Write layouts as React components', color: '#22c55e' },
];

const FeatureRow = ({ name, desc, color }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: color + '0a', borderRadius: 8, padding: 10 }}>
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    <View style={{ flex: 1, flexDirection: 'column', gap: 2 }}>
      <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#334155' }}>{name}</Text>
      <Text style={{ fontSize: 11, color: '#94a3b8' }}>{desc}</Text>
    </View>
  </View>
);

return (<View name="Root" style={{
  width: 375, height: 667, minHeight: 400,
  flexDirection: 'column',
  backgroundColor: '#fff',
  padding: 16, gap: 12,
}}>
  <View name="Header" style={{
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#6366f1',
    linearGradient: {
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      colors: [
        { offset: 0, color: '#6366f1' },
        { offset: 1, color: '#8b5cf6' },
      ],
    },
    borderRadius: 12,
    padding: 16, gap: 12,
    boxShadow: { color: 'rgba(15, 23, 42, 0.25)', blur: 24, offsetX: 0, offsetY: 10, spread: 0 },
  }}>
    <Image
      name="Avatar"
      src="https://api.dicebear.com/7.x/avataaars/svg?seed=yoga"
      objectFit="cover"
      style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#eef2ff' }}
    />
    <View name="UserInfo" style={{ flex: 1, flexDirection: 'column', gap: 4 }}>
      <Text name="Username" style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', textShadow: { color: 'rgba(15, 23, 42, 0.35)', blur: 6, offsetX: 0, offsetY: 2 } }}>
        Yoga Canvas
      </Text>
      <Text name="Bio" style={{ fontSize: 12, color: '#c7d2fe' }}>
        A powerful canvas layout engine
      </Text>
    </View>
  </View>

  <StatsCards />

  <View name="ContentCard" style={{
    flexDirection: 'column', backgroundColor: '#ffffff',
    borderRadius: 12, padding: 16, gap: 8,
    borderWidth: 1, borderColor: '#e2e8f0',
    boxShadow: { color: 'rgba(15, 23, 42, 0.18)', blur: 20, offsetX: 0, offsetY: 10, spread: 0 },
  }}>
    <Text style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', textShadow: { color: 'rgba(15, 23, 42, 0.15)', blur: 4, offsetX: 0, offsetY: 1 } }}>
      Flexbox Layout Engine
    </Text>
    <Text style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, fontStyle: 'italic' }}>
      Build complex canvas layouts with familiar CSS flexbox. Powered by yoga-layout.
    </Text>
    <View name="MediaRow" style={{ flexDirection: 'row', gap: 10, backgroundColor: '#f8fafc', borderRadius: 10, padding: 8 }}>
      <View name="CoverCard" style={{ flex: 1, gap: 6 }}>
        <Image
          name="CoverImage"
          src="https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=400&auto=format&fit=crop"
          objectFit="cover"
          style={{ width: '100%', height: 64, borderRadius: 8, backgroundColor: '#e2e8f0' }}
        />
        <Text style={{ fontSize: 11, color: '#64748b', textAlign: 'center' }}>Image fit: cover</Text>
      </View>
      <View name="ContainCard" style={{ flex: 1, gap: 6 }}>
        <Image
          name="ContainImage"
          src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=400&auto=format&fit=crop"
          objectFit="contain"
          style={{ width: '100%', height: 64, borderRadius: 8, backgroundColor: '#e2e8f0' }}
        />
        <Text style={{ fontSize: 11, color: '#64748b', textAlign: 'center' }}>Image fit: contain</Text>
      </View>
    </View>
  </View>

  <ScrollView name="FeatureList" scrollDirection="vertical" style={{
    flex: 1, flexDirection: 'column', backgroundColor: '#ffffff',
    borderRadius: 12, padding: 12, gap: 8,
    borderWidth: 1, borderColor: '#e2e8f0',
  }}>
    {FEATURES.map((item) => (
      <FeatureRow
        key={item.name}
        name={item.name}
        desc={item.desc}
        color={item.color}
      />
    ))}
  </ScrollView>
</View>);`;
