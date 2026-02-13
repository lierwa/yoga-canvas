import type { TextProps, FlexStyle } from '../types';

let measureDiv: HTMLDivElement | null = null;

function getMeasureDiv(): HTMLDivElement {
  if (!measureDiv) {
    measureDiv = document.createElement('div');
    measureDiv.style.position = 'absolute';
    measureDiv.style.visibility = 'hidden';
    measureDiv.style.pointerEvents = 'none';
    measureDiv.style.left = '-9999px';
    measureDiv.style.top = '-9999px';
    measureDiv.style.whiteSpace = 'pre-wrap';
    measureDiv.style.wordBreak = 'break-word';
    measureDiv.style.boxSizing = 'content-box';
    measureDiv.style.padding = '0';
    document.body.appendChild(measureDiv);
  }
  return measureDiv;
}

export function measureTextHeight(
  _textProps: TextProps,
  _flexStyle: FlexStyle,
  availableWidth: number,
): number {
  const div = getMeasureDiv();
  const { content, fontSize, fontWeight, lineHeight } = _textProps;

  // availableWidth from Yoga is the content width (padding already excluded).
  // Return pure content height — Yoga adds padding separately.
  div.style.width = `${availableWidth}px`;
  div.style.fontSize = `${fontSize}px`;
  div.style.fontWeight = fontWeight === 'bold' ? 'bold' : 'normal';
  div.style.fontFamily = 'Inter, sans-serif';
  div.style.lineHeight = `${lineHeight}`;
  div.textContent = content;

  return div.offsetHeight;
}
