import type { StyleProps, FlexValue } from '@yoga-canvas/core';
import { twj } from 'tw-to-css';

type ParseResult = {
  style: Partial<StyleProps>;
  unsupported: string[];
};

const TOKEN_STYLE_CACHE = new Map<string, Record<string, unknown> | null>();
const TEXT_SCALE_TO_PX: Record<string, number> = {
  '0': 0,
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '2.5': 10,
  '3': 12,
  '3.5': 14,
  '4': 16,
  '5': 20,
  '6': 24,
  '7': 28,
  '8': 32,
  '9': 36,
  '10': 40,
  '11': 44,
  '12': 48,
  '14': 56,
  '16': 64,
  '20': 80,
  '24': 96,
  '28': 112,
  '32': 128,
  '36': 144,
  '40': 160,
  '44': 176,
  '48': 192,
  '52': 208,
  '56': 224,
  '60': 240,
  '64': 256,
  '72': 288,
  '80': 320,
  '96': 384,
};

function splitTokens(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let bracketDepth = 0;

  const push = () => {
    const raw = current.trim();
    current = '';
    if (!raw) return;
    const normalized = raw.replace(/\[([^\]]+)\]/g, (_, inner: string) => `[${inner.replace(/\s+/g, '_')}]`);
    tokens.push(normalized);
  };

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (ch === '[') bracketDepth++;
    if (ch === ']' && bracketDepth > 0) bracketDepth--;

    if (/\s/.test(ch) && bracketDepth === 0) {
      push();
      continue;
    }

    current += ch;
  }

  push();
  return tokens;
}

function normalizeToken(token: string): string {
  const m = token.match(/^text-(\d+(?:\.\d+)?)$/);
  if (m) {
    const px = TEXT_SCALE_TO_PX[m[1]!];
    if (typeof px === 'number') return `text-[${px}px]`;
  }
  return token;
}

function parseBracketValue(token: string): string | null {
  const m = token.match(/^\[(.*)\]$/);
  return m ? m[1] : null;
}

function decodeBase64UrlToUtf8(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLen);

  const g = globalThis as unknown as { atob?: (s: string) => string; Buffer?: unknown };
  if (typeof g.atob === 'function') {
    const binary = g.atob(padded);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  if (typeof g.Buffer !== 'undefined') {
    return (g.Buffer as { from: (s: string, enc: 'base64') => { toString: (enc: 'utf8') => string } }).from(padded, 'base64').toString('utf8');
  }

  throw new Error('Base64 decode not supported');
}

function tryParseYcStyleToken(token: string): Partial<StyleProps> | null {
  if (!token.startsWith('yc-style-')) return null;
  const raw = token.slice('yc-style-'.length);
  const bracket = parseBracketValue(raw);
  if (!bracket) return null;
  try {
    const decoded = decodeBase64UrlToUtf8(bracket.trim());
    const parsed = JSON.parse(decoded) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Partial<StyleProps>;
  } catch {
    return null;
  }
}

function cssToYogaColor(input: unknown, vars: Record<string, string>): string | null {
  if (typeof input !== 'string') return null;
  let s = input.trim();
  if (!s) return null;

  s = s.replace(/var\((--[^)]+)\)/g, (_, name: string) => (vars[name] ?? `var(${name})`));

  const rgb = s.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([0-9.]+)\s*\)$/i);
  if (rgb) {
    const r = Number(rgb[1]);
    const g = Number(rgb[2]);
    const b = Number(rgb[3]);
    const a = Number(rgb[4]);
    if ([r, g, b, a].every((n) => Number.isFinite(n))) {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }

  const rgbComma = s.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgbComma) {
    const r = Number(rgbComma[1]);
    const g = Number(rgbComma[2]);
    const b = Number(rgbComma[3]);
    if ([r, g, b].every((n) => Number.isFinite(n))) {
      return `rgba(${r}, ${g}, ${b}, 1)`;
    }
  }

  return s;
}

function parseCssLengthToPx(input: unknown): number | null {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  if (typeof input !== 'string') return null;
  const s = input.trim();
  if (!s) return null;
  if (s === '0') return 0;

  const px = s.match(/^(-?\d+(?:\.\d+)?)px$/);
  if (px) return Number(px[1]);

  const rem = s.match(/^(-?\d+(?:\.\d+)?)rem$/);
  if (rem) return Number(rem[1]) * 16;

  const num = s.match(/^-?\d+(?:\.\d+)?$/);
  if (num) return Number(s);

  return null;
}

