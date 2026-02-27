import type { StyleProps, FlexValue } from '@yoga-canvas/core';

type ParseResult = {
  style: Partial<StyleProps>;
  unsupported: string[];
};

const SPACE_SCALE_PX: Record<string, number> = {
  px: 1,
  0: 0,
  '0.5': 2,
  1: 4,
  '1.5': 6,
  2: 8,
  '2.5': 10,
  3: 12,
  '3.5': 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,
};

const FONT_SIZE_PX: Record<string, number> = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  '7xl': 72,
  '8xl': 96,
  '9xl': 128,
};

const FONT_WEIGHT: Record<string, number> = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

const LINE_HEIGHT: Record<string, number> = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
};

const RADIUS_PX: Record<string, number> = {
  none: 0,
  sm: 2,
  DEFAULT: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
};

const SHADOW_PRESETS: Record<string, NonNullable<StyleProps['boxShadow']>> = {
  sm: { offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: 'rgba(0,0,0,0.05)' },
  DEFAULT: { offsetX: 0, offsetY: 1, blur: 3, spread: 0, color: 'rgba(0,0,0,0.1)' },
  md: { offsetX: 0, offsetY: 4, blur: 6, spread: -1, color: 'rgba(0,0,0,0.1)' },
  lg: { offsetX: 0, offsetY: 10, blur: 15, spread: -3, color: 'rgba(0,0,0,0.1)' },
  xl: { offsetX: 0, offsetY: 20, blur: 25, spread: -5, color: 'rgba(0,0,0,0.1)' },
  '2xl': { offsetX: 0, offsetY: 25, blur: 50, spread: -12, color: 'rgba(0,0,0,0.25)' },
};

function parseBracketValue(token: string): string | null {
  const m = token.match(/^\[(.*)\]$/);
  return m ? m[1] : null;
}

