import type { CanvasNode, NodeTree } from '../../types';

export function buildJSXFromTree(tree: NodeTree, mode: 'style' | 'className'): string {
  const root = tree.nodes[tree.rootId];
  if (!root) return '';
  const referencedIds = collectReferencedIdsFromTree(tree);
  return renderJSXNode(tree, root.id, 0, mode, referencedIds);
}

export function formatHTMLString(input: string): string {
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

function renderJSXNode(
  tree: NodeTree,
  nodeId: string,
  depth: number,
  mode: 'style' | 'className',
  referencedIds: Set<string>,
): string {
  const node = tree.nodes[nodeId];
  if (!node) return '';

  const indent = '  '.repeat(depth);
  const tag = toJSXTag(node.type);

  const props = buildJSXProps(node, mode, referencedIds);
  const propsString = props.length ? ` ${props.join(' ')}` : '';

  if (node.type === 'image') {
    return `${indent}<${tag}${propsString} />`;
  }

  if (node.type === 'text') {
    const content = node.textProps?.content ?? '';
    return `${indent}<${tag}${propsString}>{${JSON.stringify(content)}}</${tag}>`;
  }

  const children = node.children
    .map((childId) => renderJSXNode(tree, childId, depth + 1, mode, referencedIds))
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

function buildJSXProps(node: CanvasNode, mode: 'style' | 'className', referencedIds: Set<string>): string[] {
  const props: string[] = [];

  if (shouldShowId(node, referencedIds)) props.push(`id=${JSON.stringify(node.id)}`);
  if (node.name) props.push(`name=${JSON.stringify(node.name)}`);

  const style = stripDefaultStyleForExport(node, buildCombinedStyle(node));
  const { className, restStyle } = styleToTailwind(style);
  if (mode === 'style') {
    if (Object.keys(style).length) props.push(`style={${JSON.stringify(style, null, 2)}}`);
  } else {
    if (className) props.push(`className=${JSON.stringify(className)}`);
    if (Object.keys(restStyle).length) props.push(`style={${JSON.stringify(restStyle, null, 2)}}`);
  }

  if (node.motion && typeof node.motion === 'object' && Object.keys(node.motion).length) {
    props.push(`motion={${JSON.stringify(node.motion, null, 2)}}`);
  }

  const sanitizedEvents = sanitizeEventsForCodegen(node.events);
  if (sanitizedEvents && typeof sanitizedEvents === 'object' && Object.keys(sanitizedEvents).length) {
    props.push(`events={${JSON.stringify(sanitizedEvents, null, 2)}}`);
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

function collectReferencedIdsFromTree(tree: NodeTree): Set<string> {
  const out = new Set<string>();
  for (const node of Object.values(tree.nodes)) {
    const events = (node as unknown as { events?: unknown }).events;
    if (!events || typeof events !== 'object') continue;
    for (const actionsRaw of Object.values(events as Record<string, unknown>)) {
      if (!Array.isArray(actionsRaw)) continue;
      for (const a of actionsRaw) {
        if (!a || typeof a !== 'object') continue;
        const target = (a as { target?: { id?: unknown } }).target;
        const id = target?.id;
        if (typeof id === 'string' && id.trim()) out.add(id);
      }
    }
  }
  return out;
}

function sanitizeEventsForCodegen(events: unknown): unknown {
  if (!events || typeof events !== 'object') return null;
  const out: Record<string, unknown> = {};
  for (const [type, actionsRaw] of Object.entries(events as Record<string, unknown>)) {
    if (!Array.isArray(actionsRaw)) continue;
    const nextActions = actionsRaw
      .filter((a) => a && typeof a === 'object')
      .map((a) => {
        const action = a as Record<string, unknown>;
        if (action.type === 'playMotion' && 'options' in action) {
          const { options: _options, ...rest } = action;
          return rest;
        }
        return action;
      })
      .filter(Boolean);
    if (nextActions.length === 0) continue;
    out[type] = nextActions;
  }
  return Object.keys(out).length ? out : null;
}

function shouldShowId(node: CanvasNode, referencedIds: Set<string>): boolean {
  const hasEvents =
    !!node.events && typeof node.events === 'object' && Object.keys(node.events).length > 0;
  const isReferenced = referencedIds.has(node.id);
  const isCustom = typeof node.id === 'string' && !node.id.startsWith('yoga_');
  return isCustom || hasEvents || isReferenced;
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

function stripDefaultStyleForExport(node: CanvasNode, style: Record<string, unknown>): Record<string, unknown> {
  const DEFAULT_VISUAL: Record<string, unknown> = {
    backgroundColor: 'transparent',
    linearGradient: null,
    borderColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    opacity: 1,
    translateX: 0,
    translateY: 0,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
    boxShadow: null,
    zIndex: 0,
  };
  const DEFAULT_TEXT: Record<string, unknown> = {
    fontSize: 14,
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontFamily: 'sans-serif',
    color: '#000000',
    lineHeight: 1.4,
    textAlign: 'left',
    whiteSpace: 'normal',
    lineClamp: undefined,
    textShadow: null,
  };

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(style)) {
    if (k in DEFAULT_VISUAL && Object.is(v, DEFAULT_VISUAL[k])) continue;
    if (node.type === 'text' && k in DEFAULT_TEXT && Object.is(v, DEFAULT_TEXT[k])) continue;
    out[k] = v;
  }
  return out;
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

  const flex = style.flex;
  if (typeof flex === 'number' && Number.isFinite(flex)) {
    if (flex === 1) add('flex-1', ['flex']);
    else add(`flex-[${flex}]`, ['flex']);
  }

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

  const boxShadow = style.boxShadow;
  if (boxShadow && typeof boxShadow === 'object') {
    const b = boxShadow as Record<string, unknown>;
    const color = b.color;
    const blur = b.blur;
    const offsetX = b.offsetX;
    const offsetY = b.offsetY;
    const spread = b.spread ?? 0;
    if (
      typeof color === 'string' &&
      typeof blur === 'number' &&
      typeof offsetX === 'number' &&
      typeof offsetY === 'number' &&
      typeof spread === 'number' &&
      [blur, offsetX, offsetY, spread].every((n) => Number.isFinite(n))
    ) {
      const css = `${offsetX}px ${offsetY}px ${blur}px ${spread}px ${color}`;
      add(`shadow-[${escapeArbitrary(css)}]`, ['boxShadow']);
    }
  }

  const textShadow = style.textShadow;
  if (textShadow && typeof textShadow === 'object') {
    const t = textShadow as Record<string, unknown>;
    const color = t.color;
    const blur = t.blur;
    const offsetX = t.offsetX;
    const offsetY = t.offsetY;
    if (
      typeof color === 'string' &&
      typeof blur === 'number' &&
      typeof offsetX === 'number' &&
      typeof offsetY === 'number' &&
      [blur, offsetX, offsetY].every((n) => Number.isFinite(n))
    ) {
      const css = `${offsetX}px ${offsetY}px ${blur}px ${color}`;
      add(`[text-shadow:${escapeArbitrary(css)}]`, ['textShadow']);
    }
  }

  const opacity = style.opacity;
  if (typeof opacity === 'number' && opacity !== 1) add(`opacity-[${opacity}]`, ['opacity']);
  const translateX = (style as Record<string, unknown>).translateX;
  if (typeof translateX === 'number' && translateX !== 0) add(`translate-x-[${translateX}px]`, ['translateX']);
  const translateY = (style as Record<string, unknown>).translateY;
  if (typeof translateY === 'number' && translateY !== 0) add(`translate-y-[${translateY}px]`, ['translateY']);
  const scaleX = (style as Record<string, unknown>).scaleX;
  if (typeof scaleX === 'number' && scaleX !== 1) add(`scale-x-[${scaleX}]`, ['scaleX']);
  const scaleY = (style as Record<string, unknown>).scaleY;
  if (typeof scaleY === 'number' && scaleY !== 1) add(`scale-y-[${scaleY}]`, ['scaleY']);
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
