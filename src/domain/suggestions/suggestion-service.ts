// Bead 2.5 — Suggestion lifecycle service (CRUD + status transitions)
import { randomUUID } from "crypto";
import Database from "better-sqlite3";
import type {
  Suggestion,
  SuggestionResponse,
  SuggestionStatus,
  SuggestionRequest,
} from "./suggestion-types";
import { buildContextEnvelope } from "./context-envelope";
import type { SuggestionProvider } from "../../adapters/ai/SuggestionProvider";

export class SuggestionService {
  constructor(private db: Database.Database, private provider: SuggestionProvider) {}

  /**
   * Create a new suggestion: call AI provider, validate response, persist
   */
  async createSuggestion(req: SuggestionRequest): Promise<Suggestion> {
    // Call provider to generate suggestion
    const response = await this.provider.suggest(req);

    // Persist to DB
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO suggestions (
        id, document_id, block_id, action_type, selected_text,
        char_start, char_end, context_before, context_after,
        custom_instruction, issue_summary, rationale, proposed_text,
        risk_notes, confidence, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      req.documentId,
      req.blockId,
      req.actionType,
      req.selection.selectedText,
      req.selection.charStart,
      req.selection.charEnd,
      req.context.before,
      req.context.after,
      req.customInstruction || null,
      response.issueSummary,
      response.rationale,
      response.proposedText,
      response.riskNotes || null,
      response.confidence ?? null,
      "open",
      now,
      now
    );

    return {
      id,
      documentId: req.documentId,
      blockId: req.blockId,
      actionType: req.actionType,
      selectedText: req.selection.selectedText,
      charStart: req.selection.charStart,
      charEnd: req.selection.charEnd,
      contextBefore: req.context.before,
      contextAfter: req.context.after,
      customInstruction: req.customInstruction,
      issueSummary: response.issueSummary,
      rationale: response.rationale,
      proposedText: response.proposedText,
      riskNotes: response.riskNotes,
      confidence: response.confidence,
      status: "open",
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Get all suggestions for a document
   */
  getSuggestionsForDocument(documentId: string): Suggestion[] {
    const stmt = this.db.prepare(
      "SELECT * FROM suggestions WHERE document_id = ? ORDER BY created_at DESC"
    );
    const rows = stmt.all(documentId) as any[];
    return rows.map((r) => this.rowToSuggestion(r));
  }

  /**
   * Get all open suggestions for a block
   */
  getOpenByBlockId(blockId: string): Suggestion[] {
    const stmt = this.db.prepare(
      "SELECT * FROM suggestions WHERE block_id = ? AND status = 'open' ORDER BY created_at DESC"
    );
    const rows = stmt.all(blockId) as any[];
    return rows.map((r) => this.rowToSuggestion(r));
  }

  /**
   * Transition a suggestion to a new status
   * Returns updated suggestion or null if not found
   */
  transition(
    id: string,
    status: SuggestionStatus,
    editedText?: string
  ): Suggestion | null {
    const now = new Date().toISOString();

    if (editedText) {
      const stmt = this.db.prepare(
        "UPDATE suggestions SET status = ?, edited_text = ?, updated_at = ?, decided_at = ? WHERE id = ?"
      );
      stmt.run(status, editedText, now, now, id);
    } else {
      const stmt = this.db.prepare(
        "UPDATE suggestions SET status = ?, updated_at = ?, decided_at = ? WHERE id = ?"
      );
      stmt.run(status, now, now, id);
    }

    return this.getById(id);
  }

  /**
   * Get suggestion by ID
   */
  getById(id: string): Suggestion | null {
    const stmt = this.db.prepare("SELECT * FROM suggestions WHERE id = ?");
    const row = stmt.get(id) as any;
    return row ? this.rowToSuggestion(row) : null;
  }

  /**
   * Convert DB row to Suggestion domain object
   */
  private rowToSuggestion(row: any): Suggestion {
    return {
      id: row.id,
      documentId: row.document_id,
      blockId: row.block_id,
      actionType: row.action_type as any,
      selectedText: row.selected_text,
      charStart: row.char_start,
      charEnd: row.char_end,
      contextBefore: row.context_before,
      contextAfter: row.context_after,
      customInstruction: row.custom_instruction,
      issueSummary: row.issue_summary,
      rationale: row.rationale,
      proposedText: row.proposed_text,
      riskNotes: row.risk_notes,
      confidence: row.confidence,
      status: row.status as any,
      editedText: row.edited_text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      decidedAt: row.decided_at,
    };
  }
}
