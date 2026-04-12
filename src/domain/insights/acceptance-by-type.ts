// Insights: acceptance rate by suggestion action type
import { Database } from "bun:sqlite";

export interface AcceptanceMetric {
  actionType: string;
  accepted: number;
  rejected: number;
  editedApplied: number;
  deferred: number;
  total: number;
  acceptanceRate: number;
}

export function queryAcceptanceByType(db: Database, documentId?: string): AcceptanceMetric[] {
  const whereClause = documentId ? "WHERE document_id = ?" : "";
  const params = documentId ? [documentId] : [];

  const rows = db
    .prepare(
      `SELECT
         action_type,
         COUNT(*) as total,
         SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
         SUM(CASE WHEN status = 'edited_applied' THEN 1 ELSE 0 END) as edited_applied,
         SUM(CASE WHEN status = 'deferred' THEN 1 ELSE 0 END) as deferred
       FROM suggestions
       ${whereClause}
       GROUP BY action_type
       ORDER BY total DESC`
    )
    .all(...params) as Record<string, unknown>[];

  return rows.map((r) => {
    const accepted = (r.accepted as number) + (r.edited_applied as number);
    const total = r.total as number;
    return {
      actionType: r.action_type as string,
      accepted: r.accepted as number,
      rejected: r.rejected as number,
      editedApplied: r.edited_applied as number,
      deferred: r.deferred as number,
      total,
      acceptanceRate: total > 0 ? accepted / total : 0,
    };
  });
}
