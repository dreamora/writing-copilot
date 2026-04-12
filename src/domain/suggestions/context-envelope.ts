// Bead 2.2 — Context envelope builder
import type { Block } from "../blocks/block";

const MAX_CONTEXT_CHARS = 400;

/**
 * Build context envelope: text before and after the selection block.
 * Uses adjacent blocks to provide surrounding context up to MAX_CONTEXT_CHARS.
 */
export function buildContextEnvelope(
  blocks: Block[],
  blockId: string
): { before: string; after: string } {
  const idx = blocks.findIndex((b) => b.id === blockId);
  if (idx === -1) return { before: "", after: "" };

  // Gather before context from preceding blocks (reversed, concatenated)
  let before = "";
  for (let i = idx - 1; i >= 0; i--) {
    const candidate = blocks[i]!.markdown;
    const combined = candidate + "\n\n" + before;
    if (combined.length > MAX_CONTEXT_CHARS) {
      // Take trailing portion up to limit
      before = combined.slice(-MAX_CONTEXT_CHARS);
      break;
    }
    before = combined;
  }

  // Gather after context from following blocks
  let after = "";
  for (let i = idx + 1; i < blocks.length; i++) {
    const candidate = blocks[i]!.markdown;
    const combined = after ? after + "\n\n" + candidate : candidate;
    if (combined.length > MAX_CONTEXT_CHARS) {
      after = combined.slice(0, MAX_CONTEXT_CHARS);
      break;
    }
    after = combined;
  }

  return {
    before: sanitizeContext(before),
    after: sanitizeContext(after),
  };
}

function sanitizeContext(text: string): string {
  // Collapse excessive whitespace, trim
  return text.replace(/[ \t]{2,}/g, " ").trim();
}
