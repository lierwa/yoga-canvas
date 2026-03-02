import { useState, useRef, useCallback } from 'react';
import {
  YogaCanvas,
  hitTest,
  NodeTreePanel,
  SelectionOverlay,
  ResizablePanels,
  type YogaCanvasRef,
  type YogaCanvasCore as YogaCanvasCoreType,
  type CanvasNode,
  type NodeTree,
  type NodeDescriptor,
} from '@yoga-canvas/react';
import { computeScrollContentSizes, type ScrollManager } from '@yoga-canvas/core';
import {
  Download,
  Box,
  ChevronDown,
  ChevronRight,
  Code2,
  Crosshair,
  FileJson,
  Eye,
  ImageIcon,
  Palette,
  ScrollText,
  Trash2,
  Type,
  Square,
  Move,
  Copy,
} from 'lucide-react';
import { LiveEditor } from './LiveEditor';

// ============ Main App — Live Editor Mode ============

export default function App() {
  const canvasRef = useRef<YogaCanvasRef>(null);
  const instanceRef = useRef<YogaCanvasCoreType | null>(null);

  const [layout, setLayout] = useState<NodeDescriptor | null>(null);
  const [nodeTree, setNodeTree] = useState<NodeTree | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [showJSON, setShowJSON] = useState(false);
  const [showDOM, setShowDOM] = useState(false);
  const [jsonContent, setJsonContent] = useState('');
  const [domContent, setDomContent] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleReady = useCallback((instance: YogaCanvasCoreType) => {
    instanceRef.current = instance;
    setNodeTree(instance.getNodeTree());
  }, []);

  const handleRender = useCallback(() => {
    const inst = instanceRef.current;
    if (inst) setNodeTree(inst.getNodeTree());
  }, []);

  const handleDescriptorChange = useCallback((descriptor: NodeDescriptor) => {
    setLayout(descriptor);
    setSelectedNodeId(null);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const inst = instanceRef.current;
    if (!inst) return;
    const canvas = (e.currentTarget as HTMLDivElement).querySelector('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const tree = inst.getNodeTree();
    const hit = hitTest(tree, x, y, { scrollManager: inst.getScrollManager() });
    setSelectedNodeId(hit);
    setNodeTree(inst.getNodeTree());
  }, []);

  const locateNode = useCallback((nodeId: string | null) => {
    if (!nodeId) return;
    const inst = instanceRef.current;
    if (!inst) return;
    const tree = inst.getNodeTree();
    const scrollManager = inst.getScrollManager();
    if (!tree.nodes[nodeId]) return;
    revealNodeInScrollViews(tree, nodeId, scrollManager);
    computeScrollContentSizes(inst.getNodeTree(), scrollManager);
    inst.render();
    setNodeTree(inst.getNodeTree());
  }, []);

  const handleSelectFromTree = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    locateNode(nodeId);
  }, [locateNode]);

  const handleDeleteFromTree = useCallback((nodeId: string) => {
    const inst = instanceRef.current;
    if (!inst) return;
    inst.deleteNode(nodeId);
    computeScrollContentSizes(inst.getNodeTree(), inst.getScrollManager());
    inst.render();
    const nextTree = inst.getNodeTree();
    setNodeTree(nextTree);
    setSelectedNodeId((prev) => (prev && nextTree.nodes[prev] ? prev : null));
  }, []);

  const handleMoveFromTree = useCallback((nodeId: string, newParentId: string, insertIndex?: number) => {
    const inst = instanceRef.current;
    if (!inst) return;
    inst.moveNode(nodeId, newParentId, insertIndex);
    computeScrollContentSizes(inst.getNodeTree(), inst.getScrollManager());
    inst.render();
    setNodeTree(inst.getNodeTree());
  }, []);

  const selectedNode = selectedNodeId && nodeTree ? nodeTree.nodes[selectedNodeId] ?? null : null;

  const handleExportJSON = useCallback(() => {
    const ref = canvasRef.current;
    if (!ref) return;
    setJsonContent(ref.toJSON());
    setShowJSON(true);
  }, []);

  const handleExportDOM = useCallback(() => {
    const ref = canvasRef.current;
    if (!ref) return;
    setDomContent(ref.toDOMString());
    setShowDOM(true);
  }, []);

  const handleExportImage = useCallback(async () => {
    const ref = canvasRef.current;
    if (!ref) return;
    const url = await ref.toDataURL();
    setPreviewImage(url);
  }, []);

  // --- Panel contents ---

  const leftPanel = (
    <LiveEditor defaultCode={DEFAULT_EDITOR_CODE} onDescriptorChange={handleDescriptorChange} />
  );

  const centerPanel = (
    <div className="flex-1 flex items-center justify-center p-6 bg-gray-100">
      <div
        className="relative rounded-xl shadow-2xl overflow-hidden border border-gray-300"
        style={{ width: 375 }}
        onClick={handleCanvasClick}
      >
        {layout && (
          <YogaCanvas
            ref={canvasRef}
            layout={layout}
            width={375}
            onReady={handleReady}
            onRender={handleRender}
          />
        )}
        {nodeTree && selectedNodeId && (
          <SelectionOverlay
            tree={nodeTree}
            nodeId={selectedNodeId}
            scrollManager={instanceRef.current?.getScrollManager() ?? null}
            eventSource={instanceRef.current}
          />
        )}
      </div>
    </div>
  );

  const rightPanel = (
    <div className="bg-white flex flex-col h-full">
      <div className="border-b border-gray-200" style={{ maxHeight: '40%' }}>
        {nodeTree && (
          <NodeTreePanel
            tree={nodeTree}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectFromTree}
            canDelete
            onDeleteNode={handleDeleteFromTree}
            onMoveNode={handleMoveFromTree}
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
            className="text-xs"
          />
        )}
      </div>
      <div className="p-3 border-b border-gray-200">
        <h2 className="text-sm font-bold text-gray-700">Properties</h2>
      </div>
      <div className="flex-1 overflow-auto">
        {selectedNode ? (
          <PropertiesPanel node={selectedNode} />
        ) : (
          <div className="p-4 text-xs text-gray-400 text-center mt-4">
            Click a node on the canvas<br />to inspect its properties
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <h1 className="text-lg font-bold text-indigo-600">Yoga Canvas</h1>
        <span className="text-xs text-gray-400">Live JSX Editor + Real ScrollView</span>
        <div className="flex-1" />
        <button className="text-xs text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer" onClick={handleExportJSON}>
          <FileJson size={14} /> JSON
        </button>
        <button className="text-xs text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer" onClick={handleExportDOM}>
          <Code2 size={14} /> DOM
        </button>
        <button className="text-xs text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer" onClick={handleExportImage}>
          <Download size={14} /> Image
        </button>
      </div>

      {/* Resizable three-panel layout */}
      <ResizablePanels
        left={leftPanel}
        center={centerPanel}
        rightPanels={[rightPanel]}
        defaultLeftWidth={420}
        defaultRightWidths={[280]}
        minWidth={200}
      />

      {/* Modals */}
      {showJSON && <ExportModal title="Export JSON" content={jsonContent} onClose={() => setShowJSON(false)} />}
      {showDOM && <ExportModal title="Export DOM (HTML)" content={domContent} onClose={() => setShowDOM(false)} />}
      {previewImage && <ImagePreviewModal url={previewImage} onClose={() => setPreviewImage(null)} />}
    </div>
  );
}

