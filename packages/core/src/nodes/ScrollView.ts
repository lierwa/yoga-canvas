import type { NodeDescriptor, StyleProps, ScrollBarVisibility } from '../types';

export interface ScrollViewProps {
  scrollDirection?: 'vertical' | 'horizontal';
  scrollBarVisibility?: ScrollBarVisibility;
  name?: string;
  style?: StyleProps;
  children?: NodeDescriptor[];
}

export function ScrollView(props: ScrollViewProps = {}): NodeDescriptor {
  return {
    type: 'scrollview',
    name: props.name,
    style: props.style ?? {},
    children: props.children,
    scrollDirection: props.scrollDirection ?? 'vertical',
    scrollBarVisibility: props.scrollBarVisibility,
  };
}
