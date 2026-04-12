// Bead 3.2 — Telemetry event writer (persists to DB)
import { Database } from "bun:sqlite";
import type { TelemetryEvent } from "./event-types";
import { normalizeEvent, type RawTelemetryInput } from "./event-normalizer";

export class EventWriter {
  constructor(private db: Database) {}

  /**
   * Write a telemetry event. Input is validated via normalizeEvent.
   * Returns the persisted event.
   */
  write(input: RawTelemetryInput): TelemetryEvent {
    const event = normalizeEvent(input);
    this.db
      .prepare(
        `INSERT INTO telemetry_events
         (id, session_id, document_id, block_id, suggestion_id,
          event_type, actor, payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        event.id,
        event.sessionId,
        event.documentId,
        event.blockId ?? null,
        event.suggestionId ?? null,
        event.eventType,
        event.actor,
        JSON.stringify(event.payload),
        event.createdAt
      );
    return event;
  }

  /**
   * Query telemetry events for a session.
   */
  getBySession(sessionId: string): TelemetryEvent[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM telemetry_events WHERE session_id = ? ORDER BY created_at ASC"
      )
      .all(sessionId) as Record<string, unknown>[];
    return rows.map(rowToEvent);
  }

  /**
   * Query telemetry events by document.
   */
  getByDocument(documentId: string): TelemetryEvent[] {
    const rows = this.db
      .prepare(
        "SELECT * FROM telemetry_events WHERE document_id = ? ORDER BY created_at ASC"
      )
      .all(documentId) as Record<string, unknown>[];
    return rows.map(rowToEvent);
  }
}

function rowToEvent(row: Record<string, unknown>): TelemetryEvent {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    documentId: row.document_id as string,
    blockId: (row.block_id as string | null) ?? undefined,
    suggestionId: (row.suggestion_id as string | null) ?? undefined,
    eventType: row.event_type as TelemetryEvent["eventType"],
    actor: row.actor as TelemetryEvent["actor"],
    createdAt: row.created_at as string,
    payload: JSON.parse(row.payload as string) as Record<string, unknown>,
  };
}