// ============ UI Sub Components ============

function revealNodeInScrollViews(tree: NodeTree, nodeId: string, scrollManager: ScrollManager): void {
  const pairs: Array<{ scrollViewId: string; childId: string }> = [];
  let currentId: string | null = nodeId;
  while (currentId) {
    const current: CanvasNode | undefined = tree.nodes[currentId];
    if (!current?.parentId) break;
    const parent: CanvasNode | undefined = tree.nodes[current.parentId];
    if (parent?.type === 'scrollview') {
      pairs.push({ scrollViewId: parent.id, childId: currentId });
    }
    currentId = parent?.id ?? null;
  }

  pairs.reverse();

  for (const { scrollViewId, childId } of pairs) {
    const scrollViewNode = tree.nodes[scrollViewId];
    const childNode = tree.nodes[childId];
    if (!scrollViewNode || !childNode) continue;

    const state = scrollManager.getState(scrollViewId);
    const isVertical = scrollViewNode.scrollViewProps?.scrollDirection !== 'horizontal';
    const padding = 12;

    let nextX = state.offsetX;
    let nextY = state.offsetY;

    if (isVertical) {
      const relTop = childNode.computedLayout.top - scrollViewNode.computedLayout.top;
      const relBottom = relTop + childNode.computedLayout.height;
      if (relTop < state.offsetY + padding) nextY = relTop - padding;
      else if (relBottom > state.offsetY + state.viewportHeight - padding) {
        nextY = relBottom + padding - state.viewportHeight;
      }
    } else {
      const relLeft = childNode.computedLayout.left - scrollViewNode.computedLayout.left;
      const relRight = relLeft + childNode.computedLayout.width;
      if (relLeft < state.offsetX + padding) nextX = relLeft - padding;
      else if (relRight > state.offsetX + state.viewportWidth - padding) {
        nextX = relRight + padding - state.viewportWidth;
      }
    }

    if (nextX !== state.offsetX || nextY !== state.offsetY) {
      scrollManager.setOffset(scrollViewId, nextX, nextY);
      scrollManager.showScrollBar(scrollViewId);
    }
  }
}

