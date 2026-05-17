import { buildMarkdownTextMap } from "./markdownPreview";

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

export function captureSelection(blockId: string, element: HTMLTextAreaElement): SelectionSpan | null {
  const start = element.selectionStart;
  const end = element.selectionEnd;
  if (start === end) return null;
  const selectedText = element.value.slice(start, end);
  if (!selectedText.trim()) return null;
  return { blockId, charStart: start, charEnd: end, selectedText };
}

export function captureRenderedSelection(
  blockId: string,
  root: HTMLElement,
  markdown: string
): { span: SelectionSpan; rect: DOMRect } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;

  const selectedText = selection.toString();
  if (!selectedText.trim()) return null;

  const plainStart = getRenderedOffset(root, range.startContainer, range.startOffset);
  const plainEnd = getRenderedOffset(root, range.endContainer, range.endOffset);
  const { sourceIndices } = buildMarkdownTextMap(markdown);
  if (sourceIndices.length === 0) return null;

  const safeStart = Math.max(0, Math.min(plainStart, sourceIndices.length - 1));
  const safeEnd = Math.max(safeStart, Math.min(plainEnd - 1, sourceIndices.length - 1));
  const charStart = sourceIndices[safeStart] ?? 0;
  const charEnd = (sourceIndices[safeEnd] ?? charStart) + 1;

  return {
    span: { blockId, charStart, charEnd, selectedText },
    rect: range.getBoundingClientRect(),
  };
}

function getRenderedOffset(root: HTMLElement, node: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(node, offset);
  return range.toString().length;
}

export function computePopoverPosition(element: HTMLElement | HTMLTextAreaElement): PopoverPosition {
  const rect = element.getBoundingClientRect();
  return computePopoverPositionFromRect(rect);
}

export function computePopoverPositionFromRect(rect: Pick<DOMRect, "bottom" | "left">): PopoverPosition {
  return {
    top: rect.bottom + window.scrollY + 6,
    left: rect.left + window.scrollX,
  };
}
