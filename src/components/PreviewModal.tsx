import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  ArrowLeft,
  Box,
  ChevronDown,
  ChevronRight,
  Copy,
  Crosshair,
  Download,
  Eye,
  ImageIcon,
  Move,
  Palette,
  ScrollText,
  Square,
  Trash2,
  Type,
} from 'lucide-react';
import type { NodeTree, CanvasNode } from '../types';
import {
  computeScrollContentSizes,
  createYogaCanvas,
  exportToDOMString,
  exportToJSON,
  hitTest,
  type ScrollManager,
  type YogaCanvas,
} from '@yoga-canvas/core';
import { NodeTreePanel, SelectionOverlay } from '@yoga-canvas/react';

interface PreviewModalProps {
  tree: NodeTree;
  onClose: () => void;
}

export default function PreviewModal({ tree, onClose }: PreviewModalProps) {
  const rootFromProp = tree.nodes[tree.rootId] ?? null;
  const rootWidth = typeof rootFromProp?.computedLayout.width === 'number' ? rootFromProp.computedLayout.width : 375;
  const rootHeight = typeof rootFromProp?.computedLayout.height === 'number' ? rootFromProp.computedLayout.height : 667;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const canvasFrameRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<YogaCanvas | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [previewTree, setPreviewTree] = useState<NodeTree>(tree);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'typescript' | 'json' | 'html'>('typescript');
  const [jsxPropsMode, setJsxPropsMode] = useState<'style' | 'className'>('style');

  const loadTreeIntoEngine = useCallback(
    (inst: YogaCanvas) => {
      const json = exportToJSON(tree);
      inst.loadJSON(json);
      computeScrollContentSizes(inst.getNodeTree(), inst.getScrollManager());
      inst.render();
    },
    [tree],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.style.width = `${rootWidth}px`;
    canvas.style.height = `${rootHeight}px`;

    const inst = createYogaCanvas(
      canvas,
      { type: 'view', name: 'Root', style: { width: rootWidth, height: rootHeight } },
      { platform: 'h5', width: rootWidth, height: rootHeight, pixelRatio: window.devicePixelRatio || 1 },
    );
    instanceRef.current = inst;
    let disposed = false;
    const handleRender = () => {
      setPreviewTree(inst.getNodeTree());
    };
    inst.on('render', handleRender);

    inst.init().then(() => {
      if (disposed) return;
      loadTreeIntoEngine(inst);
      setPreviewTree(inst.getNodeTree());
      setEngineReady(true);
    });

    return () => {
      disposed = true;
      setEngineReady(false);
      inst.off('render', handleRender);
      inst.destroy();
      instanceRef.current = null;
    };
  }, [rootWidth, rootHeight, loadTreeIntoEngine]);

  useEffect(() => {
    if (!engineReady) return;
    const inst = instanceRef.current;
    if (!inst) return;
    loadTreeIntoEngine(inst);
    setPreviewTree(inst.getNodeTree());
    setSelectedNodeId(null);
  }, [engineReady, loadTreeIntoEngine]);

  const handleExportImage = useCallback(async () => {
    const inst = instanceRef.current;
    if (!inst) return;
    const url = await inst.toDataURL();
    setPreviewImage(url);
  }, []);

  const root = previewTree.nodes[previewTree.rootId] ?? null;
  const selectedNode = selectedNodeId ? previewTree.nodes[selectedNodeId] ?? null : null;

  const codeContent = useMemo(() => {
    if (activeTab === 'json') return exportToJSON(previewTree);
    if (activeTab === 'html') return formatHTMLString(exportToDOMString(previewTree));
    return buildJSXFromTree(previewTree, jsxPropsMode);
  }, [activeTab, previewTree, jsxPropsMode]);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(codeContent);
  }, [codeContent]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const inst = instanceRef.current;
    if (!inst) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = hitTest(inst.getNodeTree(), x, y, { scrollManager: inst.getScrollManager() });
    setSelectedNodeId(hit);
  }, []);

  const locateNode = useCallback((nodeId: string | null) => {
    if (!nodeId) return;
    const inst = instanceRef.current;
    if (!inst) return;
    const treeNow = inst.getNodeTree();
    const scrollManager = inst.getScrollManager();
    if (!treeNow.nodes[nodeId]) return;

    computeScrollContentSizes(treeNow, scrollManager);
    revealNodeInScrollViews(treeNow, nodeId, scrollManager);
    inst.render();

    const container = canvasScrollRef.current;
    const frame = canvasFrameRef.current;
    if (!container || !frame) return;
    const node = treeNow.nodes[nodeId];
    if (!node) return;
    const off = getAncestorScrollOffset(treeNow, nodeId, scrollManager);
    const rect = node.computedLayout;
    const left = rect.left - off.x;
    const top = rect.top - off.y;

    const containerRect = container.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const frameLeft = frameRect.left - containerRect.left + container.scrollLeft;
    const frameTop = frameRect.top - containerRect.top + container.scrollTop;

    scrollRectIntoView(
      container,
      { left: frameLeft + left, top: frameTop + top, width: rect.width, height: rect.height },
      40,
    );
  }, []);

  const handleSelectFromTree = useCallback((id: string | null) => {
    setSelectedNodeId(id);
    locateNode(id);
  }, [locateNode]);

  const handleDeleteFromTree = useCallback((nodeId: string) => {
    const inst = instanceRef.current;
    if (!inst) return;
    inst.deleteNode(nodeId);
    computeScrollContentSizes(inst.getNodeTree(), inst.getScrollManager());
    inst.render();
    const nextTree = inst.getNodeTree();
    setPreviewTree(nextTree);
    setSelectedNodeId((prev) => (prev && nextTree.nodes[prev] ? prev : null));
  }, []);

  const handleMoveFromTree = useCallback((nodeId: string, newParentId: string, insertIndex?: number) => {
    const inst = instanceRef.current;
    if (!inst) return;
    inst.moveNode(nodeId, newParentId, insertIndex);
    computeScrollContentSizes(inst.getNodeTree(), inst.getScrollManager());
    inst.render();
    setPreviewTree(inst.getNodeTree());
  }, []);

  if (!root) return null;

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <button
          className="text-xs text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer"
          onClick={onClose}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="min-w-0">
          <div className="text-lg font-bold text-indigo-600 truncate">Preview</div>
          <div className="text-xs text-gray-400 truncate">{root.name} · {rootWidth}×{rootHeight}</div>
        </div>
        <div className="flex-1" />
        <button
          className="text-xs text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleExportImage}
          disabled={!engineReady}
        >
          <Download size={14} /> Image
        </button>
      </div>

      <ResizablePanels
        defaultLeftWidth={420}
        defaultRightWidth={320}
        minWidth={220}
        left={(
          <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-700 text-xs font-bold text-gray-400 flex items-center gap-2">
              <button
                className={`px-2 py-1 rounded ${activeTab === 'typescript' ? 'bg-gray-700 text-gray-100' : 'hover:bg-gray-800'}`}
                onClick={() => setActiveTab('typescript')}
              >
                JSX
              </button>
              <button
                className={`px-2 py-1 rounded ${activeTab === 'json' ? 'bg-gray-700 text-gray-100' : 'hover:bg-gray-800'}`}
                onClick={() => setActiveTab('json')}
              >
                JSON
              </button>
              <button
                className={`px-2 py-1 rounded ${activeTab === 'html' ? 'bg-gray-700 text-gray-100' : 'hover:bg-gray-800'}`}
                onClick={() => setActiveTab('html')}
              >
                HTML
              </button>
              {activeTab === 'typescript' && (
                <div className="flex items-center gap-1 ml-2">
                  <button
                    className={`px-2 py-1 rounded text-[11px] ${jsxPropsMode === 'style' ? 'bg-gray-700 text-gray-100' : 'hover:bg-gray-800'}`}
                    onClick={() => setJsxPropsMode('style')}
                    title="只输出 style"
                  >
                    style
                  </button>
                  <button
                    className={`px-2 py-1 rounded text-[11px] ${jsxPropsMode === 'className' ? 'bg-gray-700 text-gray-100' : 'hover:bg-gray-800'}`}
                    onClick={() => setJsxPropsMode('className')}
                    title="只输出 className"
                  >
                    className
                  </button>
                </div>
              )}
              <div className="flex-1" />
              <button
                className="text-[11px] bg-indigo-500 text-white px-2.5 py-1 rounded hover:bg-indigo-600 cursor-pointer flex items-center gap-1"
                onClick={handleCopy}
              >
                <Copy size={12} /> Copy
              </button>
            </div>
            <CodeViewer content={codeContent} language={activeTab} />
          </div>
        )}
        center={(
          <div ref={canvasScrollRef} className="flex-1 flex items-center justify-center bg-gray-100 overflow-auto">
            <div
              ref={canvasFrameRef}
              className="relative rounded-xl shadow-2xl overflow-hidden border border-gray-300 bg-white"
              style={{ width: rootWidth, height: rootHeight, borderRadius: 4 }}
              onClick={handleCanvasClick}
            >
              <div className="relative" style={{ width: rootWidth, height: rootHeight }}>
                <canvas
                  ref={canvasRef}
                  style={{ background: '#ffffff', borderRadius: 20 }}
                  className="block"
                />
                {selectedNodeId && (
                  <SelectionOverlay
                    tree={previewTree}
                    nodeId={selectedNodeId}
                    scrollManager={instanceRef.current?.getScrollManager() ?? null}
                    eventSource={instanceRef.current}
                  />
                )}
              </div>
            </div>
          </div>
        )}
        right={(
          <div className="bg-white flex flex-col h-full">
            <div className="border-b border-gray-200" style={{ maxHeight: '40%' }}>
              <NodeTreePanel
                tree={previewTree}
                selectedNodeId={selectedNodeId}
                onSelectNode={handleSelectFromTree}
                canDelete={false}
                onDeleteNode={handleDeleteFromTree}
                onMoveNode={handleMoveFromTree}
                disabled
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
        )}
      />

      {previewImage && <ImagePreviewModal url={previewImage} onClose={() => setPreviewImage(null)} />}
    </div>
  );
}

