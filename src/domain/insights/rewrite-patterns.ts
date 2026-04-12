// Insights: rewrite pattern analysis
import { Database } from "bun:sqlite";

export interface RewritePattern {
  blockId: string;
  rewriteCount: number;
  avgDeltaMetric: number;
  severity: "low" | "medium" | "high";
}

export interface FtsSearchResult {
  suggestionId: string;
  issueSummary: string;
  proposedText: string;
  rank: number;
}

/**
 * Return blocks with highest rewrite frequency and delta metrics.
 */
export function queryRewritePatterns(db: Database, documentId?: string): RewritePattern[] {
  const whereClause = documentId ? "WHERE document_id = ?" : "";
  const params = documentId ? [documentId] : [];

  const rows = db
    .prepare(
      `SELECT block_id,
              COUNT(*) as rewrite_count,
              AVG(delta_metric) as avg_delta
       FROM manual_rewrites
       ${whereClause}
       GROUP BY block_id
       ORDER BY rewrite_count DESC, avg_delta DESC`
    )
    .all(...params) as Record<string, unknown>[];

  return rows.map((r) => {
    const avg = r.avg_delta as number;
    const count = r.rewrite_count as number;
    const severity: RewritePattern["severity"] =
      avg > 0.6 || count > 5 ? "high" : avg > 0.3 || count > 2 ? "medium" : "low";
    return {
      blockId: r.block_id as string,
      rewriteCount: count,
      avgDeltaMetric: avg,
      severity,
    };
  });
}

/**
 * Full-text search across suggestion issue summaries and proposed text.
 */
export function searchSuggestions(db: Database, query: string, limit = 20): FtsSearchResult[] {
  const rows = db
    .prepare(
      `SELECT suggestion_id, issue_summary, proposed_text, rank
       FROM suggestions_fts
       WHERE suggestions_fts MATCH ?
       ORDER BY rank
       LIMIT ?`
    )
    .all(query, limit) as Record<string, unknown>[];

  return rows.map((r) => ({
    suggestionId: r.suggestion_id as string,
    issueSummary: r.issue_summary as string,
    proposedText: r.proposed_text as string,
    rank: r.rank as number,
  }));
}
