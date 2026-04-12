// Bead 3.1 — Event normalizer: validate + normalize all telemetry writes
import { randomUUID } from "crypto";
import type { TelemetryEvent, TelemetryEventType, TelemetryActor } from "./event-types";
import { VALID_EVENT_TYPES } from "./event-types";

export interface RawTelemetryInput {
  sessionId: string;
  documentId: string;
  blockId?: string;
  suggestionId?: string;
  eventType: string;
  actor?: TelemetryActor;
  payload?: Record<string, unknown>;
}

/**
 * Normalize and validate a raw telemetry input.
 * Throws if required fields are missing or eventType is unknown.
 * Returns a fully-formed TelemetryEvent ready for persistence.
 */
export function normalizeEvent(input: RawTelemetryInput): TelemetryEvent {
  if (!input.sessionId?.trim()) {
    throw new Error("TelemetryEvent requires non-empty sessionId");
  }
  if (!input.documentId?.trim()) {
    throw new Error("TelemetryEvent requires non-empty documentId");
  }
  if (!VALID_EVENT_TYPES.has(input.eventType as TelemetryEventType)) {
    throw new Error(
      `Unknown eventType "${input.eventType}". Valid types: ${[...VALID_EVENT_TYPES].join(", ")}`
    );
  }

  return {
    id: randomUUID(),
    sessionId: input.sessionId.trim(),
    documentId: input.documentId.trim(),
    blockId: input.blockId?.trim() || undefined,
    suggestionId: input.suggestionId?.trim() || undefined,
    eventType: input.eventType as TelemetryEventType,
    actor: input.actor ?? "user",
    createdAt: new Date().toISOString(),
    payload: input.payload ?? {},
  };
}