function buildJSXFromTree(tree: NodeTree, mode: 'style' | 'className'): string {
  const root = tree.nodes[tree.rootId];
  if (!root) return '';
  return renderJSXNode(tree, root.id, 0, mode);
}

function formatHTMLString(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  try {
    const doc = new DOMParser().parseFromString(trimmed, 'text/html');
    const nodes = Array.from(doc.body.childNodes);
    const out = nodes
      .map((n) => formatDOMNode(n, 0))
      .filter((s) => s.trim().length > 0)
      .join('\n')
      .trim();
    return out || trimmed;
  } catch {
    return trimmed;
  }
}

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

function formatDOMNode(node: Node, depth: number): string {
  const indent = '  '.repeat(depth);

  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
    return text ? `${indent}${text}` : '';
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const attrs = el
      .getAttributeNames()
      .map((name) => {
        const value = el.getAttribute(name);
        if (value === null) return '';
        const escaped = value.replace(/"/g, '&quot;');
        return `${name}="${escaped}"`;
      })
      .filter(Boolean)
      .join(' ');
    const open = `${indent}<${tag}${attrs ? ` ${attrs}` : ''}>`;

    const children = Array.from(el.childNodes)
      .map((c) => formatDOMNode(c, depth + 1))
      .filter((s) => s.trim().length > 0);

    const hasElementChild = Array.from(el.childNodes).some((c) => c.nodeType === Node.ELEMENT_NODE);
    if (children.length === 0) {
      if (VOID_TAGS.has(tag)) return `${indent}<${tag}${attrs ? ` ${attrs}` : ''} />`;
      return `${open}</${tag}>`;
    }

    if (!hasElementChild && children.length === 1) {
      const text = children[0].trim();
      if (text.length <= 80) return `${open}${text}</${tag}>`;
    }

    const close = `${indent}</${tag}>`;
    return `${open}\n${children.join('\n')}\n${close}`;
  }

  return '';
}

