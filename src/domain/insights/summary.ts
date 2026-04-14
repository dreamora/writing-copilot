import { Database } from "bun:sqlite";
import { queryAcceptanceByType } from "./acceptance-by-type";
import { queryTimeByBlock } from "./time-by-block";
import { queryRewritePatterns, searchSuggestions } from "./rewrite-patterns";

export interface RecentSuggestionSummary {
  id: string;
  blockId: string;
  actionType: string;
  status: string;
  issueSummary: string;
  proposedText: string;
  selectedText: string;
  createdAt: string;
  decidedAt?: string;
}

export interface RecentRewriteSummary {
  id: string;
  blockId: string;
  deltaMetric: number;
  beforeText: string;
  afterText: string;
  createdAt: string;
}

export interface InsightsSummary {
  filters: {
    documentId?: string;
    sessionId?: string;
    q?: string;
    limit: number;
  };
  totals: {
    suggestions: number;
    accepted: number;
    rejected: number;
    editedApplied: number;
    deferred: number;
    open: number;
    rewrites: number;
  };
  acceptance: ReturnType<typeof queryAcceptanceByType>;
  timeByBlock: ReturnType<typeof queryTimeByBlock>;
  hotspots: ReturnType<typeof queryRewritePatterns>;
  search: ReturnType<typeof searchSuggestions>;
  recentSuggestions: RecentSuggestionSummary[];
  recentRewrites: RecentRewriteSummary[];
}

function whereDocument(column: string, documentId?: string): string {
  return documentId ? `WHERE ${column} = ?` : "";
}

export function buildInsightsSummary(
  db: Database,
  options: { documentId?: string; sessionId?: string; q?: string; limit?: number } = {}
): InsightsSummary {
  const limit = Math.max(1, Math.min(options.limit ?? 10, 50));
  const suggestionWhere = whereDocument("document_id", options.documentId);
  const rewriteWhere = whereDocument("document_id", options.documentId);
  const suggestionParams = options.documentId ? [options.documentId] : [];
  const rewriteParams = options.documentId ? [options.documentId] : [];

  const totalsRow = db
    .prepare(
      `SELECT
         COUNT(*) as suggestions,
         SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
         SUM(CASE WHEN status = 'edited_applied' THEN 1 ELSE 0 END) as edited_applied,
         SUM(CASE WHEN status = 'deferred' THEN 1 ELSE 0 END) as deferred,
         SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open
       FROM suggestions
       ${suggestionWhere}`
    )
    .get(...suggestionParams) as Record<string, number | null>;

  const rewritesRow = db
    .prepare(
      `SELECT COUNT(*) as rewrites
       FROM manual_rewrites
       ${rewriteWhere}`
    )
    .get(...rewriteParams) as Record<string, number | null>;

  const recentSuggestions = db
    .prepare(
      `SELECT id, block_id, action_type, status, issue_summary, proposed_text, selected_text, created_at, decided_at
       FROM suggestions
       ${suggestionWhere}
       ORDER BY COALESCE(decided_at, created_at) DESC
       LIMIT ?`
    )
    .all(...suggestionParams, limit) as Record<string, unknown>[];

  const recentRewrites = db
    .prepare(
      `SELECT id, block_id, delta_metric, before_text, after_text, created_at
       FROM manual_rewrites
       ${rewriteWhere}
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(...rewriteParams, limit) as Record<string, unknown>[];

  return {
    filters: {
      documentId: options.documentId,
      sessionId: options.sessionId,
      q: options.q,
      limit,
    },
    totals: {
      suggestions: totalsRow.suggestions ?? 0,
      accepted: totalsRow.accepted ?? 0,
      rejected: totalsRow.rejected ?? 0,
      editedApplied: totalsRow.edited_applied ?? 0,
      deferred: totalsRow.deferred ?? 0,
      open: totalsRow.open ?? 0,
      rewrites: rewritesRow.rewrites ?? 0,
    },
    acceptance: queryAcceptanceByType(db, options.documentId),
    timeByBlock: queryTimeByBlock(db, options.sessionId, options.documentId).slice(0, limit),
    hotspots: queryRewritePatterns(db, options.documentId).slice(0, limit),
    search: options.q ? searchSuggestions(db, options.q, limit) : [],
    recentSuggestions: recentSuggestions.map((row) => ({
      id: row.id as string,
      blockId: row.block_id as string,
      actionType: row.action_type as string,
      status: row.status as string,
      issueSummary: row.issue_summary as string,
      proposedText: row.proposed_text as string,
      selectedText: row.selected_text as string,
      createdAt: row.created_at as string,
      decidedAt: (row.decided_at as string | null) ?? undefined,
    })),
    recentRewrites: recentRewrites.map((row) => ({
      id: row.id as string,
      blockId: row.block_id as string,
      deltaMetric: row.delta_metric as number,
      beforeText: row.before_text as string,
      afterText: row.after_text as string,
      createdAt: row.created_at as string,
    })),
  };
}
