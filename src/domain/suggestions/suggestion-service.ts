// Bead 2.5 — Suggestion lifecycle service (CRUD + status transitions)
import { randomUUID } from "crypto";
import { Database } from "bun:sqlite";
import type {
  Suggestion,
  SuggestionStatus,
  SuggestionRequest,
} from "./suggestion-types";
import type { SuggestionProvider } from "../../adapters/ai/SuggestionProvider";

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
    status: row.status as SuggestionStatus,
    editedText: (row.edited_text as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    decidedAt: (row.decided_at as string | null) ?? undefined,
  };
}

export class SuggestionService {
  constructor(private db: Database, private provider: SuggestionProvider) {}

  async createSuggestion(req: SuggestionRequest): Promise<Suggestion> {
    const response = await this.provider.suggest(req);
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO suggestions
         (id, document_id, block_id, action_type, selected_text,
          char_start, char_end, context_before, context_after,
          custom_instruction, issue_summary, rationale, proposed_text,
          risk_notes, confidence, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`
      )
      .run(
        id, req.documentId, req.blockId, req.actionType,
        req.selection.selectedText, req.selection.charStart, req.selection.charEnd,
        req.context.before, req.context.after,
        req.customInstruction ?? null,
        response.issueSummary, response.rationale, response.proposedText,
        response.riskNotes ?? null, response.confidence ?? null,
        now, now
      );

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
    editedText?: string
  ): Suggestion | null {
    const now = new Date().toISOString();
    const decisionStatuses: SuggestionStatus[] = ["accepted", "rejected", "edited_applied"];
    const decidedAt = decisionStatuses.includes(status) ? now : null;

    if (editedText !== undefined) {
      this.db
        .prepare(
          `UPDATE suggestions SET status = ?, edited_text = ?, updated_at = ?,
           decided_at = COALESCE(?, decided_at) WHERE id = ?`
        )
        .run(status, editedText, now, decidedAt, id);
    } else {
      this.db
        .prepare(
          `UPDATE suggestions SET status = ?, updated_at = ?,
           decided_at = COALESCE(?, decided_at) WHERE id = ?`
        )
        .run(status, now, decidedAt, id);
    }

    return this.getById(id);
  }

  getById(id: string): Suggestion | null {
    const row = this.db
      .prepare("SELECT * FROM suggestions WHERE id = ?")
      .get(id) as Record<string, unknown> | null;
    return row ? rowToSuggestion(row) : null;
  }
}
