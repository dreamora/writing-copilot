// Bead 3.3 — Manual rewrite capture
import { randomUUID } from "crypto";
import { Database } from "bun:sqlite";
import type { ManualRewrite } from "./event-types";

/**
 * Compute edit distance delta metric (0..1):
 * Simple character-level approximation using Levenshtein-like approach.
 * Returns 0 if texts are identical, 1 if completely different.
 */
export function computeDeltaMetric(before: string, after: string): number {
  if (before === after) return 0;
  if (before.length === 0) return 1;

  // Use char-set difference as a fast approximation
  const removedChars = before.split("").filter((c) => !after.includes(c)).length;
  return Math.min(1, removedChars / Math.max(before.length, 1));
}

export class RewriteCapture {
  constructor(private db: Database) {}

  /**
   * Record a manual rewrite (user directly editing block text).
   * Only records if before !== after and diff is meaningful.
   */
  record(input: {
    sessionId: string;
    documentId: string;
    blockId: string;
    beforeText: string;
    afterText: string;
  }): ManualRewrite | null {
    if (input.beforeText === input.afterText) return null;
    if (!input.beforeText.trim() && !input.afterText.trim()) return null;

    const id = randomUUID();
    const now = new Date().toISOString();
    const deltaMetric = computeDeltaMetric(input.beforeText, input.afterText);

    this.db
      .prepare(
        `INSERT INTO manual_rewrites
         (id, session_id, document_id, block_id, before_text, after_text, delta_metric, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id, input.sessionId, input.documentId, input.blockId,
        input.beforeText, input.afterText, deltaMetric, now
      );

    // Populate FTS5 index
    this.db
      .prepare("INSERT INTO rewrites_fts(rewrite_id, before_text, after_text) VALUES (?, ?, ?)")
      .run(id, input.beforeText, input.afterText);

    return {
      id,
      sessionId: input.sessionId,
      documentId: input.documentId,
      blockId: input.blockId,
      beforeText: input.beforeText,
      afterText: input.afterText,
      deltaMetric,
      createdAt: now,
    };
  }

  /**
   * Get all rewrites for a document, ordered by time.
   */
  getByDocument(documentId: string): ManualRewrite[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM manual_rewrites WHERE document_id = ? ORDER BY created_at ASC"
      )
      .all(documentId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      sessionId: r.session_id as string,
      documentId: r.document_id as string,
      blockId: r.block_id as string,
      beforeText: r.before_text as string,
      afterText: r.after_text as string,
      deltaMetric: r.delta_metric as number,
      createdAt: r.created_at as string,
    }));
  }
}