function renderJSXNode(tree: NodeTree, nodeId: string, depth: number, mode: 'style' | 'className'): string {
  const node = tree.nodes[nodeId];
  if (!node) return '';

  const indent = '  '.repeat(depth);
  const tag = toJSXTag(node.type);

  const props = buildJSXProps(node, mode);
  const propsString = props.length ? ` ${props.join(' ')}` : '';

  if (node.type === 'image') {
    return `${indent}<${tag}${propsString} />`;
  }

  if (node.type === 'text') {
    const content = node.textProps?.content ?? '';
    return `${indent}<${tag}${propsString}>{${JSON.stringify(content)}}</${tag}>`;
  }

  const children = node.children
    .map((childId) => renderJSXNode(tree, childId, depth + 1, mode))
    .filter(Boolean);

  if (children.length === 0) {
    return `${indent}<${tag}${propsString} />`;
  }

  return `${indent}<${tag}${propsString}>\n${children.join('\n')}\n${indent}</${tag}>`;
}

function toJSXTag(type: CanvasNode['type']): string {
  switch (type) {
    case 'view':
      return 'View';
    case 'text':
      return 'Text';
    case 'image':
      return 'Image';
    case 'scrollview':
      return 'ScrollView';
    default:
      return 'View';
  }
}

function buildJSXProps(node: CanvasNode, mode: 'style' | 'className'): string[] {
  const props: string[] = [];

  if (node.name) props.push(`name=${JSON.stringify(node.name)}`);

  const style = buildCombinedStyle(node);
  const { className } = styleToTailwind(style);
  if (mode === 'style') {
    if (Object.keys(style).length) props.push(`style={${JSON.stringify(style, null, 2)}}`);
  } else {
    if (className) props.push(`className=${JSON.stringify(className)}`);
  }

  if (node.type === 'image') {
    const src = node.imageProps?.src ?? '';
    props.push(`src=${JSON.stringify(src)}`);
    if (node.imageProps?.objectFit) {
      props.push(`objectFit=${JSON.stringify(node.imageProps.objectFit)}`);
    }
  }

  if (node.type === 'scrollview') {
    const dir = node.scrollViewProps?.scrollDirection;
    if (dir) props.push(`scrollDirection=${JSON.stringify(dir)}`);
    const vis = node.scrollViewProps?.scrollBarVisibility;
    if (vis) props.push(`scrollBarVisibility=${JSON.stringify(vis)}`);
  }

  return props;
}

