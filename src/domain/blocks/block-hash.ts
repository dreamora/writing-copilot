// Block content hash helper
import { hashString } from "./hash-string";

/**
 * Compute a deterministic excerpt hash from the first 80 chars of markdown.
 */
export function computeExcerptHash(markdown: string): string {
  const excerpt = markdown.slice(0, 80);
  return hashString(excerpt);
}
