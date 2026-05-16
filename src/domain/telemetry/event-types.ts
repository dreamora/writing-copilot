// Bead 3.1 — Telemetry event taxonomy and contracts

export type TelemetryEventType =
  | "suggestion_created"
  | "suggestion_accepted"
  | "suggestion_rejected"
  | "suggestion_edited_then_applied"
  | "suggestion_deferred"
  | "suggestion_reopened"
  | "suggestion_reverted"
  | "manual_rewrite_recorded"
  | "block_focus_started"
  | "block_focus_ended";

export type TelemetryActor = "user" | "system";

export interface TelemetryEvent {
  id: string;
  sessionId: string;
  documentId: string;
  blockId?: string;
  suggestionId?: string;
  eventType: TelemetryEventType;
  actor: TelemetryActor;
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface BlockTimeEvent {
  sessionId: string;
  documentId: string;
  blockId: string;
  secondsSpent: number;
  createdAt: string;
}

export interface ManualRewrite {
  id: string;
  sessionId: string;
  documentId: string;
  blockId: string;
  beforeText: string;
  afterText: string;
  /** Levenshtein-based edit distance as a fraction of original length (0..1) */
  deltaMetric: number;
  createdAt: string;
}

// Valid event types as a Set for O(1) lookup
export const VALID_EVENT_TYPES = new Set<TelemetryEventType>([
  "suggestion_created",
  "suggestion_accepted",
  "suggestion_rejected",
  "suggestion_edited_then_applied",
  "suggestion_deferred",
  "suggestion_reopened",
  "suggestion_reverted",
  "manual_rewrite_recorded",
  "block_focus_started",
  "block_focus_ended",
]);