function parseCssFlexValue(input: unknown): FlexValue | undefined {
  if (typeof input === 'number') return Number.isFinite(input) ? input : undefined;
  if (typeof input !== 'string') return undefined;
  const s = input.trim();
  if (!s) return undefined;
  if (s === 'auto') return 'auto';
  if (s === '0') return 0;

  const pct = s.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (pct) return `${Number(pct[1])}%`;

  const px = s.match(/^(-?\d+(?:\.\d+)?)px$/);
  if (px) return Number(px[1]);

  const rem = s.match(/^(-?\d+(?:\.\d+)?)rem$/);
  if (rem) return Number(rem[1]) * 16;

  const num = s.match(/^-?\d+(?:\.\d+)?$/);
  if (num) return Number(s);

  return undefined;
}

function parseBoxShadow(input: unknown, vars: Record<string, string>): NonNullable<StyleProps['boxShadow']> | null {
  if (typeof input !== 'string') return null;
  const s = input.trim();
  if (!s || s === 'none') return null;
  const first = s.split(',')[0]?.trim();
  if (!first) return null;

  const parts = first.split(/\s+/g).filter(Boolean);
  if (parts.length < 5) return null;

  const offsetX = parseCssLengthToPx(parts[0]);
  const offsetY = parseCssLengthToPx(parts[1]);
  const blur = parseCssLengthToPx(parts[2]);
  const spread = parseCssLengthToPx(parts[3]);
  if (offsetX === null || offsetY === null || blur === null || spread === null) return null;

  const colorRaw = parts.slice(4).join(' ');
  const color = cssToYogaColor(colorRaw, vars);
  if (!color) return null;

  return { offsetX, offsetY, blur, spread, color };
}

