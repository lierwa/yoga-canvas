import type { StyleProps, ScrollBarVisibility } from '@yaga-canvas/core';

export interface ScrollViewJSXProps {
  name?: string;
  style?: StyleProps;
  scrollDirection?: 'vertical' | 'horizontal';
  scrollBarVisibility?: ScrollBarVisibility;
  children?: React.ReactNode;
}

/**
 * JSX marker component for ScrollView nodes.
 * Does NOT render to DOM — used by YagaCanvas to build the descriptor tree.
 */
export function ScrollView(_props: ScrollViewJSXProps): React.ReactElement | null {
  return null;
}

(ScrollView as unknown as { __yagaNodeType: string }).__yagaNodeType = 'scrollview';
