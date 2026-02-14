import type { NodeDescriptor, StyleProps } from '../types';

export interface TextNodeProps {
  content: string;
  name?: string;
  style?: StyleProps;
}

export function Text(props: TextNodeProps): NodeDescriptor {
  return {
    type: 'text',
    name: props.name,
    style: props.style ?? {},
    content: props.content,
  };
}
