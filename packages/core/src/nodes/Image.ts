import type { NodeDescriptor, StyleProps } from '../types';

export interface ImageNodeProps {
  src: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  name?: string;
  style?: StyleProps;
}

export function Image(props: ImageNodeProps): NodeDescriptor {
  return {
    type: 'image',
    name: props.name,
    style: props.style ?? {},
    src: props.src,
    objectFit: props.objectFit ?? 'cover',
  };
}
