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

const OMIT_HELPER_NODE_PREFIXES = ['CodeBtn_', 'CodeBtnText_'];

type LiveButtonProps = {
  id?: string;
  name?: string;
  label: string;
  className?: string;
  tw?: string;
  style?: NodeDescriptor['style'];
  textStyle?: NodeDescriptor['style'];
  motion?: NodeDescriptor['motion'];
  events?: NodeDescriptor['events'];
};

function Button({ id, name, label, className, tw, style, textStyle, motion, events }: LiveButtonProps) {
  return (
    <View id={id} name={name} className={className} tw={tw} style={style} motion={motion} events={events}>
      <Text
        name="ButtonLabel"
        style={{
          fontSize: 14,
          fontWeight: 600,
          lineHeight: 1.2,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          ...(textStyle ?? {}),
        }}
      >
        {label}
      </Text>
    </View>
  );
}

type MonacoEditorLike = {
  getValue: () => string;
  onDidBlurEditorText: (cb: () => void) => { dispose: () => void };
};

export default function LiveCodeEditorPanel({
  tree,
  onClose,
  onDescriptorChange,
  embedded = false,
  readOnly = false,
  rootNodeId,
  initialCode,
}: {
  tree: NodeTree;
  onClose: () => void;
  onDescriptorChange: (descriptor: NodeDescriptor) => void;
  embedded?: boolean;
  readOnly?: boolean;
  rootNodeId?: string;
  initialCode?: { jsx?: string; json?: string };
}) {
  const [activeTab, setActiveTab] = useState<Tab>('jsx');
  const [jsxPropsMode, setJsxPropsMode] = useState<JSXPropsMode>('className');
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastValidDescriptorRef = useRef<NodeDescriptor | null>(null);
  const editorRef = useRef<MonacoEditorLike | null>(null);
  const blurSubscriptionRef = useRef<{ dispose: () => void } | null>(null);

  const effectiveRootId = rootNodeId ?? tree.rootId;
  const snapshotDescriptor = useMemo(
    () =>
      buildDescriptorFromTree(tree, effectiveRootId, {
        omitNamePrefixes: OMIT_HELPER_NODE_PREFIXES,
      }),
    [tree, effectiveRootId],
  );
  const initialJSX = useMemo(() => renderJSXFromDescriptor(snapshotDescriptor, 0, jsxPropsMode), [snapshotDescriptor, jsxPropsMode]);
  const initialJSON = useMemo(() => JSON.stringify(snapshotDescriptor, null, 2), [snapshotDescriptor]);

  const seededJSX = initialCode?.jsx ?? initialJSX;
  const seededJSON = initialCode?.json ?? initialJSON;
  const jsxIsGeneratedFromTree = initialCode?.jsx === undefined;

  const [code, setCode] = useState<{ jsx: string; json: string }>(() => ({ jsx: seededJSX, json: seededJSON }));
  const lastGeneratedJSXRef = useRef<string>(seededJSX);
  const [panelWidth, setPanelWidth] = useState(560);

  useEffect(() => {
    if (!jsxIsGeneratedFromTree) return;
    if (activeTab !== 'jsx') return;
    if (code.jsx !== lastGeneratedJSXRef.current) return;
    const desc = buildDescriptorFromTree(tree, effectiveRootId, { omitNamePrefixes: OMIT_HELPER_NODE_PREFIXES });
    const next = renderJSXFromDescriptor(desc, 0, jsxPropsMode);
    lastGeneratedJSXRef.current = next;
    setCode((prev) => ({ ...prev, jsx: next }));
  }, [activeTab, code.jsx, jsxIsGeneratedFromTree, jsxPropsMode, tree, effectiveRootId]);

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
      const fn = new Function('React', 'View', 'Text', 'Image', 'ScrollView', 'Button', result.code);
      const element = fn(React, View, Text, Image, ScrollView, Button);
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

  const parseJSONToDescriptor = useCallback((input: string): NodeDescriptor => {
    const parseErrorToMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

    const parseAsJSObject = (raw: string): unknown => {
      const source = raw.trim().replace(/;+\s*$/, '');
      if (!source) {
        throw new Error('内容为空');
      }

      const startsWithObject = source.startsWith('{');
      const startsWithArray = source.startsWith('[');
      if (startsWithObject || startsWithArray) {
        const fn = new Function(`return (${source});`);
        return fn();
      }

      const start = source.indexOf('{');
      if (start < 0) {
        throw new Error('未找到对象起始符号 "{"');
      }

      let depth = 0;
      let inString: '"' | "'" | '`' | null = null;
      let escaped = false;
      for (let i = start; i < source.length; i += 1) {
        const ch = source[i];
        if (inString) {
          if (escaped) {
            escaped = false;
            continue;
          }
          if (ch === '\\') {
            escaped = true;
            continue;
          }
          if (ch === inString) {
            inString = null;
          }
          continue;
        }

        if (ch === '"' || ch === "'" || ch === '`') {
          inString = ch;
          continue;
        }
        if (ch === '{') depth += 1;
        if (ch === '}') depth -= 1;
        if (depth === 0 && ch === '}') {
          const expr = source.slice(start, i + 1);
          const fn = new Function(`return (${expr});`);
          return fn();
        }
      }

      throw new Error('对象括号不匹配：缺少 "}"');
    };

    let parsed: unknown;
    try {
      parsed = JSON.parse(input) as unknown;
    } catch (e) {
      try {
        parsed = parseAsJSObject(input);
      } catch (e2) {
        const msg1 = parseErrorToMessage(e);
        const msg2 = parseErrorToMessage(e2);
        throw new Error(
          `无法解析：请提供标准 JSON，或可执行的对象字面量（可直接粘贴 "const X: NodeDescriptor = { ... }"）。\nJSON.parse: ${msg1}\nObject literal: ${msg2}`,
        );
      }
    }

    if (!isNodeDescriptor(parsed)) {
      throw new Error('内容需要是 NodeDescriptor（至少包含 type/style，children 为可选数组）');
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
    const desc = buildDescriptorFromTree(tree, effectiveRootId, { omitNamePrefixes: OMIT_HELPER_NODE_PREFIXES });
    lastValidDescriptorRef.current = desc;
    const nextJSX = renderJSXFromDescriptor(desc, 0, jsxPropsMode);
    lastGeneratedJSXRef.current = nextJSX;
    setCode({
      jsx: nextJSX,
      json: JSON.stringify(desc, null, 2),
    });
    setError(null);
  }, [tree, jsxPropsMode, effectiveRootId]);

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
        showSync={!readOnly}
        onSyncFromCanvas={handleResetFromCanvas}
        showApply={!readOnly}
        onApplyToCanvas={commitFromEditor}
        onCopy={handleCopy}
        onClose={onClose}
      />

      <div className="flex-1 min-h-0 bg-[#1e1e1e]">
        <Editor
          path={activeTab === 'json' ? 'live-editor.json' : 'live-editor.jsx'}
          language={activeTab === 'json' ? 'json' : 'javascript'}
          value={activeTab === 'json' ? code.json : code.jsx}
          theme="vs-dark"
          loading={
            <textarea
              value={activeTab === 'json' ? code.json : code.jsx}
              readOnly={readOnly}
              spellCheck={false}
              className="w-full h-full resize-none bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs leading-5 outline-none p-3"
              onChange={readOnly ? undefined : (e) => handleChange(e.currentTarget.value)}
              onBlur={readOnly ? undefined : () => commitFromEditor()}
            />
          }
          onChange={readOnly ? undefined : handleChange}
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
          onMount={(editor) => {
            editorRef.current = editor as unknown as MonacoEditorLike;
            blurSubscriptionRef.current?.dispose();
            blurSubscriptionRef.current = null;
            if (!readOnly) {
              blurSubscriptionRef.current = editorRef.current.onDidBlurEditorText(() => {
                commitFromEditor();
              });
            }
          }}
          options={{
            readOnly,
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
