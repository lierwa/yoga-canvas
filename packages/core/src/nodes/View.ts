import type { NodeDescriptor, StyleProps } from '../types';

export interface ViewProps {
  name?: string;
  style?: StyleProps;
  children?: NodeDescriptor[];
}

export function View(props: ViewProps = {}): NodeDescriptor {
  return {
    type: 'view',
    name: props.name,
    style: props.style ?? {},
    children: props.children,
  };
}
