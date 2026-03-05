export type TextMeasureContext = {
  measureText(text: string): { width: number };
};

export function normalizeLineClamp(lineClamp: number | undefined): number | null {
  if (lineClamp === undefined) return null;
  const n = Math.floor(lineClamp);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function wrapText(ctx: TextMeasureContext, text: string, maxWidth: number): string[] {
  const EPS = 0.01;
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      lines.push('');
      continue;
    }

    const words = paragraph.split(' ');
    let current = '';

    for (const word of words) {
      if (word === '') continue;

      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth + EPS && current) {
        lines.push(current);
        current = '';
      }

      if (ctx.measureText(word).width > maxWidth + EPS) {
        if (current) {
          lines.push(current);
          current = '';
        }

        let chunk = '';
        for (const ch of word) {
          const nextChunk = chunk + ch;
          if (ctx.measureText(nextChunk).width > maxWidth + EPS && chunk) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk = nextChunk;
          }
        }
        current = chunk;
      } else {
        current = current ? `${current} ${word}` : word;
      }
    }

    if (current) {
      lines.push(current);
    }
  }

  return lines;
}

export function ellipsizeToWidth(ctx: TextMeasureContext, text: string, maxWidth: number): string {
  const ellipsis = '…';
  if (maxWidth <= 0) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;
  if (ctx.measureText(ellipsis).width > maxWidth) return '';

  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    const slice = text.slice(0, mid);
    if (ctx.measureText(slice + ellipsis).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  const slice = text.slice(0, lo);
  return slice ? slice + ellipsis : ellipsis;
}

export function buildClampedLastLineText(lines: string[], startIndex: number, joiner: string): string {
  let result = lines[startIndex] ?? '';
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const next = lines[i];
    if (!next) continue;
    if (!result) {
      result = next;
      continue;
    }
    if (joiner === ' ') {
      result = `${result.trimEnd()} ${next.trimStart()}`;
    } else {
      result += next;
    }
  }
  return result;
}

export function clampWrappedLines(
  ctx: TextMeasureContext,
  lines: string[],
  lineClamp: number,
  maxWidth: number,
  joiner: string,
): string[] {
  if (lines.length <= lineClamp) return lines;
  if (lineClamp <= 0) return [];
  return [
    ...lines.slice(0, lineClamp - 1),
    ellipsizeToWidth(ctx, buildClampedLastLineText(lines, lineClamp - 1, joiner), maxWidth),
  ];
}
