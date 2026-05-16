// Suggestion lifecycle service — Phase 3: emits telemetry, FTS5 population
import { randomUUID } from "crypto";
import { Database } from "bun:sqlite";
import type {
  ShownEdit,
  Suggestion,
  SuggestionStatus,
  SuggestionRequest,
  ThoughtLens,
  ThoughtProvocation,
} from "./suggestion-types";
import type { SuggestionProvider } from "../../adapters/ai/SuggestionProvider";
import type { EventWriter } from "../telemetry/event-writer";

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function rowToSuggestion(row: Record<string, unknown>): Suggestion {
  return {
    id: row.id as string,
    documentId: row.document_id as string,
    blockId: row.block_id as string,
    actionType: row.action_type as Suggestion["actionType"],
    selectedText: row.selected_text as string,
    charStart: row.char_start as number,
    charEnd: row.char_end as number,
    contextBefore: row.context_before as string,
    contextAfter: row.context_after as string,
    customInstruction: (row.custom_instruction as string | null) ?? undefined,
    issueSummary: row.issue_summary as string,
    rationale: row.rationale as string,
    proposedText: row.proposed_text as string,
    riskNotes: (row.risk_notes as string | null) ?? undefined,
    confidence: (row.confidence as number | null) ?? undefined,
    editorRole: (row.editor_role as Suggestion["editorRole"] | null) ?? "professional-lector",
    workflowStage: (row.workflow_stage as Suggestion["workflowStage"] | null) ?? "final-output",
    activeLens: (row.active_lens as string | null) ?? undefined,
    shownEdit: parseJsonField<ShownEdit | undefined>(row.shown_edit_json, undefined),
    lenses: parseJsonField<ThoughtLens[]>(row.lenses_json, []),
    provocations: parseJsonField<ThoughtProvocation[]>(row.provocations_json, []),
    status: row.status as SuggestionStatus,
    editedText: (row.edited_text as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    decidedAt: (row.decided_at as string | null) ?? undefined,
  };
}

const STATUS_TO_EVENT: Record<string, string> = {
  open: "suggestion_reopened",
  accepted: "suggestion_accepted",
  rejected: "suggestion_rejected",
  edited_applied: "suggestion_edited_then_applied",
  deferred: "suggestion_deferred",
};

export class SuggestionService {
  constructor(
    private db: Database,
    private provider: SuggestionProvider,
    private eventWriter?: EventWriter
  ) {}

  async createSuggestion(req: SuggestionRequest, sessionId = "default"): Promise<Suggestion> {
    const response = await this.provider.suggest(req);
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO suggestions
         (id, document_id, block_id, action_type, selected_text,
          char_start, char_end, context_before, context_after,
          custom_instruction, issue_summary, rationale, proposed_text,
          risk_notes, confidence, editor_role, workflow_stage, active_lens, shown_edit_json,
          lenses_json, provocations_json, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`
      )
      .run(
        id, req.documentId, req.blockId, req.actionType,
        req.selection.selectedText, req.selection.charStart, req.selection.charEnd,
        req.context.before, req.context.after, req.customInstruction ?? null,
        response.issueSummary, response.rationale, response.proposedText,
        response.riskNotes ?? null, response.confidence ?? null,
        req.editorRole ?? "professional-lector", req.workflowStage ?? "final-output", req.activeLens?.trim() || null,
        response.shownEdit ? JSON.stringify(response.shownEdit) : null,
        JSON.stringify(response.lenses ?? []), JSON.stringify(response.provocations ?? []),
        now, now
      );

    // Populate FTS5
    this.db
      .prepare(
        `INSERT INTO suggestions_fts(suggestion_id, issue_summary, rationale, proposed_text, selected_text)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, response.issueSummary, response.rationale, response.proposedText, req.selection.selectedText);

    // Emit telemetry
    this.eventWriter?.write({
      sessionId,
      documentId: req.documentId,
      blockId: req.blockId,
      suggestionId: id,
      eventType: "suggestion_created",
      actor: "user",
      payload: {
        actionType: req.actionType,
        editorRole: req.editorRole ?? "professional-lector",
        selectedTextLength: req.selection.selectedText.length,
        workflowStage: req.workflowStage ?? "final-output",
        activeLens: req.activeLens?.trim() || null,
        lensCount: response.lenses?.length ?? 0,
        provocationCount: response.provocations?.length ?? 0,
      },
    });

    return this.getById(id)!;
  }

  getSuggestionsForDocument(documentId: string): Suggestion[] {
    const rows = this.db
      .prepare("SELECT * FROM suggestions WHERE document_id = ? ORDER BY created_at DESC")
      .all(documentId) as Record<string, unknown>[];
    return rows.map(rowToSuggestion);
  }

  getOpenByBlockId(blockId: string): Suggestion[] {
    const rows = this.db
      .prepare("SELECT * FROM suggestions WHERE block_id = ? AND status = 'open' ORDER BY created_at DESC")
      .all(blockId) as Record<string, unknown>[];
    return rows.map(rowToSuggestion);
  }

  transition(
    id: string,
    status: SuggestionStatus,
    editedText?: string,
    sessionId = "default"
  ): Suggestion | null {
    const now = new Date().toISOString();
    const decisionStatuses: SuggestionStatus[] = ["accepted", "rejected", "edited_applied"];
    const decidedAt = decisionStatuses.includes(status) ? now : null;

    if (status === "open") {
      this.db.prepare(
        "UPDATE suggestions SET status = ?, edited_text = NULL, updated_at = ?, decided_at = NULL WHERE id = ?"
      ).run(status, now, id);
    } else if (editedText !== undefined) {
      if (decidedAt !== null) {
        this.db.prepare(
          "UPDATE suggestions SET status = ?, edited_text = ?, updated_at = ?, decided_at = ? WHERE id = ?"
        ).run(status, editedText, now, decidedAt, id);
      } else {
        this.db.prepare(
          "UPDATE suggestions SET status = ?, edited_text = ?, updated_at = ? WHERE id = ?"
        ).run(status, editedText, now, id);
      }
    } else {
      if (decidedAt !== null) {
        this.db.prepare(
          "UPDATE suggestions SET status = ?, updated_at = ?, decided_at = ? WHERE id = ?"
        ).run(status, now, decidedAt, id);
      } else {
        this.db.prepare(
          "UPDATE suggestions SET status = ?, updated_at = ? WHERE id = ?"
        ).run(status, now, id);
      }
    }

    const updated = this.getById(id);
    if (!updated) return null;

    // Emit telemetry
    const eventType = STATUS_TO_EVENT[status];
    if (eventType && this.eventWriter) {
      this.eventWriter.write({
        sessionId,
        documentId: updated.documentId,
        blockId: updated.blockId,
        suggestionId: id,
        eventType: eventType as Parameters<typeof this.eventWriter.write>[0]["eventType"],
        actor: "user",
        payload: { status, hasEditedText: !!editedText },
      });
    }

    return updated;
  }

  getById(id: string): Suggestion | null {
    const row = this.db
      .prepare("SELECT * FROM suggestions WHERE id = ?")
      .get(id) as Record<string, unknown> | null;
    return row ? rowToSuggestion(row) : null;
  }
}
