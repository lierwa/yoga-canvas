import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, X } from 'lucide-react';
import { transform } from 'sucrase';
import React from 'react';
import type { NodeDescriptor } from '@yoga-canvas/core';
import { View, Text, Image, ScrollView, convertChildrenToDescriptors } from '@yoga-canvas/react';
import type { CanvasNode, NodeTree } from '../types';

type Tab = 'jsx' | 'json';
type JSXPropsMode = 'style' | 'className';

type MonacoEditorLike = {
  getValue: () => string;
  onDidBlurEditorText: (cb: () => void) => { dispose: () => void };
};

export default function LiveCodeEditorPanel({
  tree,
  onClose,
  onDescriptorChange,
  embedded = false,
}: {
  tree: NodeTree;
  onClose: () => void;
  onDescriptorChange: (descriptor: NodeDescriptor) => void;
  embedded?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<Tab>('jsx');
  const [jsxPropsMode, setJsxPropsMode] = useState<JSXPropsMode>('className');
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastValidDescriptorRef = useRef<NodeDescriptor | null>(null);
  const editorRef = useRef<MonacoEditorLike | null>(null);
  const blurSubscriptionRef = useRef<{ dispose: () => void } | null>(null);

  const snapshotDescriptor = useMemo(() => buildDescriptorFromTree(tree, tree.rootId), [tree]);
  const initialJSX = useMemo(() => renderJSXFromDescriptor(snapshotDescriptor, 0, jsxPropsMode), [snapshotDescriptor, jsxPropsMode]);
  const initialJSON = useMemo(() => JSON.stringify(snapshotDescriptor, null, 2), [snapshotDescriptor]);

  const [code, setCode] = useState<{ jsx: string; json: string }>(() => ({ jsx: initialJSX, json: initialJSON }));
  const lastGeneratedJSXRef = useRef<string>(initialJSX);
  const [panelWidth, setPanelWidth] = useState(560);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (activeTab !== 'jsx') return;
    if (code.jsx !== lastGeneratedJSXRef.current) return;
    const desc = buildDescriptorFromTree(tree, tree.rootId);
    const next = renderJSXFromDescriptor(desc, 0, jsxPropsMode);
    lastGeneratedJSXRef.current = next;
    setCode((prev) => ({ ...prev, jsx: next }));
  }, [activeTab, code.jsx, jsxPropsMode, tree]);

  const rememberDescriptor = useCallback((descriptor: NodeDescriptor) => {
    lastValidDescriptorRef.current = descriptor;
    setError(null);
  }, []);

  const commitDescriptor = useCallback(
    (descriptor: NodeDescriptor) => {
      rememberDescriptor(descriptor);
      onDescriptorChange(descriptor);
    },
    [onDescriptorChange, rememberDescriptor],
  );

  const parseJSXToDescriptor = useCallback(
    (jsx: string): NodeDescriptor => {
      const wrapped = `return (${jsx.trim()})`;
      const result = transform(wrapped, {
        transforms: ['jsx'],
        jsxRuntime: 'classic',
        production: true,
      });
      const fn = new Function('React', 'View', 'Text', 'Image', 'ScrollView', result.code);
      const element = fn(React, View, Text, Image, ScrollView);
      if (!React.isValidElement(element)) {
        throw new Error('JSX 必须返回单个元素');
      }
      const descriptors = convertChildrenToDescriptors(element);
      if (descriptors.length === 0) {
        throw new Error('没有解析到有效的 Yoga 节点');
      }
      const root = descriptors[0];
      const base = lastValidDescriptorRef.current ?? snapshotDescriptor;
      return jsxPropsMode === 'className' ? mergeRestStylesByStructure(base, root) : root;
    },
    [jsxPropsMode, snapshotDescriptor],
  );

  const parseJSONToDescriptor = useCallback((json: string): NodeDescriptor => {
      const parsed = JSON.parse(json) as unknown;
      if (!isNodeDescriptor(parsed)) {
        throw new Error('JSON 需要是 NodeDescriptor（包含 type/style/children 等字段）');
      }
      return parsed;
  }, []);

  const schedule = useCallback(
    (value: string) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        try {
          const descriptor = activeTab === 'jsx' ? parseJSXToDescriptor(value) : parseJSONToDescriptor(value);
          rememberDescriptor(descriptor);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(msg);
        }
      }, 350);
    },
    [activeTab, parseJSONToDescriptor, parseJSXToDescriptor, rememberDescriptor],
  );

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined) return;
      setCode((prev) => (activeTab === 'jsx' ? { ...prev, jsx: value } : { ...prev, json: value }));
      schedule(value);
    },
    [activeTab, schedule],
  );

  const commitFromEditor = useCallback(() => {
    clearTimeout(timerRef.current);
    try {
      const currentCode = editorRef.current?.getValue() ?? (activeTab === 'jsx' ? code.jsx : code.json);
      const descriptor = activeTab === 'jsx' ? parseJSXToDescriptor(currentCode) : parseJSONToDescriptor(currentCode);
      commitDescriptor(descriptor);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
  }, [activeTab, code.json, code.jsx, commitDescriptor, parseJSONToDescriptor, parseJSXToDescriptor]);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(activeTab === 'jsx' ? code.jsx : code.json);
  }, [activeTab, code]);

  const handleResetFromCanvas = useCallback(() => {
    const desc = buildDescriptorFromTree(tree, tree.rootId);
    lastValidDescriptorRef.current = desc;
    const nextJSX = renderJSXFromDescriptor(desc, 0, jsxPropsMode);
    lastGeneratedJSXRef.current = nextJSX;
    setCode({
      jsx: nextJSX,
      json: JSON.stringify(desc, null, 2),
    });
    setError(null);
  }, [tree, jsxPropsMode]);

  useEffect(() => {
    return () => {
      blurSubscriptionRef.current?.dispose();
      blurSubscriptionRef.current = null;
    };
  }, []);

  const rootClassName = embedded
    ? 'bg-white border-l border-gray-200 flex flex-col h-full'
    : 'fixed top-0 right-0 h-screen z-50 bg-white border-l border-gray-200 shadow-2xl flex flex-col';

  return (
    <div
      className={rootClassName}
      style={embedded ? undefined : { width: panelWidth }}
    >
      {!embedded && (
        <div
          className="absolute left-0 top-0 h-full w-1 cursor-ew-resize hover:bg-indigo-500/20 active:bg-indigo-500/30"
          onPointerDown={(e) => {
            dragRef.current = { startX: e.clientX, startWidth: panelWidth };
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!dragRef.current) return;
            const delta = dragRef.current.startX - e.clientX;
            const min = 320;
            const max = Math.max(min, window.innerWidth - 240);
            const next = Math.max(min, Math.min(max, dragRef.current.startWidth + delta));
            setPanelWidth(next);
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
        />
      )}
      <div className="h-12 px-3 flex items-center gap-2 border-b border-gray-200">
        <div className="text-sm font-semibold text-gray-800">Live Editor</div>
        <div className="flex items-center gap-1 ml-2">
          <button
            type="button"
            className={`px-2 py-1 rounded text-xs ${activeTab === 'jsx' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('jsx')}
          >
            JSX
          </button>
          <button
            type="button"
            className={`px-2 py-1 rounded text-xs ${activeTab === 'json' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('json')}
          >
            JSON
          </button>
        </div>
        <div className="flex-1" />
        {activeTab === 'jsx' && (
          <div className="flex items-center gap-1 mr-2">
            <button
              type="button"
              className={`px-2 py-1 rounded text-[11px] ${jsxPropsMode === 'style' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setJsxPropsMode('style')}
              title="只输出 style"
            >
              style
            </button>
            <button
              type="button"
              className={`px-2 py-1 rounded text-[11px] ${jsxPropsMode === 'className' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              onClick={() => setJsxPropsMode('className')}
              title="只输出 className"
            >
              className
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={handleResetFromCanvas}
          className="px-2 py-1 rounded text-xs text-gray-600 hover:bg-gray-100"
          title="从当前画布同步到编辑器（覆盖当前编辑器内容）"
        >
          Sync
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="p-2 rounded hover:bg-gray-100 text-gray-600"
          title="复制当前代码"
        >
          <Copy size={16} />
        </button>
        <button type="button" onClick={onClose} className="p-2 rounded hover:bg-gray-100 text-gray-600" title="关闭">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-[#1e1e1e]">
        <Editor
          path={activeTab === 'json' ? 'live-editor.json' : 'live-editor.jsx'}
          language={activeTab === 'json' ? 'json' : 'javascript'}
          value={activeTab === 'json' ? code.json : code.jsx}
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
            monaco.languages.typescript?.javascriptDefaults?.setDiagnosticsOptions({
              noSemanticValidation: true,
              noSyntaxValidation: false,
            });
          }}
          onChange={handleChange}
          onMount={(editor) => {
            editorRef.current = editor as unknown as MonacoEditorLike;
            blurSubscriptionRef.current?.dispose();
            blurSubscriptionRef.current = editorRef.current.onDidBlurEditorText(() => {
              commitFromEditor();
            });
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            folding: true,
            showFoldingControls: 'always',
            automaticLayout: true,
            padding: { top: 12 },
          }}
        />
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-900/40 text-red-200 text-[11px] font-mono border-t border-red-800 max-h-28 overflow-auto">
          {error}
        </div>
      )}
    </div>
  );
}

function buildDescriptorFromTree(tree: NodeTree, nodeId: string): NodeDescriptor {
  const node = tree.nodes[nodeId];
  if (!node) {
    return { type: 'view', style: { width: 375, height: 667 } };
  }

  const style: Record<string, unknown> = {
    ...(node.flexStyle ?? {}),
    ...(node.visualStyle ?? {}),
  };

  if (node.type === 'text' && node.textProps) {
    const t = node.textProps;
    style.fontSize = t.fontSize;
    style.fontWeight = t.fontWeight;
    style.fontStyle = t.fontStyle;
    style.fontFamily = t.fontFamily;
    style.color = t.color;
    style.lineHeight = t.lineHeight;
    style.textAlign = t.textAlign;
    style.whiteSpace = t.whiteSpace;
    style.textShadow = t.textShadow;
  }

  const base: NodeDescriptor = {
    type: node.type,
    name: node.name,
    style: style as NodeDescriptor['style'],
  };

  if (node.type === 'text') {
    return { ...base, content: node.textProps?.content ?? '' };
  }
  if (node.type === 'image') {
    return {
      ...base,
      src: node.imageProps?.src ?? '',
      objectFit: node.imageProps?.objectFit ?? 'cover',
    };
  }
  if (node.type === 'scrollview') {
    return {
      ...base,
      scrollDirection: node.scrollViewProps?.scrollDirection ?? 'vertical',
      scrollBarVisibility: node.scrollViewProps?.scrollBarVisibility ?? 'auto',
      children: node.children.map((id) => buildDescriptorFromTree(tree, id)),
    };
  }
  return {
    ...base,
    children: node.children.map((id) => buildDescriptorFromTree(tree, id)),
  };
}

function renderJSXFromDescriptor(desc: NodeDescriptor, depth: number, mode: JSXPropsMode): string {
  const indent = '  '.repeat(depth);
  const tag = toJSXTag(desc.type);

  const props = buildJSXPropsFromDescriptor(desc, mode);
  const propsString = props.length ? ` ${props.join(' ')}` : '';

  if (desc.type === 'image') {
    return `${indent}<${tag}${propsString} />`;
  }

  if (desc.type === 'text') {
    return `${indent}<${tag}${propsString}>{${JSON.stringify(desc.content ?? '')}}</${tag}>`;
  }

  const children = (desc.children ?? [])
    .map((child) => renderJSXFromDescriptor(child, depth + 1, mode))
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

function buildJSXPropsFromDescriptor(desc: NodeDescriptor, mode: JSXPropsMode): string[] {
  const props: string[] = [];

  if (desc.name) props.push(`name=${JSON.stringify(desc.name)}`);

  const style = (desc.style ?? {}) as Record<string, unknown>;
  const { className } = styleToTailwind(style);

  if (mode === 'style') {
    if (Object.keys(style).length) props.push(`style={${JSON.stringify(style, null, 2)}}`);
  } else {
    if (className) props.push(`className=${JSON.stringify(className)}`);
  }

  if (desc.type === 'image') {
    props.push(`src=${JSON.stringify(desc.src ?? '')}`);
    if (desc.objectFit) props.push(`objectFit=${JSON.stringify(desc.objectFit)}`);
  }
  if (desc.type === 'scrollview') {
    if (desc.scrollDirection) props.push(`scrollDirection=${JSON.stringify(desc.scrollDirection)}`);
    if (desc.scrollBarVisibility) props.push(`scrollBarVisibility=${JSON.stringify(desc.scrollBarVisibility)}`);
  }

  return props;
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

  const escapeArbitrary = (v: string) => v.trim().replace(/\s+/g, '_');

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

  if (style.width === 'auto') add('w-auto', ['width']);
  else {
    const width = toSize(style.width);
    if (width) add(`w-[${width}]`, ['width']);
  }
  if (style.height === 'auto') add('h-auto', ['height']);
  else {
    const height = toSize(style.height);
    if (height) add(`h-[${height}]`, ['height']);
  }
  const minWidth = style.minWidth === 'auto' ? null : toSize(style.minWidth);
  if (minWidth) add(`min-w-[${minWidth}]`, ['minWidth']);
  const minHeight = style.minHeight === 'auto' ? null : toSize(style.minHeight);
  if (minHeight) add(`min-h-[${minHeight}]`, ['minHeight']);
  const maxWidth = style.maxWidth === 'auto' ? null : toSize(style.maxWidth);
  if (maxWidth) add(`max-w-[${maxWidth}]`, ['maxWidth']);
  const maxHeight = style.maxHeight === 'auto' ? null : toSize(style.maxHeight);
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

function isNodeDescriptor(value: unknown): value is NodeDescriptor {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.type !== 'string') return false;
  if (!v.style || typeof v.style !== 'object') return false;
  if (v.children !== undefined) {
    if (!Array.isArray(v.children)) return false;
    for (const c of v.children) {
      if (!isNodeDescriptor(c)) return false;
    }
  }
  return true;
}

function mergeRestStylesByStructure(base: NodeDescriptor, next: NodeDescriptor): NodeDescriptor {
  const nextStyle = { ...((next.style ?? {}) as Record<string, unknown>) };
  const baseStyle = (base.style ?? {}) as Record<string, unknown>;
  const { restStyle } = styleToTailwind(baseStyle);
  if (Object.keys(restStyle).length) {
    Object.assign(nextStyle, restStyle);
  }

  const baseChildren = base.children ?? [];
  const nextChildren = next.children ?? [];

  if (nextChildren.length === 0) {
    return { ...next, style: nextStyle };
  }

  const mergedChildren = nextChildren.map((child, i) => {
    const baseChild = baseChildren[i];
    if (!baseChild) return child;
    if (baseChild.type !== child.type) return child;
    return mergeRestStylesByStructure(baseChild, child);
  });

  return { ...next, style: nextStyle, children: mergedChildren };
}
