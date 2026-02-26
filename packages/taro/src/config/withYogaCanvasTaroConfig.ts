type AnyRecord = Record<string, unknown>;

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function ensureObject(value: unknown): AnyRecord {
  return value && typeof value === 'object' ? (value as AnyRecord) : {};
}

export function withYogaCanvasTaroConfig<T extends AnyRecord>(config: T): T {
  const compiler = ensureObject(config.compiler);
  const prebundle = ensureObject(compiler.prebundle);

  const outputRoot = typeof config.outputRoot === 'string' ? config.outputRoot : 'dist';

  const mini = ensureObject(config.mini);
  const copy = ensureObject(mini.copy);
  const patterns = ensureArray<{ from?: string; to?: string }>(copy.patterns).slice();

  const from = 'node_modules/@yoga-canvas/taro/wasm';
  const to = `${outputRoot}/wasm`;
  const hasPattern = patterns.some((p) => p?.from === from && p?.to === to);
  if (!hasPattern) patterns.push({ from, to });

  return {
    ...config,
    compiler: {
      ...compiler,
      prebundle: {
        ...prebundle,
        enable: false,
      },
    },
    mini: {
      ...mini,
      copy: {
        ...copy,
        patterns,
      },
    },
  } as T;
}

