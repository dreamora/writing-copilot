// Block content hash helper
import { createHash } from "crypto";

/**
 * Compute excerpt hash: SHA-256 of first 80 chars of markdown,
 * truncated to 16 hex chars.
 */
export function computeExcerptHash(markdown: string): string {
  const excerpt = markdown.slice(0, 80);
  return createHash("sha256").update(excerpt).digest("hex").slice(0, 16);
}
