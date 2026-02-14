import type { StyleProps } from '@yaga-canvas/core';

export interface ViewJSXProps {
  name?: string;
  style?: StyleProps;
  children?: React.ReactNode;
}

/**
 * JSX marker component for View nodes.
 * Does NOT render to DOM — used by YagaCanvas to build the descriptor tree.
 */
export function View(_props: ViewJSXProps): React.ReactElement | null {
  return null;
}

(View as unknown as { __yagaNodeType: string }).__yagaNodeType = 'view';
