import { useState, useCallback, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { transform } from 'sucrase';
import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  convertChildrenToDescriptors,
  type NodeDescriptor,
} from '@yoga-canvas/react';

interface LiveEditorProps {
  defaultCode: string;
  onDescriptorChange: (descriptor: NodeDescriptor) => void;
}

export function LiveEditor({ defaultCode, onDescriptorChange }: LiveEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastValidDescriptor = useRef<NodeDescriptor | null>(null);

  const transpileAndEval = useCallback(
    (code: string) => {
      try {
        const evalWithSource = (source: string) => {
          const result = transform(source, {
            transforms: ['jsx'],
            jsxRuntime: 'classic',
            production: true,
          });
          const fn = new Function('React', 'View', 'Text', 'Image', 'ScrollView', result.code);
          return fn(React, View, Text, Image, ScrollView);
        };

        let element: unknown;
        const trimmed = code.trim();
        try {
          element = evalWithSource(`return (${trimmed})`);
        } catch {
          element = evalWithSource(trimmed);
        }

        if (!React.isValidElement(element)) {
          setError('Code must return a JSX element');
          return;
        }

        const descriptors = convertChildrenToDescriptors(element);
        if (descriptors.length === 0) {
          setError('No valid Yoga nodes found');
          return;
        }

        const descriptor = descriptors[0];
        lastValidDescriptor.current = descriptor;
        setError(null);
        onDescriptorChange(descriptor);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      }
    },
    [onDescriptorChange],
  );

  // Initial transpile
  useEffect(() => {
    transpileAndEval(defaultCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (!value) return;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        transpileAndEval(value);
      }, 400);
    },
    [transpileAndEval],
  );

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      <div className="px-4 py-2 border-b border-gray-700 text-xs font-bold text-gray-400 flex items-center justify-between">
        <span>Live JSX Editor</span>
        {error && (
          <span className="text-red-400 font-normal truncate ml-4 max-w-[70%]" title={error}>
            Error
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          defaultLanguage="javascript"
          defaultValue={defaultCode}
          theme="vs-dark"
          onChange={handleChange}
          options={{
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            automaticLayout: true,
            padding: { top: 12 },
          }}
        />
      </div>
      {error && (
        <div className="px-3 py-2 bg-red-900/40 text-red-300 text-[11px] font-mono border-t border-red-800 max-h-20 overflow-auto">
          {error}
        </div>
      )}
    </div>
  );
}
