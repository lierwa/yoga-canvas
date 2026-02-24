import type { StyleProps } from '@yaga-canvas/core';

export interface ImageJSXProps {
  name?: string;
  style?: StyleProps;
  src: string;
  objectFit?: 'cover' | 'contain' | 'fill';
}

/**
 * JSX marker component for Image nodes.
 * Does NOT render to DOM — used by YagaCanvas to build the descriptor tree.
 */
export function Image(_props: ImageJSXProps): React.ReactElement | null {
  void _props;
  return null;
}

(Image as unknown as { __yagaNodeType: string }).__yagaNodeType = 'image';
