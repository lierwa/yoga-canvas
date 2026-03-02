import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { transform } from 'sucrase';
import React from 'react';
import type { NodeDescriptor } from '@yoga-canvas/core';
import { View, Text, Image, ScrollView, convertChildrenToDescriptors } from '@yoga-canvas/react';
import type { NodeTree } from '../types';
import {
  buildDescriptorFromTree,
  isNodeDescriptor,
  mergeRestStylesByStructure,
  renderJSXFromDescriptor,
  type JSXPropsMode,
} from './live-code-editor/descriptor';
import { LiveCodeEditorHeader } from './live-code-editor/LiveCodeEditorHeader';
import { LiveCodeEditorResizer } from './live-code-editor/LiveCodeEditorResizer';

type Tab = 'jsx' | 'json';

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
        <LiveCodeEditorResizer panelWidth={panelWidth} onPanelWidthChange={setPanelWidth} />
      )}
      <LiveCodeEditorHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        jsxPropsMode={jsxPropsMode}
        onJsxPropsModeChange={setJsxPropsMode}
        showJsxPropsMode={activeTab === 'jsx'}
        onSyncFromCanvas={handleResetFromCanvas}
        onCopy={handleCopy}
        onClose={onClose}
      />

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