function buildCombinedStyle(node: CanvasNode): Record<string, unknown> {
  const style: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node.flexStyle ?? {})) {
    if (v !== undefined) style[k] = v;
  }
  for (const [k, v] of Object.entries(node.visualStyle ?? {})) {
    if (v !== undefined) style[k] = v;
  }
  if (node.type === 'text' && node.textProps) {
    for (const [k, v] of Object.entries(node.textProps)) {
      if (k === 'content') continue;
      if (v !== undefined) style[k] = v;
    }
  }
  return style;
}

function styleToTailwind(style: Record<string, unknown>): { className: string; restStyle: Record<string, unknown> } {
  const tokens: string[] = [];
  const rest: Record<string, unknown> = { ...style };

  const add = (token: string, keys?: string[]) => {
    tokens.push(token);
    if (keys) {
      for (const k of keys) delete rest[k];
    }
  };

  const toSize = (v: unknown) => {
    if (typeof v === 'number') return `${v}px`;
    if (typeof v === 'string' && v) return v;
    return null;
  };

  const pxToScale = (px: unknown) => {
    if (typeof px !== 'number') return null;
    const map: Record<number, string> = {
      0: '0',
      2: '0.5',
      4: '1',
      6: '1.5',
      8: '2',
      10: '2.5',
      12: '3',
      14: '3.5',
      16: '4',
      20: '5',
      24: '6',
      28: '7',
      32: '8',
      36: '9',
      40: '10',
      44: '11',
      48: '12',
      56: '14',
      64: '16',
      80: '20',
      96: '24',
      112: '28',
      128: '32',
      144: '36',
      160: '40',
      176: '44',
      192: '48',
      208: '52',
      224: '56',
      240: '60',
      256: '64',
      288: '72',
      320: '80',
      384: '96',
    };
    return map[px] ?? null;
  };

  const spacingToken = (prefix: string, v: unknown) => {
    const scale = pxToScale(v);
    if (scale) return `${prefix}-${scale}`;
    const size = toSize(v);
    if (!size) return null;
    return `${prefix}-[${size}]`;
  };

  const flexDirection = style.flexDirection;
  if (flexDirection === 'row') add('flex-row', ['flexDirection']);
  else if (flexDirection === 'column') add('flex-col', ['flexDirection']);
  else if (flexDirection === 'row-reverse') add('flex-row-reverse', ['flexDirection']);
  else if (flexDirection === 'column-reverse') add('flex-col-reverse', ['flexDirection']);

  const flexWrap = style.flexWrap;
  if (flexWrap === 'wrap') add('flex-wrap', ['flexWrap']);
  else if (flexWrap === 'nowrap') add('flex-nowrap', ['flexWrap']);

  const alignItems = style.alignItems;
  if (alignItems === 'flex-start') add('items-start', ['alignItems']);
  else if (alignItems === 'center') add('items-center', ['alignItems']);
  else if (alignItems === 'flex-end') add('items-end', ['alignItems']);
  else if (alignItems === 'stretch') add('items-stretch', ['alignItems']);

  const justifyContent = style.justifyContent;
  if (justifyContent === 'flex-start') add('justify-start', ['justifyContent']);
  else if (justifyContent === 'center') add('justify-center', ['justifyContent']);
  else if (justifyContent === 'flex-end') add('justify-end', ['justifyContent']);
  else if (justifyContent === 'space-between') add('justify-between', ['justifyContent']);
  else if (justifyContent === 'space-around') add('justify-around', ['justifyContent']);
  else if (justifyContent === 'space-evenly') add('justify-evenly', ['justifyContent']);

  const position = style.position;
  if (position === 'absolute') add('absolute', ['position']);
  else if (position === 'relative') add('relative', ['position']);

  const width = toSize(style.width);
  if (width) add(`w-[${width}]`, ['width']);
  const height = toSize(style.height);
  if (height) add(`h-[${height}]`, ['height']);
  const minWidth = toSize(style.minWidth);
  if (minWidth) add(`min-w-[${minWidth}]`, ['minWidth']);
  const minHeight = toSize(style.minHeight);
  if (minHeight) add(`min-h-[${minHeight}]`, ['minHeight']);
  const maxWidth = toSize(style.maxWidth);
  if (maxWidth) add(`max-w-[${maxWidth}]`, ['maxWidth']);
  const maxHeight = toSize(style.maxHeight);
  if (maxHeight) add(`max-h-[${maxHeight}]`, ['maxHeight']);

  const insetSide = (key: string, prefix: string) => {
    const token = spacingToken(prefix, (style as Record<string, unknown>)[key]);
    if (!token) return;
    add(token, [key]);
  };
  insetSide('top', 'top');
  insetSide('right', 'right');
  insetSide('bottom', 'bottom');
  insetSide('left', 'left');

  const pt = (style as Record<string, unknown>).paddingTop;
  const pr = (style as Record<string, unknown>).paddingRight;
  const pb = (style as Record<string, unknown>).paddingBottom;
  const pl = (style as Record<string, unknown>).paddingLeft;
  if ([pt, pr, pb, pl].every((v) => typeof v === 'number') && pt === pr && pr === pb && pb === pl) {
    const token = spacingToken('p', pt);
    if (token) add(token, ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']);
  } else {
    const t = spacingToken('pt', pt);
    if (t) add(t, ['paddingTop']);
    const r = spacingToken('pr', pr);
    if (r) add(r, ['paddingRight']);
    const b = spacingToken('pb', pb);
    if (b) add(b, ['paddingBottom']);
    const l = spacingToken('pl', pl);
    if (l) add(l, ['paddingLeft']);
  }

  const mt = (style as Record<string, unknown>).marginTop;
  const mr = (style as Record<string, unknown>).marginRight;
  const mb = (style as Record<string, unknown>).marginBottom;
  const ml = (style as Record<string, unknown>).marginLeft;
  if ([mt, mr, mb, ml].every((v) => typeof v === 'number') && mt === mr && mr === mb && mb === ml) {
    const token = spacingToken('m', mt);
    if (token) add(token, ['marginTop', 'marginRight', 'marginBottom', 'marginLeft']);
  } else {
    const t = spacingToken('mt', mt);
    if (t) add(t, ['marginTop']);
    const r = spacingToken('mr', mr);
    if (r) add(r, ['marginRight']);
    const b = spacingToken('mb', mb);
    if (b) add(b, ['marginBottom']);
    const l = spacingToken('ml', ml);
    if (l) add(l, ['marginLeft']);
  }

  const spaceKey = (key: string, prefix: string) => {
    const token = spacingToken(prefix, (style as Record<string, unknown>)[key]);
    if (!token) return;
    add(token, [key]);
  };
  spaceKey('padding', 'p');
  spaceKey('margin', 'm');
  spaceKey('gap', 'gap');

  const escapeArbitrary = (v: string) => v.trim().replace(/\s+/g, '_');

  const backgroundColor = style.backgroundColor;
  if (typeof backgroundColor === 'string' && backgroundColor) add(`bg-[${escapeArbitrary(backgroundColor)}]`, ['backgroundColor']);
  const borderRadius = style.borderRadius;
  if (typeof borderRadius === 'number') {
    if (borderRadius === 0) add('rounded-none', ['borderRadius']);
    else add(`rounded-[${borderRadius}px]`, ['borderRadius']);
  }
  const borderWidth = style.borderWidth;
  if (typeof borderWidth === 'number' && borderWidth !== 0) add(`border-[${borderWidth}px]`, ['borderWidth']);
  const borderColor = style.borderColor;
  if (typeof borderColor === 'string' && borderColor && borderColor !== 'transparent') add(`border-[${escapeArbitrary(borderColor)}]`, ['borderColor']);

  const opacity = style.opacity;
  if (typeof opacity === 'number' && opacity !== 1) add(`opacity-[${opacity}]`, ['opacity']);
  const rotate = style.rotate;
  if (typeof rotate === 'number' && rotate !== 0) add(`rotate-[${rotate}deg]`, ['rotate']);
  const zIndex = style.zIndex;
  if (typeof zIndex === 'number' && zIndex !== 0) add(`z-[${zIndex}]`, ['zIndex']);

  const color = style.color;
  if (typeof color === 'string' && color) add(`text-[${escapeArbitrary(color)}]`, ['color']);
  const fontSize = style.fontSize;
  if (typeof fontSize === 'number') add(`text-[${fontSize}px]`, ['fontSize']);
  const fontStyle = style.fontStyle;
  if (fontStyle === 'italic') add('italic', ['fontStyle']);
  const fontWeight = style.fontWeight;
  if (fontWeight === 'bold') add('font-bold', ['fontWeight']);
  else if (fontWeight === 'normal') add('font-normal', ['fontWeight']);
  else if (typeof fontWeight === 'number') add(`font-[${fontWeight}]`, ['fontWeight']);
  const lineHeight = style.lineHeight;
  if (typeof lineHeight === 'number') add(`leading-[${lineHeight}]`, ['lineHeight']);
  const textAlign = style.textAlign;
  if (textAlign === 'left') add('text-left', ['textAlign']);
  else if (textAlign === 'center') add('text-center', ['textAlign']);
  else if (textAlign === 'right') add('text-right', ['textAlign']);
  const whiteSpace = style.whiteSpace;
  if (whiteSpace === 'nowrap') add('whitespace-nowrap', ['whiteSpace']);
  else if (whiteSpace === 'normal') add('whitespace-normal', ['whiteSpace']);

  return {
    className: tokens.join(' ').trim(),
    restStyle: rest,
  };
}

function ImagePreviewModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-4 flex flex-col items-center gap-4 max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-gray-800">Exported Image</h3>
        <img src={url} alt="Export" className="rounded-lg border border-gray-200 shadow-sm" style={{ maxWidth: 420 }} />
        <div className="flex gap-2">
          <a
            href={url}
            download="yoga-canvas.png"
            className="text-xs bg-indigo-500 text-white px-4 py-1.5 rounded hover:bg-indigo-600 flex items-center gap-1 cursor-pointer"
          >
            <Download size={12} /> Download
          </a>
          <button className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer px-3 py-1.5" onClick={onClose}>
            Close
          </button>
        </div>
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

function getAncestorScrollOffset(tree: NodeTree, nodeId: string, scrollManager: ScrollManager): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let currentId: string | null = nodeId;
  while (currentId) {
    const node: CanvasNode | undefined = tree.nodes[currentId];
    const parentId: string | null = node?.parentId ?? null;
    if (!parentId) break;
    const parent: CanvasNode | undefined = tree.nodes[parentId];
    if (parent?.type === 'scrollview') {
      const off = scrollManager.getOffset(parentId);
      x += off.x;
      y += off.y;
    }
    currentId = parentId;
  }
  return { x, y };
}

