// Bead 2.1 — Selection state management
export interface SelectionSpan {
  blockId: string;
  charStart: number;
  charEnd: number;
  selectedText: string;
  anchorNode?: string;
}

export interface PopoverPosition {
  top: number;
  left: number;
}

export interface SelectionState {
  span: SelectionSpan | null;
  popoverPos: PopoverPosition | null;
}

/**
 * Capture current window selection within a block's textarea element.
 * Returns null if no selection or selection is collapsed.
 */
export function captureSelection(
  blockId: string,
  element: HTMLTextAreaElement
): SelectionSpan | null {
  const start = element.selectionStart;
  const end = element.selectionEnd;
  if (start === end) return null; // collapsed

  const selectedText = element.value.slice(start, end);
  if (!selectedText.trim()) return null;

  return { blockId, charStart: start, charEnd: end, selectedText };
}

/**
 * Compute popover position relative to a textarea element.
 * Places popover below/above the current selection.
 */
export function computePopoverPosition(element: HTMLTextAreaElement): PopoverPosition {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.bottom + window.scrollY + 6,
    left: rect.left + window.scrollX,
  };
}