function cssObjectToYogaStyle(css: Record<string, unknown>): Partial<StyleProps> {
  const vars: Record<string, string> = {};
  for (const [k, v] of Object.entries(css)) {
    if (k.startsWith('--') && typeof v === 'string') vars[k] = v;
  }

  const style: Partial<StyleProps> = {};

  const setFlex = (key: keyof StyleProps, v: unknown) => {
    const fv = parseCssFlexValue(v);
    if (fv !== undefined) (style as Record<string, unknown>)[key as string] = fv;
  };
  const setNum = (key: keyof StyleProps, v: unknown) => {
    const n = parseCssLengthToPx(v);
    if (n !== null) (style as Record<string, unknown>)[key as string] = n;
  };
  const setN = (key: keyof StyleProps, v: unknown) => {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
    if (Number.isFinite(n)) (style as Record<string, unknown>)[key as string] = n;
  };

  for (const [k, v] of Object.entries(css)) {
    if (k.startsWith('--')) continue;

    if (k === 'width') setFlex('width', v);
    else if (k === 'height') setFlex('height', v);
    else if (k === 'minWidth') setFlex('minWidth', v);
    else if (k === 'minHeight') setFlex('minHeight', v);
    else if (k === 'maxWidth') setFlex('maxWidth', v);
    else if (k === 'maxHeight') setFlex('maxHeight', v);
    else if (k === 'top') setFlex('top', v);
    else if (k === 'right') setFlex('right', v);
    else if (k === 'bottom') setFlex('bottom', v);
    else if (k === 'left') setFlex('left', v);
    else if (k === 'padding') setFlex('padding', v);
    else if (k === 'paddingTop') setFlex('paddingTop', v);
    else if (k === 'paddingRight') setFlex('paddingRight', v);
    else if (k === 'paddingBottom') setFlex('paddingBottom', v);
    else if (k === 'paddingLeft') setFlex('paddingLeft', v);
    else if (k === 'margin') setFlex('margin', v);
    else if (k === 'marginTop') setFlex('marginTop', v);
    else if (k === 'marginRight') setFlex('marginRight', v);
    else if (k === 'marginBottom') setFlex('marginBottom', v);
    else if (k === 'marginLeft') setFlex('marginLeft', v);
    else if (k === 'gap') setFlex('gap', v);
    else if (k === 'rowGap') setFlex('rowGap', v);
    else if (k === 'columnGap') setFlex('columnGap', v);
    else if (k === 'backgroundColor') {
      const c = cssToYogaColor(v, vars);
      if (c) style.backgroundColor = c;
    } else if (k === 'borderColor') {
      const c = cssToYogaColor(v, vars);
      if (c) style.borderColor = c;
    } else if (k === 'color') {
      const c = cssToYogaColor(v, vars);
      if (c) style.color = c;
    } else if (k === 'borderWidth') setNum('borderWidth', v);
    else if (k === 'borderRadius') setNum('borderRadius', v);
    else if (k === 'fontSize') setNum('fontSize', v);
    else if (k === 'lineHeight') setNum('lineHeight', v);
    else if (k === 'opacity') {
      const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
      if (Number.isFinite(n)) style.opacity = Math.max(0, Math.min(1, n));
    } else if (k === 'zIndex') setN('zIndex', v);
    else if (k === 'boxShadow') {
      const parsed = parseBoxShadow(v, vars);
      if (parsed) style.boxShadow = parsed;
    } else if (k === 'fontWeight') {
      if (typeof v === 'number') style.fontWeight = v;
      else if (typeof v === 'string') {
        const n = Number(v);
        style.fontWeight = Number.isFinite(n) ? n : (v as StyleProps['fontWeight']);
      }
    } else if (k === 'fontStyle' && typeof v === 'string') style.fontStyle = v as StyleProps['fontStyle'];
    else if (k === 'fontFamily' && typeof v === 'string') style.fontFamily = v;
    else if (k === 'textAlign' && typeof v === 'string') style.textAlign = v as StyleProps['textAlign'];
    else if (k === 'whiteSpace' && typeof v === 'string') style.whiteSpace = v as StyleProps['whiteSpace'];
    else if (k === 'flexDirection' && typeof v === 'string') style.flexDirection = v as StyleProps['flexDirection'];
    else if (k === 'justifyContent' && typeof v === 'string') style.justifyContent = v as StyleProps['justifyContent'];
    else if (k === 'alignItems' && typeof v === 'string') style.alignItems = v as StyleProps['alignItems'];
    else if (k === 'alignSelf' && typeof v === 'string') style.alignSelf = v as StyleProps['alignSelf'];
    else if (k === 'flexWrap' && typeof v === 'string') style.flexWrap = v as StyleProps['flexWrap'];
    else if (k === 'overflow' && typeof v === 'string') {
      if (v === 'visible' || v === 'hidden') style.overflow = v;
    }
    else if (k === 'position' && typeof v === 'string') style.position = v as StyleProps['position'];
    else if (k === 'flex') setN('flex', v);
    else if (k === 'flexGrow') setN('flexGrow', v);
    else if (k === 'flexShrink') setN('flexShrink', v);
    else if (k === 'flexBasis') setFlex('flexBasis', v);
  }

  return style;
}

function tryConvertTokenStyle(token: string): Record<string, unknown> | null {
  if (TOKEN_STYLE_CACHE.has(token)) return TOKEN_STYLE_CACHE.get(token) ?? null;
  try {
    const css = twj(token) as unknown;
    if (!css || typeof css !== 'object') {
      TOKEN_STYLE_CACHE.set(token, null);
      return null;
    }
    const record = css as Record<string, unknown>;
    const meaningfulKeys = Object.keys(record).filter((k) => !k.startsWith('--'));
    const ok = meaningfulKeys.length > 0;
    TOKEN_STYLE_CACHE.set(token, ok ? record : null);
    return ok ? record : null;
  } catch {
    TOKEN_STYLE_CACHE.set(token, null);
    return null;
  }
}

export function tailwindToStyleProps(className: string | undefined | null): ParseResult {
  const style: Partial<StyleProps> = {};
  const unsupported: string[] = [];
  const tokens = splitTokens(className ?? '');

  const twTokens: string[] = [];
  for (const token of tokens) {
    const ycStyle = tryParseYcStyleToken(token);
    if (ycStyle) {
      Object.assign(style, ycStyle);
      continue;
    }

    if (token.includes(':')) {
      unsupported.push(token);
      continue;
    }

    const normalized = normalizeToken(token);
    twTokens.push(normalized);
    if (!tryConvertTokenStyle(normalized)) unsupported.push(token);
  }

  if (twTokens.length) {
    try {
      const css = twj(twTokens.join(' ')) as unknown;
      if (css && typeof css === 'object') {
        Object.assign(style, cssObjectToYogaStyle(css as Record<string, unknown>));
      }
    } catch {
      unsupported.push(...twTokens);
    }
  }

  return { style, unsupported };
}