function PropertiesPanel({ node }: { node: CanvasNode }) {
  const { computedLayout, flexStyle, visualStyle, textProps } = node;
  return (
    <div className="p-3 space-y-4 text-xs">
      <Section title="Info" icon={<Eye size={12} />}>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <InfoRow label="Type" value={node.type} />
          <InfoRow label="Name" value={node.name} />
          <InfoRow label="ID" value={node.id} />
        </div>
      </Section>
      <Section title="Layout" icon={<Move size={12} />}>
        <div className="grid grid-cols-4 gap-1">
          <LayoutCell label="X" value={Math.round(computedLayout.left)} />
          <LayoutCell label="Y" value={Math.round(computedLayout.top)} />
          <LayoutCell label="W" value={Math.round(computedLayout.width)} />
          <LayoutCell label="H" value={Math.round(computedLayout.height)} />
        </div>
      </Section>
      <Section title="Flex" icon={<Square size={12} />}>
        <div className="space-y-1">
          <ReadonlyProp label="Width" value={flexStyle.width} />
          <ReadonlyProp label="Height" value={flexStyle.height} />
          <ReadonlyProp label="Flex" value={flexStyle.flex} />
          <ReadonlyProp label="Direction" value={flexStyle.flexDirection} />
          <ReadonlyProp label="Gap" value={flexStyle.gap} />
          <ReadonlyProp label="Padding" value={flexStyle.paddingTop} />
        </div>
      </Section>
      <Section title="Visual" icon={<Palette size={12} />}>
        <div className="space-y-1">
          <ReadonlyProp label="Background" value={visualStyle.backgroundColor} />
          <ReadonlyProp label="Border" value={visualStyle.borderWidth ? `${visualStyle.borderWidth}px ${visualStyle.borderColor}` : 'none'} />
          <ReadonlyProp label="Radius" value={visualStyle.borderRadius} />
          <ReadonlyProp label="Opacity" value={visualStyle.opacity} />
        </div>
      </Section>
      {textProps && (
        <Section title="Text" icon={<Type size={12} />}>
          <div className="space-y-1">
            <ReadonlyProp label="Content" value={textProps.content} />
            <ReadonlyProp label="Size" value={textProps.fontSize} />
            <ReadonlyProp label="Color" value={textProps.color} />
            <ReadonlyProp label="Weight" value={textProps.fontWeight} />
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-gray-500 font-semibold mb-2">{icon}<span>{title}</span></div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (<><span className="text-gray-400">{label}</span><span className="text-gray-700 font-mono truncate">{value}</span></>);
}

function LayoutCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded px-2 py-1 text-center">
      <div className="text-[10px] text-gray-400">{label}</div>
      <div className="font-mono text-gray-700 font-medium">{value}</div>
    </div>
  );
}

function ReadonlyProp({ label, value }: { label: string; value: unknown }) {
  const display = value === undefined ? '-' : String(value);
  return (
    <div className="flex items-center">
      <span className="w-20 text-[10px] text-gray-400 shrink-0">{label}</span>
      <span className="flex-1 text-[11px] font-mono text-gray-700 truncate">{display}</span>
    </div>
  );
}

function ExportModal({ title, content, onClose }: { title: string; content: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-150 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-800">{title}</h3>
          <div className="flex gap-2">
            <button className="text-xs bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600 cursor-pointer flex items-center gap-1" onClick={() => navigator.clipboard.writeText(content)}>
              <Copy size={12} /> Copy
            </button>
            <button className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer" onClick={onClose}>Close</button>
          </div>
        </div>
        <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-gray-700 bg-gray-50">{content}</pre>
      </div>
    </div>
  );
}

function ImagePreviewModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-4 flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800">Exported Image</h3>
        <img src={url} alt="Export" className="rounded-lg border border-gray-200 shadow-sm" style={{ maxWidth: 400 }} />
        <div className="flex gap-2">
          <a href={url} download="yoga-canvas.png" className="text-xs bg-indigo-500 text-white px-4 py-1.5 rounded hover:bg-indigo-600 flex items-center gap-1">
            <Download size={12} /> Download
          </a>
          <button className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer px-3 py-1.5" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ============ Default Editor Code ============

const DEFAULT_EDITOR_CODE = `<View name="Root" style={{
  width: 375, height: 'auto', minHeight: 400,
  flexDirection: 'column',
  backgroundColor: '#f8fafc',
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

  <View name="StatsRow" style={{ flexDirection: 'row', gap: 8, position: 'relative' }}>
    <View style={{ flex: 1, flexDirection: 'column', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 4, borderWidth: 1, borderColor: '#e2e8f0', boxShadow: { color: 'rgba(15, 23, 42, 0.18)', blur: 18, offsetX: 0, offsetY: 8, spread: 0 } }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#8b5cf6' }}>128</Text>
      <Text style={{ fontSize: 11, color: '#94a3b8' }}>Nodes</Text>
      <View name="BadgeBack" style={{
        position: 'absolute', top: -6, right: -6,
        backgroundColor: '#fde047', borderRadius: 9,
        padding: 2, paddingLeft: 7, paddingRight: 7,
        zIndex: 0,
      }}>
        <Text style={{ fontSize: 9, width: 22, height: 12, flexDirection: 'row', fontWeight: 700, color: '#78350f' }}>HOT</Text>
      </View>
      <View name="Badge" style={{
        position: 'absolute', top: -4, right: -4,
        backgroundColor: '#ef4444', borderRadius: 8,
        padding: 2, paddingLeft: 6, paddingRight: 6,
        zIndex: 2,
      }}>
        <Text style={{ fontSize: 9, width: 22, height: 12, flexDirection: 'row', fontWeight: 700, color: '#ffffff' }}>NEW</Text>
      </View>
    </View>
    <View style={{ flex: 1, flexDirection: 'column', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 4, borderWidth: 1, borderColor: '#e2e8f0', boxShadow: { color: 'rgba(15, 23, 42, 0.14)', blur: 16, offsetX: 0, offsetY: 7, spread: 0 } }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#06b6d4' }}>16ms</Text>
      <Text style={{ fontSize: 11, color: '#94a3b8' }}>Render</Text>
    </View>
    <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 4, borderWidth: 1, borderColor: '#e2e8f0', boxShadow: { color: 'rgba(15, 23, 42, 0.12)', blur: 14, offsetX: 0, offsetY: 6, spread: 0 } }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#10b981' }}>60</Text>
      <Text style={{ fontSize: 11,flex: 1, color: '#94a3b8' }}>FPS</Text>
    </View>
  </View>

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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#6366f10a', borderRadius: 8, padding: 10 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1' }} />
      <View style={{ flex: 1, flexDirection: 'column', gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#334155' }}>View</Text>
        <Text style={{ fontSize: 11, color: '#94a3b8' }}>Flex container with all CSS props</Text>
      </View>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f59e0b0a', borderRadius: 8, padding: 10 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' }} />
      <View style={{ flex: 1, flexDirection: 'column', gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#334155' }}>Text</Text>
        <Text style={{ fontSize: 11, color: '#94a3b8' }}>Auto word-wrapping text node</Text>
      </View>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ec48990a', borderRadius: 8, padding: 10 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ec4899' }} />
      <View style={{ flex: 1, flexDirection: 'column', gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#334155' }}>Image</Text>
        <Text style={{ fontSize: 11, color: '#94a3b8' }}>Cover / Contain / Fill modes</Text>
      </View>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#14b8a60a', borderRadius: 8, padding: 10 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#14b8a6' }} />
      <View style={{ flex: 1, flexDirection: 'column', gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#334155' }}>ScrollView</Text>
        <Text style={{ fontSize: 11, color: '#94a3b8' }}>Real scrolling with wheel events!</Text>
      </View>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#8b5cf60a', borderRadius: 8, padding: 10 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#8b5cf6' }} />
      <View style={{ flex: 1, flexDirection: 'column', gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#334155' }}>Export</Text>
        <Text style={{ fontSize: 11, color: '#94a3b8' }}>JSON / DataURL / DOM string</Text>
      </View>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ef44440a', borderRadius: 8, padding: 10 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
      <View style={{ flex: 1, flexDirection: 'column', gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#334155' }}>Hit Test</Text>
        <Text style={{ fontSize: 11, color: '#94a3b8' }}>Click to select nodes</Text>
      </View>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#22c55e0a', borderRadius: 8, padding: 10 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' }} />
      <View style={{ flex: 1, flexDirection: 'column', gap: 2 }}>
        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#334155' }}>JSX API</Text>
        <Text style={{ fontSize: 11, color: '#94a3b8' }}>Write layouts as React components</Text>
      </View>
    </View>
  </ScrollView>
</View>`;