function parseFlexValue(raw: string): FlexValue | undefined {
  if (raw === 'auto') return 'auto';
  if (raw === 'full') return '100%';
  if (raw === 'screen') return '100%';

  const frac = raw.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const a = Number(frac[1]);
    const b = Number(frac[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return undefined;
    const pct = (a / b) * 100;
    return `${pct}%`;
  }

  const bracket = parseBracketValue(raw);
  if (bracket) {
    const v = bracket.trim();
    const px = v.match(/^(-?\d+(\.\d+)?)px$/);
    if (px) return Number(px[1]);
    const pct = v.match(/^(-?\d+(\.\d+)?)%$/);
    if (pct) return `${Number(pct[1])}%`;
    const num = v.match(/^-?\d+(\.\d+)?$/);
    if (num) return Number(v);
    return undefined;
  }

  const asNum = Number(raw);
  if (Number.isFinite(asNum) && raw !== '') return asNum;
  return undefined;
}

function parseSpacingPx(raw: string): number | null {
  if (raw in SPACE_SCALE_PX) return SPACE_SCALE_PX[raw]!;
  const bracket = parseBracketValue(raw);
  if (bracket) {
    const v = bracket.trim();
    const px = v.match(/^(-?\d+(\.\d+)?)px$/);
    if (px) return Number(px[1]);
    const num = v.match(/^-?\d+(\.\d+)?$/);
    if (num) return Number(v);
    return null;
  }
  return null;
}

function parseColorValue(raw: string): string | null {
  if (raw === 'transparent') return 'transparent';
  if (raw === 'black') return '#000000';
  if (raw === 'white') return '#ffffff';
  const bracket = parseBracketValue(raw);
  if (!bracket) return null;
  const v = bracket.trim();
  if (!v) return null;
  return v;
}

function splitTokens(input: string): string[] {
  return input
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter(Boolean);
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
  const decoded = decodeBase64UrlToUtf8(bracket.trim());
  const parsed = JSON.parse(decoded) as unknown;
  if (!parsed || typeof parsed !== 'object') return null;
  return parsed as Partial<StyleProps>;
}

function applyInset(style: Partial<StyleProps>, axis: 'all' | 'x' | 'y', value: FlexValue) {
  if (axis === 'all' || axis === 'x') {
    style.left = value;
    style.right = value;
  }
  if (axis === 'all' || axis === 'y') {
    style.top = value;
    style.bottom = value;
  }
}

export function tailwindToStyleProps(className: string | undefined | null): ParseResult {
  const style: Partial<StyleProps> = {};
  const unsupported: string[] = [];
  const tokens = splitTokens(className ?? '');

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

    if (token === 'flex-row') {
      style.flexDirection = 'row';
      continue;
    }
    if (token === 'flex-col') {
      style.flexDirection = 'column';
      continue;
    }
    if (token === 'flex-row-reverse') {
      style.flexDirection = 'row-reverse';
      continue;
    }
    if (token === 'flex-col-reverse') {
      style.flexDirection = 'column-reverse';
      continue;
    }

    if (token === 'flex-wrap') {
      style.flexWrap = 'wrap';
      continue;
    }
    if (token === 'flex-nowrap') {
      style.flexWrap = 'nowrap';
      continue;
    }

    if (token === 'flex-1') {
      style.flex = 1;
      continue;
    }
    if (token === 'flex-none') {
      style.flexGrow = 0;
      style.flexShrink = 0;
      style.flexBasis = 'auto';
      style.flex = undefined;
      continue;
    }
    if (token === 'flex-auto') {
      style.flexGrow = 1;
      style.flexShrink = 1;
      style.flexBasis = 'auto';
      style.flex = undefined;
      continue;
    }

    if (token === 'grow') {
      style.flexGrow = 1;
      continue;
    }
    if (token === 'grow-0') {
      style.flexGrow = 0;
      continue;
    }
    if (token === 'shrink') {
      style.flexShrink = 1;
      continue;
    }
    if (token === 'shrink-0') {
      style.flexShrink = 0;
      continue;
    }

    if (token === 'justify-start') {
      style.justifyContent = 'flex-start';
      continue;
    }
    if (token === 'justify-center') {
      style.justifyContent = 'center';
      continue;
    }
    if (token === 'justify-end') {
      style.justifyContent = 'flex-end';
      continue;
    }
    if (token === 'justify-between') {
      style.justifyContent = 'space-between';
      continue;
    }
    if (token === 'justify-around') {
      style.justifyContent = 'space-around';
      continue;
    }
    if (token === 'justify-evenly') {
      style.justifyContent = 'space-evenly';
      continue;
    }

    if (token === 'items-start') {
      style.alignItems = 'flex-start';
      continue;
    }
    if (token === 'items-center') {
      style.alignItems = 'center';
      continue;
    }
    if (token === 'items-end') {
      style.alignItems = 'flex-end';
      continue;
    }
    if (token === 'items-stretch') {
      style.alignItems = 'stretch';
      continue;
    }

    if (token === 'self-auto') {
      style.alignSelf = 'auto';
      continue;
    }
    if (token === 'self-start') {
      style.alignSelf = 'flex-start';
      continue;
    }
    if (token === 'self-center') {
      style.alignSelf = 'center';
      continue;
    }
    if (token === 'self-end') {
      style.alignSelf = 'flex-end';
      continue;
    }
    if (token === 'self-stretch') {
      style.alignSelf = 'stretch';
      continue;
    }

    if (token === 'absolute') {
      style.position = 'absolute';
      continue;
    }
    if (token === 'relative') {
      style.position = 'relative';
      continue;
    }

    if (token === 'overflow-hidden') {
      style.overflow = 'hidden';
      continue;
    }
    if (token === 'overflow-visible') {
      style.overflow = 'visible';
      continue;
    }
    if (token === 'overflow-scroll') {
      style.overflow = 'scroll';
      continue;
    }

    if (token === 'text-left') {
      style.textAlign = 'left';
      continue;
    }
    if (token === 'text-center') {
      style.textAlign = 'center';
      continue;
    }
    if (token === 'text-right') {
      style.textAlign = 'right';
      continue;
    }

    if (token === 'whitespace-nowrap') {
      style.whiteSpace = 'nowrap';
      continue;
    }
    if (token === 'whitespace-normal') {
      style.whiteSpace = 'normal';
      continue;
    }

    if (token === 'italic') {
      style.fontStyle = 'italic';
      continue;
    }
    if (token === 'not-italic') {
      style.fontStyle = 'normal';
      continue;
    }

    if (token.startsWith('text-')) {
      const raw = token.slice('text-'.length);
      if (raw in FONT_SIZE_PX) {
        style.fontSize = FONT_SIZE_PX[raw]!;
        continue;
      }
      const color = parseColorValue(raw);
      if (color) {
        style.color = color;
        continue;
      }
      unsupported.push(token);
      continue;
    }

    if (token.startsWith('font-')) {
      const raw = token.slice('font-'.length).replace(/-/g, '');
      const w = FONT_WEIGHT[raw];
      if (w !== undefined) {
        style.fontWeight = w;
        continue;
      }
      unsupported.push(token);
      continue;
    }

    if (token.startsWith('leading-')) {
      const raw = token.slice('leading-'.length);
      if (raw in LINE_HEIGHT) {
        style.lineHeight = LINE_HEIGHT[raw]!;
        continue;
      }
      const bracket = parseBracketValue(raw);
      if (bracket) {
        const v = Number(bracket.trim());
        if (Number.isFinite(v)) {
          style.lineHeight = v;
          continue;
        }
      }
      unsupported.push(token);
      continue;
    }

    if (token.startsWith('w-')) {
      const raw = token.slice(2);
      const v = parseFlexValue(raw);
      if (v !== undefined) {
        style.width = v;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('h-')) {
      const raw = token.slice(2);
      const v = parseFlexValue(raw);
      if (v !== undefined) {
        style.height = v;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('min-w-')) {
      const raw = token.slice('min-w-'.length);
      const v = parseFlexValue(raw);
      if (v !== undefined) {
        style.minWidth = v;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('min-h-')) {
      const raw = token.slice('min-h-'.length);
      const v = parseFlexValue(raw);
      if (v !== undefined) {
        style.minHeight = v;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('max-w-')) {
      const raw = token.slice('max-w-'.length);
      const v = parseFlexValue(raw);
      if (v !== undefined) {
        style.maxWidth = v;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('max-h-')) {
      const raw = token.slice('max-h-'.length);
      const v = parseFlexValue(raw);
      if (v !== undefined) {
        style.maxHeight = v;
        continue;
      }
      unsupported.push(token);
      continue;
    }

    if (token.startsWith('p-')) {
      const raw = token.slice(2);
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.padding = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('px-')) {
      const raw = token.slice(3);
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.paddingLeft = px;
        style.paddingRight = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('py-')) {
      const raw = token.slice(3);
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.paddingTop = px;
        style.paddingBottom = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('pt-')) {
      const raw = token.slice(3);
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.paddingTop = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('pr-')) {
      const raw = token.slice(3);
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.paddingRight = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('pb-')) {
      const raw = token.slice(3);
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.paddingBottom = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('pl-')) {
      const raw = token.slice(3);
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.paddingLeft = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }

    if (token.startsWith('m-')) {
      const raw = token.slice(2);
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.margin = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('mx-')) {
      const raw = token.slice(3);
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.marginLeft = px;
        style.marginRight = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('my-')) {
      const raw = token.slice(3);
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.marginTop = px;
        style.marginBottom = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('mt-')) {
      const raw = token.slice(3);
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.marginTop = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('mr-')) {
      const raw = token.slice(3);
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.marginRight = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('mb-')) {
      const raw = token.slice(3);
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.marginBottom = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('ml-')) {
      const raw = token.slice(3);
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.marginLeft = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }

    if (token.startsWith('gap-')) {
      const raw = token.slice(4);
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.gap = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('gap-x-')) {
      const raw = token.slice('gap-x-'.length);
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.columnGap = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('gap-y-')) {
      const raw = token.slice('gap-y-'.length);
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.rowGap = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }

    if (token.startsWith('inset-')) {
      const raw = token.slice('inset-'.length);
      const v = parseFlexValue(raw);
      if (v !== undefined) {
        applyInset(style, 'all', v);
        continue;
      }
      const px = parseSpacingPx(raw);
      if (px !== null) {
        applyInset(style, 'all', px);
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('inset-x-')) {
      const raw = token.slice('inset-x-'.length);
      const v = parseFlexValue(raw);
      if (v !== undefined) {
        applyInset(style, 'x', v);
        continue;
      }
      const px = parseSpacingPx(raw);
      if (px !== null) {
        applyInset(style, 'x', px);
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('inset-y-')) {
      const raw = token.slice('inset-y-'.length);
      const v = parseFlexValue(raw);
      if (v !== undefined) {
        applyInset(style, 'y', v);
        continue;
      }
      const px = parseSpacingPx(raw);
      if (px !== null) {
        applyInset(style, 'y', px);
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('top-')) {
      const raw = token.slice(4);
      const v = parseFlexValue(raw);
      if (v !== undefined) {
        style.top = v;
        continue;
      }
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.top = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('right-')) {
      const raw = token.slice(6);
      const v = parseFlexValue(raw);
      if (v !== undefined) {
        style.right = v;
        continue;
      }
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.right = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('bottom-')) {
      const raw = token.slice(7);
      const v = parseFlexValue(raw);
      if (v !== undefined) {
        style.bottom = v;
        continue;
      }
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.bottom = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }
    if (token.startsWith('left-')) {
      const raw = token.slice(5);
      const v = parseFlexValue(raw);
      if (v !== undefined) {
        style.left = v;
        continue;
      }
      const px = parseSpacingPx(raw);
      if (px !== null) {
        style.left = px;
        continue;
      }
      unsupported.push(token);
      continue;
    }

    if (token.startsWith('bg-')) {
      const raw = token.slice(3);
      const color = parseColorValue(raw);
      if (color) {
        style.backgroundColor = color;
        continue;
      }
      unsupported.push(token);
      continue;
    }

    if (token === 'border') {
      style.borderWidth = 1;
      continue;
    }
    if (token.startsWith('border-')) {
      const raw = token.slice('border-'.length);
      const color = parseColorValue(raw);
      if (color) {
        style.borderColor = color;
        continue;
      }
      const bw = Number(raw);
      if (Number.isFinite(bw)) {
        style.borderWidth = bw;
        continue;
      }
      unsupported.push(token);
      continue;
    }

    if (token === 'rounded') {
      style.borderRadius = RADIUS_PX.DEFAULT;
      continue;
    }
    if (token.startsWith('rounded-')) {
      const raw = token.slice('rounded-'.length);
      const bracket = parseBracketValue(raw);
      if (bracket) {
        const v = bracket.trim();
        const px = v.match(/^(-?\d+(\.\d+)?)px$/);
        if (px) {
          style.borderRadius = Number(px[1]);
          continue;
        }
        const num = Number(v);
        if (Number.isFinite(num)) {
          style.borderRadius = num;
          continue;
        }
      }
      const r = RADIUS_PX[raw];
      if (r !== undefined) {
        style.borderRadius = r;
        continue;
      }
      unsupported.push(token);
      continue;
    }

    if (token.startsWith('opacity-')) {
      const raw = token.slice('opacity-'.length);
      const v = Number(raw);
      if (Number.isFinite(v)) {
        style.opacity = Math.max(0, Math.min(1, v / 100));
        continue;
      }
      unsupported.push(token);
      continue;
    }

    if (token.startsWith('rotate-')) {
      const raw = token.slice('rotate-'.length);
      const v = Number(raw);
      if (Number.isFinite(v)) {
        style.rotate = v;
        continue;
      }
      unsupported.push(token);
      continue;
    }

    if (token.startsWith('z-')) {
      const raw = token.slice(2);
      const bracket = parseBracketValue(raw);
      const v = Number((bracket ?? raw).trim());
      if (Number.isFinite(v)) {
        style.zIndex = v;
        continue;
      }
      unsupported.push(token);
      continue;
    }

    if (token === 'shadow') {
      style.boxShadow = SHADOW_PRESETS.DEFAULT;
      continue;
    }
    if (token === 'shadow-none') {
      style.boxShadow = null;
      continue;
    }
    if (token.startsWith('shadow-')) {
      const raw = token.slice('shadow-'.length);
      const preset = SHADOW_PRESETS[raw];
      if (preset) {
        style.boxShadow = preset;
        continue;
      }
      unsupported.push(token);
      continue;
    }

    unsupported.push(token);
  }

  return { style, unsupported };
}
