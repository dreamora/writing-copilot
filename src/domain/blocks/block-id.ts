// Bead 1.3 — Stable block ID generator
import type { PartialBlock } from "./block";
import { hashString } from "./hash-string";

/**
 * Normalizes markdown for stable ID generation:
 * trim + collapse multiple whitespace into single space
 */
function normalizeForId(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * Generate a deterministic block ID.
 * ID = deterministic hash of type + normalizedMarkdown.slice(0,120) + siblingIndex,
 * returned as 16 hex chars.
 *
 * Rules:
 * - No-op save keeps IDs unchanged (same content → same ID)
 * - Local edits only affect touched block IDs
 * - Re-ordering preserves unchanged block IDs where possible
 */
export function generateBlockId(
  block: PartialBlock,
  siblingIndex: number
): string {
  const normalized = normalizeForId(block.markdown).slice(0, 120);
  const seed = `${block.type}|${normalized}|${siblingIndex}`;
  return hashString(seed);
}
