import type { StyleProps, ScrollBarVisibility } from '@yoga-canvas/core';

export interface ScrollViewJSXProps {
  name?: string;
  className?: string;
  tw?: string;
  style?: StyleProps;
  scrollDirection?: 'vertical' | 'horizontal';
  scrollBarVisibility?: ScrollBarVisibility;
  children?: React.ReactNode;
}

/**
 * JSX marker component for ScrollView nodes.
 * Does NOT render to DOM — used by YogaCanvas to build the descriptor tree.
 */
export function ScrollView(_props: ScrollViewJSXProps): React.ReactElement | null {
  void _props;
  return null;
}

(ScrollView as unknown as { __yogaNodeType: string }).__yogaNodeType = 'scrollview';
