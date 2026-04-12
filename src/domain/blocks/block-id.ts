// Bead 1.3 — Stable block ID generator
import { createHash } from "crypto";
import type { PartialBlock } from "./block";

/**
 * Normalizes markdown for stable ID generation:
 * trim + collapse multiple whitespace into single space
 */
function normalizeForId(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * Generate a deterministic block ID.
 * ID = sha256(type + "|" + normalizedMarkdown.slice(0,120) + "|" + siblingIndex)
 * truncated to 16 hex chars.
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
  return createHash("sha256").update(seed).digest("hex").slice(0, 16);
}
