// Bead 1.4 — Recomposer: blocks → markdown
import type { Block } from "./block";

/**
 * Reconstruct markdown from an ordered array of blocks.
 *
 * Policy:
 * - Join blocks with "\n\n" (double newline / blank line)
 * - Each block's markdown is used verbatim
 *
 * Contract (round-trip fidelity):
 * For unchanged content:
 *   recomposeMarkdown(parseMarkdown(md)).trim() === normalizeMarkdown(md).trim()
 *
 * "Normalize" means: consecutive blank lines collapsed to one, trailing whitespace trimmed.
 */
export function recomposeMarkdown(blocks: Block[]): string {
  return blocks.map((b) => b.markdown).join("\n\n");
}

/**
 * Normalize a markdown string for comparison:
 * - Collapse 3+ consecutive blank lines to 2
 * - Trim trailing whitespace from each line
 */
export function normalizeMarkdown(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