function scrollRectIntoView(
  container: HTMLElement,
  rect: { left: number; top: number; width: number; height: number },
  padding = 24,
): void {
  const rectLeft = rect.left;
  const rectTop = rect.top;
  const rectRight = rectLeft + rect.width;
  const rectBottom = rectTop + rect.height;

  let nextLeft = container.scrollLeft;
  let nextTop = container.scrollTop;

  const leftLimit = container.scrollLeft + padding;
  const rightLimit = container.scrollLeft + container.clientWidth - padding;
  const topLimit = container.scrollTop + padding;
  const bottomLimit = container.scrollTop + container.clientHeight - padding;

  if (rectLeft < leftLimit) nextLeft = rectLeft - padding;
  else if (rectRight > rightLimit) nextLeft = rectRight + padding - container.clientWidth;

  if (rectTop < topLimit) nextTop = rectTop - padding;
  else if (rectBottom > bottomLimit) nextTop = rectBottom + padding - container.clientHeight;

  const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth);
  const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);

  nextLeft = Math.min(Math.max(0, nextLeft), maxLeft);
  nextTop = Math.min(Math.max(0, nextTop), maxTop);

  container.scrollTo({ left: nextLeft, top: nextTop, behavior: 'smooth' });
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

function CodeViewer({ content, language }: { content: string; language: 'typescript' | 'json' | 'html' }) {
  return (
    <div className="flex-1 min-h-0">
      <Editor
        path={language === 'json' ? 'preview.json' : language === 'html' ? 'preview.html' : 'preview.tsx'}
        language={language}
        value={content}
        theme="vs-dark"
        beforeMount={(monaco) => {
          monaco.languages.typescript?.typescriptDefaults?.setCompilerOptions({
            jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
            allowNonTsExtensions: true,
          });
          monaco.languages.typescript?.javascriptDefaults?.setCompilerOptions({
            jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
            allowNonTsExtensions: true,
          });
        }}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 12,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: 2,
          folding: true,
          showFoldingControls: 'always',
          foldingHighlight: true,
          automaticLayout: true,
          padding: { top: 12 },
        }}
      />
    </div>
  );
}

