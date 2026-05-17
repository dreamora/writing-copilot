import type { Suggestion } from "../../../../src/domain/suggestions/suggestion-types";

export function createLineNumberLookup(content: string): (offset: number) => number {
  const lineStarts = [0];
  for (let i = 0; i < content.length; i += 1) {
    if (content[i] === "\n") lineStarts.push(i + 1);
  }

  return (offset: number): number => {
    const target = Math.max(0, Math.min(offset, content.length));
    let low = 0;
    let high = lineStarts.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (lineStarts[mid]! <= target) low = mid + 1;
      else high = mid - 1;
    }
    return high + 1;
  };
}

export function getLineNumberForOffset(content: string, offset: number): number {
  return createLineNumberLookup(content)(offset);
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

  const fallbackIndex = findNearestUniqueMatch(
    content,
    suggestion.selectedText,
    suggestion.charStart,
  );
  if (fallbackIndex !== null) {
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

function findNearestUniqueMatch(
  content: string,
  selectedText: string,
  originalStart: number,
): number | null {
  const matches: number[] = [];
  let searchFrom = 0;
  while (searchFrom <= content.length) {
    const next = content.indexOf(selectedText, searchFrom);
    if (next === -1) break;
    matches.push(next);
    searchFrom = next + Math.max(1, selectedText.length);
  }

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0]!;

  const ranked = matches
    .map((index) => ({ index, distance: Math.abs(index - originalStart) }))
    .sort((a, b) => a.distance - b.distance);

  if (ranked.length > 1 && ranked[0]!.distance === ranked[1]!.distance) {
    throw new Error(
      "Selected text appears in multiple equally likely locations. Select the text again before applying this review comment."
    );
  }

  return ranked[0]!.index;
}
