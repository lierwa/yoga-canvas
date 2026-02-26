export interface DropIndicator {
  parentId: string;
  index: number;
  x: number;
  y: number;
  length: number;
  isHorizontal: boolean;
}

export interface SelectionState {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  dropTargetId: string | null;
  dropIndicator: DropIndicator | null;
}
