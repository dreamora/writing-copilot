const MAX_CONTEXT_CHARS = 500;

export function buildSelectionContextEnvelope(
  content: string,
  charStart: number,
  charEnd: number,
  maxChars = MAX_CONTEXT_CHARS
): { before: string; after: string } {
  const before = content.slice(Math.max(0, charStart - maxChars), charStart);
  const after = content.slice(charEnd, Math.min(content.length, charEnd + maxChars));

  return {
    before: sanitizeContext(before),
    after: sanitizeContext(after),
  };
}

function sanitizeContext(text: string): string {
  return text.replace(/[ \t]{2,}/g, " ").trim();
}
