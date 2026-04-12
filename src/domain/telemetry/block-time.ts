// Bead 3.4 — Block time tracking
import { Database } from "bun:sqlite";
import type { BlockTimeEvent } from "./event-types";

export class BlockTimeTracker {
  constructor(private db: Database) {}

  /**
   * Record time spent on a block.
   * secondsSpent must be > 0 to be persisted.
   */
  record(input: {
    sessionId: string;
    documentId: string;
    blockId: string;
    secondsSpent: number;
  }): BlockTimeEvent | null {
    if (input.secondsSpent <= 0) return null;

    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO block_time_records
         (session_id, document_id, block_id, seconds_spent, created_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(input.sessionId, input.documentId, input.blockId, input.secondsSpent, now);

    return {
      sessionId: input.sessionId,
      documentId: input.documentId,
      blockId: input.blockId,
      secondsSpent: input.secondsSpent,
      createdAt: now,
    };
  }

  /**
   * Get total seconds spent per block for a session.
   */
  getBySession(sessionId: string): BlockTimeEvent[] {
    const rows = this.db
      .prepare(
        `SELECT session_id, document_id, block_id, SUM(seconds_spent) as seconds_spent, MAX(created_at) as created_at
         FROM block_time_records WHERE session_id = ? GROUP BY block_id ORDER BY seconds_spent DESC`
      )
      .all(sessionId) as Record<string, unknown>[];
    return rows.map((r) => ({
      sessionId: r.session_id as string,
      documentId: r.document_id as string,
      blockId: r.block_id as string,
      secondsSpent: r.seconds_spent as number,
      createdAt: r.created_at as string,
    }));
  }
}
