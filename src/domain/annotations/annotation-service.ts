// Annotation persistence service.
// Mirrors the SuggestionService pattern (prepared statements over bun:sqlite).
// Annotations anchor a comment to a document character range; coordinates are
// document-global (see annotation-types.ts).
import { randomUUID } from "crypto";
import { Database } from "bun:sqlite";
import type { Annotation, CreateAnnotationInput } from "./annotation-types";

function rowToAnnotation(row: Record<string, unknown>): Annotation {
  return {
    id: row.id as string,
    documentId: row.document_id as string,
    blockId: row.block_id as string,
    charStart: row.char_start as number,
    charEnd: row.char_end as number,
    originalText: row.original_text as string,
    commentText: row.comment_text as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export class AnnotationService {
  constructor(private db: Database) {}

  create(input: CreateAnnotationInput): Annotation {
    if (this.hasOverlappingRange(input.documentId, input.charStart, input.charEnd)) {
      throw new Error("Annotation range overlaps an existing annotation");
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO annotations
         (id, document_id, block_id, char_start, char_end,
          original_text, comment_text, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.documentId,
        input.blockId,
        input.charStart,
        input.charEnd,
        input.originalText,
        input.commentText,
        now,
        now
      );
    return this.getById(id)!;
  }

  listByDocument(documentId: string): Annotation[] {
    const rows = this.db
      .prepare("SELECT * FROM annotations WHERE document_id = ? ORDER BY created_at ASC")
      .all(documentId) as Record<string, unknown>[];
    return rows.map(rowToAnnotation);
  }

  hasOverlappingRange(documentId: string, charStart: number, charEnd: number): boolean {
    const row = this.db
      .prepare(
        `SELECT id FROM annotations
         WHERE document_id = ?
           AND char_start < ?
           AND char_end > ?
         LIMIT 1`
      )
      .get(documentId, charEnd, charStart) as { id: string } | undefined;
    return !!row;
  }

  getById(id: string): Annotation | null {
    const row = this.db
      .prepare("SELECT * FROM annotations WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? rowToAnnotation(row) : null;
  }

  delete(id: string): boolean {
    const result = this.db.prepare("DELETE FROM annotations WHERE id = ?").run(id);
    return result.changes > 0;
  }
}