function ResizablePanels({
  left,
  center,
  right,
  defaultLeftWidth = 420,
  defaultRightWidth = 320,
  minWidth = 220,
}: {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  defaultLeftWidth?: number;
  defaultRightWidth?: number;
  minWidth?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const dragging = useRef<'left' | 'right' | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback(
    (side: 'left' | 'right') => (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = side;
      startX.current = e.clientX;
      startWidth.current = side === 'left' ? leftWidth : rightWidth;
    },
    [leftWidth, rightWidth],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const delta = e.clientX - startX.current;

      if (dragging.current === 'left') {
        const newLeft = Math.max(minWidth, Math.min(startWidth.current + delta, containerWidth - rightWidth - minWidth));
        setLeftWidth(newLeft);
      } else {
        const newRight = Math.max(minWidth, Math.min(startWidth.current - delta, containerWidth - leftWidth - minWidth));
        setRightWidth(newRight);
      }
    };

    const onMouseUp = () => {
      dragging.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [leftWidth, rightWidth, minWidth]);

  return (
    <div ref={containerRef} className="flex-1 flex overflow-hidden">
      <div style={{ width: leftWidth, minWidth }} className="flex flex-col shrink-0 overflow-hidden">
        {left}
      </div>

      <div className="w-1 bg-gray-200 hover:bg-indigo-400 cursor-col-resize transition-colors shrink-0 relative group" onMouseDown={onMouseDown('left')}>
        <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-indigo-400/20" />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {center}
      </div>

      <div className="w-1 bg-gray-200 hover:bg-indigo-400 cursor-col-resize transition-colors shrink-0 relative group" onMouseDown={onMouseDown('right')}>
        <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-indigo-400/20" />
      </div>

      <div style={{ width: rightWidth, minWidth }} className="flex flex-col shrink-0 overflow-hidden">
        {right}
      </div>
    </div>
  );
}
