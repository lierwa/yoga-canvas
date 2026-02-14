import { useState, useRef, useCallback } from 'react';
import {
  YagaCanvas,
  hitTest,
  type YagaCanvasRef,
  type YagaCanvasCore as YagaCanvasCoreType,
  type CanvasNode,
  type NodeTree,
  type NodeDescriptor,
} from '@yaga-canvas/react';
import {
  Download,
  Code2,
  FileJson,
  Eye,
  Palette,
  Type,
  Square,
  Move,
  Copy,
} from 'lucide-react';
import { ResizablePanels } from './ResizablePanels';
import { LiveEditor } from './LiveEditor';

// ============ Main App — Live Editor Mode ============

export default function App() {
  const canvasRef = useRef<YagaCanvasRef>(null);
  const instanceRef = useRef<YagaCanvasCoreType | null>(null);

  const [layout, setLayout] = useState<NodeDescriptor | null>(null);
  const [nodeTree, setNodeTree] = useState<NodeTree | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [showJSON, setShowJSON] = useState(false);
  const [showDOM, setShowDOM] = useState(false);
  const [jsonContent, setJsonContent] = useState('');
  const [domContent, setDomContent] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleReady = useCallback((instance: YagaCanvasCoreType) => {
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
        style={{ width: 375, height: 667 }}
        onClick={handleCanvasClick}
      >
        {layout && (
          <YagaCanvas
            ref={canvasRef}
            layout={layout}
            width={375}
            height={667}
            onReady={handleReady}
            onRender={handleRender}
          />
        )}
        {selectedNode && <SelectionOverlay node={selectedNode} />}
      </div>
    </div>
  );

  const rightPanel = (
    <div className="bg-white flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <h2 className="text-sm font-bold text-gray-700">Node Tree</h2>
      </div>
      <div className="flex-1 overflow-auto p-2 text-xs border-b border-gray-200" style={{ maxHeight: '40%' }}>
        {nodeTree && (
          <NodeTreeView tree={nodeTree} nodeId={nodeTree.rootId} selectedId={selectedNodeId} onSelect={setSelectedNodeId} depth={0} />
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
        <h1 className="text-lg font-bold text-indigo-600">Yaga Canvas</h1>
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
        right={rightPanel}
        defaultLeftWidth={420}
        defaultRightWidth={280}
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

function NodeTreeView({ tree, nodeId, selectedId, onSelect, depth }: {
  tree: NodeTree; nodeId: string; selectedId: string | null; onSelect: (id: string) => void; depth: number;
}) {
  const node = tree.nodes[nodeId];
  if (!node) return null;
  const isSelected = nodeId === selectedId;
  const typeColor: Record<string, string> = { view: 'text-blue-500', text: 'text-amber-500', image: 'text-pink-500', scrollview: 'text-teal-500' };
  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-600'}`}
        style={{ paddingLeft: depth * 12 + 8 }}
        onClick={() => onSelect(nodeId)}
      >
        <span className={`text-[10px] font-mono font-bold ${typeColor[node.type] || 'text-gray-400'}`}>
          {node.type.toUpperCase().charAt(0)}
        </span>
        <span className="truncate text-[11px]">{node.name}</span>
      </div>
      {node.children.map((childId: string) => (
        <NodeTreeView key={childId} tree={tree} nodeId={childId} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

function SelectionOverlay({ node }: { node: CanvasNode }) {
  const { left, top, width, height } = node.computedLayout;
  return (
    <div className="absolute pointer-events-none border-2 border-indigo-500 rounded-sm"
      style={{ left, top, width, height, boxShadow: '0 0 0 1px rgba(99, 102, 241, 0.2)' }}>
      <div className="absolute -top-5 left-0 bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded-sm whitespace-nowrap font-medium">
        {node.name} ({Math.round(width)}x{Math.round(height)})
      </div>
    </div>
  );
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
          <a href={url} download="yaga-canvas.png" className="text-xs bg-indigo-500 text-white px-4 py-1.5 rounded hover:bg-indigo-600 flex items-center gap-1">
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
  width: 375, height: 667,
  flexDirection: 'column',
  backgroundColor: '#f8fafc',
  padding: 16, gap: 12,
}}>
  {/* Header */}
  <View name="Header" style={{
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#6366f1', borderRadius: 12,
    padding: 16, gap: 12,
  }}>
    <Image
      name="Avatar"
      src="https://api.dicebear.com/7.x/avataaars/svg?seed=yaga"
      style={{ width: 48, height: 48, borderRadius: 24 }}
    />
    <View name="UserInfo" style={{ flex: 1, flexDirection: 'column', gap: 4 }}>
      <Text name="Username" style={{ fontSize: 18, fontWeight: 'bold', color: '#ffffff' }}>
        Yaga Canvas
      </Text>
      <Text name="Bio" style={{ fontSize: 12, color: '#c7d2fe' }}>
        A powerful canvas layout engine
      </Text>
    </View>
  </View>

  {/* Stats Row */}
  <View name="StatsRow" style={{ flexDirection: 'row', gap: 8 }}>
    <View style={{ flex: 1, flexDirection: 'column', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 4, borderWidth: 1, borderColor: '#e2e8f0' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#8b5cf6' }}>128</Text>
      <Text style={{ fontSize: 11, color: '#94a3b8' }}>Nodes</Text>
      {/* Absolute positioned badge */}
      <View name="Badge" style={{
        positionType: 'absolute', positionTop: -4, positionRight: -4,
        backgroundColor: '#ef4444', borderRadius: 8,
        padding: 2, paddingLeft: 6, paddingRight: 6,
      }}>
        <Text style={{ fontSize: 9, width: 22, height: 12, flexDirection: 'row', fontWeight: 'bold', color: '#ffffff' }}>NEW</Text>
      </View>
    </View>
    <View style={{ flex: 1, flexDirection: 'column', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 4, borderWidth: 1, borderColor: '#e2e8f0' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#06b6d4' }}>16ms</Text>
      <Text style={{ fontSize: 11, color: '#94a3b8' }}>Render</Text>
    </View>
    <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 4, borderWidth: 1, borderColor: '#e2e8f0' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#10b981' }}>60</Text>
      <Text style={{ fontSize: 11,flex: 1, color: '#94a3b8' }}>FPS</Text>
    </View>
  </View>

  {/* Content Card */}
  <View name="ContentCard" style={{
    flexDirection: 'column', backgroundColor: '#ffffff',
    borderRadius: 12, padding: 16, gap: 8,
    borderWidth: 1, borderColor: '#e2e8f0',
  }}>
    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1e293b' }}>
      Flexbox Layout Engine
    </Text>
    <Text style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
      Build complex canvas layouts with familiar CSS flexbox. Powered by yoga-layout.
    </Text>
  </View>

  {/* ScrollView — try scrolling with mouse wheel! */}
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
