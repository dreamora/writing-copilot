// Integration tests for suggestion flow (bun:sqlite in-memory + StubSuggestionProvider)
import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { SuggestionService } from "../../src/domain/suggestions/suggestion-service";
import { StubSuggestionProvider } from "../../src/adapters/ai/OpenAiSuggestionProvider";
import { EventWriter } from "../../src/domain/telemetry/event-writer";
import type { SuggestionRequest } from "../../src/domain/suggestions/suggestion-types";
import { readFileSync } from "fs";
import { join } from "path";

function createTestDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode=WAL;");
  const migDir = join(import.meta.dir, "../../src/db/migrations");
  for (const f of ["001_init.sql", "003_suggestions.sql", "004_telemetry.sql"]) {
    db.exec(readFileSync(join(migDir, f), "utf-8"));
  }
  return db;
}

const BASE_REQ: SuggestionRequest = {
  documentId: "doc-test",
  blockId: "block-001",
  selection: { charStart: 5, charEnd: 25, selectedText: "this is a test sentence" },
  actionType: "rewrite",
  context: { before: "Some context before.", after: "Some context after." },
};

describe("Suggestion flow (integration)", () => {
  let db: Database;
  let service: SuggestionService;

  beforeEach(() => {
    db = createTestDb();
    const ew = new EventWriter(db);
    service = new SuggestionService(db, new StubSuggestionProvider(), ew);
  });

  it("creates a suggestion and persists it", async () => {
    const s = await service.createSuggestion(BASE_REQ);
    expect(s.id).toBeTruthy();
    expect(s.status).toBe("open");
    expect(s.documentId).toBe("doc-test");
    expect(s.proposedText).toContain("this is a test sentence");
  });

  it("accept transitions status to accepted with decidedAt", async () => {
    const s = await service.createSuggestion(BASE_REQ);
    const accepted = service.transition(s.id, "accepted");
    expect(accepted?.status).toBe("accepted");
    expect(accepted?.decidedAt).toBeTruthy();
  });

  it("reject transitions status to rejected with decidedAt", async () => {
    const s = await service.createSuggestion(BASE_REQ);
    const rejected = service.transition(s.id, "rejected");
    expect(rejected?.status).toBe("rejected");
    expect(rejected?.decidedAt).toBeTruthy();
  });

  it("edit-apply stores edited text and sets decidedAt", async () => {
    const s = await service.createSuggestion(BASE_REQ);
    const applied = service.transition(s.id, "edited_applied", "my edited version");
    expect(applied?.status).toBe("edited_applied");
    expect(applied?.editedText).toBe("my edited version");
    expect(applied?.decidedAt).toBeTruthy();
  });

  it("defer keeps status deferred without decidedAt", async () => {
    const s = await service.createSuggestion(BASE_REQ);
    const deferred = service.transition(s.id, "deferred");
    expect(deferred?.status).toBe("deferred");
    expect(deferred?.decidedAt).toBeFalsy();
  });

  it("getSuggestionsForDocument returns all for document", async () => {
    await service.createSuggestion(BASE_REQ);
    await service.createSuggestion({ ...BASE_REQ, blockId: "block-002" });
    const all = service.getSuggestionsForDocument("doc-test");
    expect(all.length).toBe(2);
  });

  it("getSuggestionById returns null for unknown suggestion id", () => {
    const result = service.getById("nonexistent");
    expect(result).toBeNull();
  });

  it("full lifecycle: open -> accepted", async () => {
    const s = await service.createSuggestion(BASE_REQ);
    service.transition(s.id, "accepted");
    const fetched = service.getById(s.id);
    expect(fetched?.status).toBe("accepted");
    expect(fetched?.decidedAt).toBeTruthy();
  });
});
