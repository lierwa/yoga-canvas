import Editor from '@monaco-editor/react';

export function CodeViewer({ content, language }: { content: string; language: 'typescript' | 'json' | 'html' }) {
  return (
    <div className="flex-1 min-h-0">
      <Editor
        path={language === 'json' ? 'preview.json' : language === 'html' ? 'preview.html' : 'preview.tsx'}
        language={language}
        value={content}
        theme="vs-dark"
        loading={
          <pre className="w-full h-full overflow-auto bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs leading-5 p-3">
            {content}
          </pre>
        }
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

