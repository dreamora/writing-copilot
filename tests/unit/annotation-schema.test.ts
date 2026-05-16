// Annotation schema round-trip (in-memory SQLite + migrations)
import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";

function createTestDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode=WAL;");
  const migDir = join(import.meta.dir, "../../src/db/migrations");
  for (const f of [
    "001_init.sql",
    "003_suggestions.sql",
    "004_telemetry.sql",
    "006_tool_for_thought.sql",
    "005_annotations.sql",
  ]) {
    db.exec(readFileSync(join(migDir, f), "utf-8"));
  }
  return db;
}

describe("annotations schema", () => {
  let db: Database;

  beforeEach(() => {
    db = createTestDb();
  });

  it("round-trips an annotation row", () => {
    db.run(
      `INSERT INTO annotations (id, document_id, block_id, char_start, char_end, original_text, comment_text)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ["a1", "doc-main", "doc-main", 10, 25, "selected text", "this needs work"],
    );

    const row = db
      .query(
        `SELECT id, document_id, block_id, char_start, char_end, original_text, comment_text,
                created_at, updated_at
         FROM annotations WHERE id = ?`,
      )
      .get("a1") as Record<string, unknown> | undefined;

    expect(row).toBeTruthy();
    expect(row?.id).toBe("a1");
    expect(row?.document_id).toBe("doc-main");
    expect(row?.block_id).toBe("doc-main");
    expect(row?.char_start).toBe(10);
    expect(row?.char_end).toBe(25);
    expect(row?.original_text).toBe("selected text");
    expect(row?.comment_text).toBe("this needs work");
    expect(row?.created_at).toBeTruthy();
    expect(row?.updated_at).toBeTruthy();
  });

  it("returns annotations filtered by document_id via index", () => {
    for (const [id, doc] of [
      ["a1", "doc-main"],
      ["a2", "doc-main"],
      ["a3", "other-doc"],
    ] as Array<[string, string]>) {
      db.run(
        `INSERT INTO annotations (id, document_id, block_id, char_start, char_end, original_text, comment_text)
         VALUES (?, ?, ?, 0, 5, 'x', 'c')`,
        [id, doc, doc],
      );
    }

    const rows = db
      .query(`SELECT id FROM annotations WHERE document_id = ? ORDER BY id`)
      .all("doc-main") as Array<{ id: string }>;

    expect(rows.map((r) => r.id)).toEqual(["a1", "a2"]);
  });

  it("migration is idempotent (CREATE TABLE IF NOT EXISTS)", () => {
    const migDir = join(import.meta.dir, "../../src/db/migrations");
    const sql = readFileSync(join(migDir, "005_annotations.sql"), "utf-8");
    expect(() => db.exec(sql)).not.toThrow();
  });
});
