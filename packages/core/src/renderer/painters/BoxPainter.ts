import type { CanvasNode, CanvasContextLike } from '../../types';

export function drawBox(ctx: CanvasContextLike, node: CanvasNode): void {
  const { left, top, width, height } = node.computedLayout;
  const { backgroundColor, linearGradient, borderColor, borderWidth, borderRadius, boxShadow } = node.visualStyle;

  const effectiveBoxShadow = node.type === 'text' ? null : boxShadow;
  if (effectiveBoxShadow) {
    const spread = effectiveBoxShadow.spread ?? 0;
    ctx.save();
    ctx.setFillStyle('rgba(0,0,0,0)');
    ctx.setShadow(effectiveBoxShadow.color, effectiveBoxShadow.blur, effectiveBoxShadow.offsetX, effectiveBoxShadow.offsetY);
    const shadowLeft = left - spread;
    const shadowTop = top - spread;
    const shadowWidth = width + spread * 2;
    const shadowHeight = height + spread * 2;
    if (borderRadius > 0) {
      drawRoundedRect(ctx, shadowLeft, shadowTop, shadowWidth, shadowHeight, borderRadius + spread);
      ctx.fill();
    } else {
      ctx.fillRect(shadowLeft, shadowTop, shadowWidth, shadowHeight);
    }
    ctx.restore();
  }

  // Draw background
  const effectiveGradient = node.type === 'text' ? null : linearGradient;
  if ((backgroundColor && backgroundColor !== 'transparent') || effectiveGradient) {
    const fillStyle = effectiveGradient
      ? buildGradient(ctx, left, top, width, height, effectiveGradient)
      : backgroundColor;
    if (!fillStyle) return;
    ctx.setFillStyle(fillStyle);
    if (borderRadius > 0) {
      drawRoundedRect(ctx, left, top, width, height, borderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(left, top, width, height);
    }
  }

  // Draw border
  if (borderWidth > 0 && borderColor && borderColor !== 'transparent') {
    ctx.setStrokeStyle(borderColor);
    ctx.setLineWidth(borderWidth);
    if (borderRadius > 0) {
      drawRoundedRect(ctx, left, top, width, height, borderRadius);
      ctx.stroke();
    } else {
      ctx.strokeRect(left, top, width, height);
    }
  }
}

export function buildGradient(
  ctx: CanvasContextLike,
  left: number,
  top: number,
  width: number,
  height: number,
  input: NonNullable<CanvasNode['visualStyle']['linearGradient']>,
): ReturnType<CanvasContextLike['createLinearGradient']> | ReturnType<CanvasContextLike['createRadialGradient']> | null {
  const grad = typeof input === 'string' ? parseCSSGradient(input) : input;
  if (!grad || typeof grad === 'string') return null;
  if (isRadialGradient(grad)) {
    return buildRadialGradient(ctx, left, top, width, height, grad);
  }
  return buildLinearGradient(ctx, left, top, width, height, grad);
}

function isRadialGradient(
  grad: Exclude<NonNullable<CanvasNode['visualStyle']['linearGradient']>, string>,
): grad is Extract<Exclude<NonNullable<CanvasNode['visualStyle']['linearGradient']>, string>, { type: 'radial' }> {
  return (grad as { type?: string }).type === 'radial';
}

function buildLinearGradient(
  ctx: CanvasContextLike,
  left: number,
  top: number,
  width: number,
  height: number,
  gradient: Exclude<NonNullable<CanvasNode['visualStyle']['linearGradient']>, string>,
): ReturnType<CanvasContextLike['createLinearGradient']> | null {
  const colors = (gradient as { colors?: Array<{ offset: number; color: string }> }).colors ?? [];
  if (colors.length === 0) return null;

  const angle = (gradient as { angle?: number }).angle;
  const start = (gradient as { start?: { x: number; y: number } }).start ?? { x: 0, y: 0 };
  const end = (gradient as { end?: { x: number; y: number } }).end ?? { x: 1, y: 0 };

  const p = angle === undefined || !Number.isFinite(angle)
    ? {
        x0: left + start.x * width,
        y0: top + start.y * height,
        x1: left + end.x * width,
        y1: top + end.y * height,
      }
    : computeLinearGradientEndpoints(left, top, width, height, angle);

  const canvasGradient = ctx.createLinearGradient(p.x0, p.y0, p.x1, p.y1);
  for (const stop of normalizeStops(colors)) {
    canvasGradient.addColorStop(stop.offset, stop.color);
  }
  return canvasGradient;
}

function buildRadialGradient(
  ctx: CanvasContextLike,
  left: number,
  top: number,
  width: number,
  height: number,
  gradient: Extract<Exclude<NonNullable<CanvasNode['visualStyle']['linearGradient']>, string>, { type: 'radial' }>,
): ReturnType<CanvasContextLike['createRadialGradient']> | null {
  const colors = (gradient as { colors?: Array<{ offset: number; color: string }> }).colors ?? [];
  if (colors.length === 0) return null;
  const center = (gradient as { center?: { x: number; y: number } }).center ?? { x: 0.5, y: 0.5 };
  const r = (gradient as { radius?: number }).radius;
  const radiusPx = typeof r === 'number' && Number.isFinite(r)
    ? (r <= 1 ? r * Math.max(width, height) : r)
    : Math.max(width, height) / 2;
  const cx = left + center.x * width;
  const cy = top + center.y * height;
  const canvasGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radiusPx);
  for (const stop of normalizeStops(colors)) {
    canvasGradient.addColorStop(stop.offset, stop.color);
  }
  return canvasGradient;
}

