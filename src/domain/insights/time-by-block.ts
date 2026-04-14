// Insights: time spent per block
import { Database } from "bun:sqlite";

export interface TimeMetric {
  blockId: string;
  documentId: string;
  secondsSpent: number;
  sessionCount: number;
}

export function queryTimeByBlock(db: Database, sessionId?: string, documentId?: string): TimeMetric[] {
  const conditions: string[] = [];
  const params: string[] = [];

  if (sessionId) {
    conditions.push("session_id = ?");
    params.push(sessionId);
  }
  if (documentId) {
    conditions.push("document_id = ?");
    params.push(documentId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `SELECT block_id, document_id,
              SUM(seconds_spent) as seconds_spent,
              COUNT(DISTINCT session_id) as session_count
       FROM block_time_records
       ${whereClause}
       GROUP BY block_id, document_id
       ORDER BY seconds_spent DESC`
    )
    .all(...params) as Record<string, unknown>[];

  return rows.map((r) => ({
    blockId: r.block_id as string,
    documentId: r.document_id as string,
    secondsSpent: r.seconds_spent as number,
    sessionCount: r.session_count as number,
  }));
}
