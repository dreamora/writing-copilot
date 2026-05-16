import type { Suggestion } from "../../../../src/domain/suggestions/suggestion-types";

export function getLineNumberForOffset(content: string, offset: number): number {
  return content.slice(0, Math.max(0, offset)).split("\n").length;
}

export function createInlineAnchorId(content: string, charStart: number): string {
  return `line-${getLineNumberForOffset(content, charStart)}`;
}

export function applySuggestionToDocument(
  content: string,
  suggestion: Suggestion,
  replacement: string
): { content: string; charStart: number; charEnd: number } {
  const directSlice = content.slice(suggestion.charStart, suggestion.charEnd);
  if (directSlice === suggestion.selectedText) {
    return {
      content:
        content.slice(0, suggestion.charStart) +
        replacement +
        content.slice(suggestion.charEnd),
      charStart: suggestion.charStart,
      charEnd: suggestion.charStart + replacement.length,
    };
  }

  const fallbackIndex = content.indexOf(suggestion.selectedText);
  if (fallbackIndex !== -1) {
    return {
      content:
        content.slice(0, fallbackIndex) +
        replacement +
        content.slice(fallbackIndex + suggestion.selectedText.length),
      charStart: fallbackIndex,
      charEnd: fallbackIndex + replacement.length,
    };
  }

  throw new Error(
    "Selected text no longer matches the document. Reload the document before applying this review comment."
  );
}