function normalizeStops(stops: Array<{ offset: number; color: string }>): Array<{ offset: number; color: string }> {
  if (stops.length === 0) return [];
  const out = stops
    .map((s) => ({
      color: s.color,
      offset: Number.isFinite(s.offset) ? clamp01(s.offset) : Number.NaN,
    }))
    .sort((a, b) => {
      if (Number.isNaN(a.offset) && Number.isNaN(b.offset)) return 0;
      if (Number.isNaN(a.offset)) return 1;
      if (Number.isNaN(b.offset)) return -1;
      return a.offset - b.offset;
    });

  if (out.every((s) => Number.isNaN(s.offset))) {
    const n = out.length;
    return out.map((s, i) => ({ ...s, offset: n === 1 ? 0 : i / (n - 1) }));
  }

  if (Number.isNaN(out[0]!.offset)) out[0]!.offset = 0;
  if (Number.isNaN(out[out.length - 1]!.offset)) out[out.length - 1]!.offset = 1;

  let lastDefined = 0;
  for (let i = 1; i < out.length; i += 1) {
    if (!Number.isNaN(out[i]!.offset)) {
      const start = out[lastDefined]!.offset;
      const end = out[i]!.offset;
      const span = i - lastDefined;
      for (let j = 1; j < span; j += 1) {
        if (Number.isNaN(out[lastDefined + j]!.offset)) {
          out[lastDefined + j]!.offset = start + ((end - start) * j) / span;
        }
      }
      lastDefined = i;
    }
  }

  return out.map((s) => ({ ...s, offset: clamp01(s.offset) }));
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function computeLinearGradientEndpoints(
  left: number,
  top: number,
  width: number,
  height: number,
  angleDeg: number,
): { x0: number; y0: number; x1: number; y1: number } {
  const rad = ((angleDeg % 360) * Math.PI) / 180;
  const vx = Math.sin(rad);
  const vy = -Math.cos(rad);

  const cx = left + width / 2;
  const cy = top + height / 2;

  const points: Array<{ x: number; y: number; t: number }> = [];

  const pushIfValid = (t: number) => {
    if (!Number.isFinite(t)) return;
    const x = cx + t * vx;
    const y = cy + t * vy;
    if (x >= left - 1e-6 && x <= left + width + 1e-6 && y >= top - 1e-6 && y <= top + height + 1e-6) {
      points.push({ x, y, t });
    }
  };

  if (vx !== 0) {
    pushIfValid((left - cx) / vx);
    pushIfValid((left + width - cx) / vx);
  }
  if (vy !== 0) {
    pushIfValid((top - cy) / vy);
    pushIfValid((top + height - cy) / vy);
  }

  if (points.length < 2) {
    return { x0: left, y0: top + height / 2, x1: left + width, y1: top + height / 2 };
  }

  points.sort((a, b) => a.t - b.t);
  const a = points[0]!;
  const b = points[points.length - 1]!;
  return { x0: a.x, y0: a.y, x1: b.x, y1: b.y };
}

function parseCSSGradient(input: string): Exclude<NonNullable<CanvasNode['visualStyle']['linearGradient']>, string> | null {
  const s = input.trim();
  const open = s.indexOf('(');
  const close = s.lastIndexOf(')');
  if (open <= 0 || close <= open) return null;
  const fn = s.slice(0, open).trim();
  const body = s.slice(open + 1, close).trim();
  const parts = splitTopLevel(body, ',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  if (fn === 'linear-gradient') {
    return parseLinearGradientParts(parts);
  }
  if (fn === 'radial-gradient') {
    return parseRadialGradientParts(parts);
  }
  return null;
}

function parseLinearGradientParts(
  parts: string[],
): Exclude<NonNullable<CanvasNode['visualStyle']['linearGradient']>, string> | null {
  let i = 0;
  let angle: number | undefined;
  const first = parts[0]!;
  const maybeAngle = parseAngle(first);
  if (maybeAngle !== null) {
    angle = maybeAngle;
    i = 1;
  } else if (first.startsWith('to ')) {
    angle = directionToAngle(first);
    i = 1;
  }

  const stops = parts.slice(i).map(parseColorStop).filter((x): x is { color: string; offset?: number } => !!x);
  if (stops.length === 0) return null;
  const norm = normalizeStops(
    stops.map((s) => ({
      color: s.color,
      offset: s.offset ?? Number.NaN,
    })),
  );
  return {
    type: 'linear',
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
    colors: norm,
    ...(angle === undefined ? null : { angle }),
  } as Exclude<NonNullable<CanvasNode['visualStyle']['linearGradient']>, string>;
}

function parseRadialGradientParts(
  parts: string[],
): Exclude<NonNullable<CanvasNode['visualStyle']['linearGradient']>, string> | null {
  let i = 0;
  let center: { x: number; y: number } | undefined;
  const first = parts[0]!;
  if (first.includes('at ')) {
    const m = first.split(/\bat\s+/);
    const at = m[1]?.trim();
    if (at) {
      center = parsePositionPair(at);
      i = 1;
    }
  } else if (first === 'circle' || first === 'ellipse') {
    i = 1;
  }

  const stops = parts.slice(i).map(parseColorStop).filter((x): x is { color: string; offset?: number } => !!x);
  if (stops.length === 0) return null;
  const norm = normalizeStops(
    stops.map((s) => ({
      color: s.color,
      offset: s.offset ?? Number.NaN,
    })),
  );
  return {
    type: 'radial',
    center: center ?? { x: 0.5, y: 0.5 },
    colors: norm,
  } as Exclude<NonNullable<CanvasNode['visualStyle']['linearGradient']>, string>;
}

function parseAngle(token: string): number | null {
  const t = token.trim().toLowerCase();
  const m = /^(-?\d+(?:\.\d+)?)deg$/.exec(t);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return n;
}

function directionToAngle(dir: string): number {
  const t = dir.trim().toLowerCase();
  if (t === 'to top') return 0;
  if (t === 'to right') return 90;
  if (t === 'to bottom') return 180;
  if (t === 'to left') return 270;
  if (t === 'to top right' || t === 'to right top') return 45;
  if (t === 'to bottom right' || t === 'to right bottom') return 135;
  if (t === 'to bottom left' || t === 'to left bottom') return 225;
  if (t === 'to top left' || t === 'to left top') return 315;
  return 90;
}

function parseColorStop(token: string): { color: string; offset?: number } | null {
  const t = token.trim();
  if (!t) return null;
  const m = /(.+?)\s+(-?\d+(?:\.\d+)?%)(?:\s+.*)?$/.exec(t);
  if (m) {
    const color = m[1]!.trim();
    const pct = Number.parseFloat(m[2]!);
    if (Number.isFinite(pct)) return { color, offset: pct / 100 };
    return { color };
  }
  return { color: t };
}

function parsePositionPair(token: string): { x: number; y: number } | undefined {
  const parts = token.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return undefined;

  const parsePos = (p: string, axis: 'x' | 'y'): number | undefined => {
    if (p.endsWith('%')) {
      const n = Number.parseFloat(p.slice(0, -1));
      if (Number.isFinite(n)) return clamp01(n / 100);
      return undefined;
    }
    if (p === 'center') return 0.5;
    if (axis === 'x') {
      if (p === 'left') return 0;
      if (p === 'right') return 1;
    } else {
      if (p === 'top') return 0;
      if (p === 'bottom') return 1;
    }
    return undefined;
  };

  const x = parsePos(parts[0]!, 'x');
  const y = parts.length > 1 ? parsePos(parts[1]!, 'y') : undefined;
  if (x === undefined && y === undefined) return undefined;
  return { x: x ?? 0.5, y: y ?? 0.5 };
}

function splitTopLevel(input: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]!;
    if (ch === '(') depth += 1;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && ch === sep) {
      out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current) out.push(current);
  return out;
}

export function drawRoundedRect(
  ctx: CanvasContextLike,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
