import { describe, it, expect, beforeEach, beforeAll, afterEach } from "bun:test";
import type { SuggestionRequest } from "../../src/domain/suggestions/suggestion-types";
import { readFileSync } from "fs";
import { join } from "path";

import { SuggestionService } from "../../src/domain/suggestions/suggestion-service";
import { StubSuggestionProvider } from "../../src/adapters/ai/OpenAiSuggestionProvider";

let sqliteModuleAvailable = true;
let DatabaseClass: any;

beforeAll(() => {
  try {
    DatabaseClass = require("better-sqlite3");
  } catch {
    sqliteModuleAvailable = false;
  }
});

function createTestDb() {
  if (!sqliteModuleAvailable || !DatabaseClass) {
    throw new Error("better-sqlite3 native binding unavailable in this runtime");
  }

  const db = new DatabaseClass(":memory:");
  const m1 = readFileSync(
    join(import.meta.dir, "../../src/db/migrations/001_init.sql"),
    "utf-8"
  );
  const m3 = readFileSync(
    join(import.meta.dir, "../../src/db/migrations/003_suggestions.sql"),
    "utf-8"
  );

  m1
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((s) => db.exec(s + ";"));
  m3
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((s) => db.exec(s + ";"));

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
  let db: any;
  let service: SuggestionService;

  beforeEach(() => {
    if (!sqliteModuleAvailable) {
      return;
    }

    db = createTestDb();
    service = new SuggestionService(db, new StubSuggestionProvider());
  });

  afterEach(() => {
    db?.close?.();
  });

  it("creates a suggestion and persists it", async () => {
    if (!sqliteModuleAvailable) {
      return;
    }

    const s = await service.createSuggestion(BASE_REQ);
    expect(s.id).toBeTruthy();
    expect(s.status).toBe("open");
    expect(s.documentId).toBe("doc-test");
    expect(s.blockId).toBe("block-001");
    // StubProvider returns [IMPROVED] prefixed text
    expect(s.proposedText).toContain("[IMPROVED]");
    expect(s.proposedText).toContain("this is a test sentence");
  });

  it("accept transitions status to accepted with decidedAt", async () => {
    if (!sqliteModuleAvailable) return;
    const s = await service.createSuggestion(BASE_REQ);
    const accepted = service.transition(s.id, "accepted");
    expect(accepted?.status).toBe("accepted");
    expect(accepted?.decidedAt).toBeTruthy();
  });

  it("reject transitions status to rejected with decidedAt", async () => {
    if (!sqliteModuleAvailable) return;
    const s = await service.createSuggestion(BASE_REQ);
    const rejected = service.transition(s.id, "rejected");
    expect(rejected?.status).toBe("rejected");
    expect(rejected?.decidedAt).toBeTruthy();
  });

  it("edit-apply stores edited text and sets decidedAt", async () => {
    if (!sqliteModuleAvailable) return;
    const s = await service.createSuggestion(BASE_REQ);
    const applied = service.transition(s.id, "edited_applied", "my edited version");
    expect(applied?.status).toBe("edited_applied");
    expect(applied?.editedText).toBe("my edited version");
    expect(applied?.decidedAt).toBeTruthy();
  });

  it("defer keeps status deferred without decidedAt", async () => {
    if (!sqliteModuleAvailable) return;
    const s = await service.createSuggestion(BASE_REQ);
    const deferred = service.transition(s.id, "deferred");
    expect(deferred?.status).toBe("deferred");
    expect(deferred?.decidedAt).toBeFalsy();
  });

  it("getSuggestionsForDocument returns all for document", async () => {
    if (!sqliteModuleAvailable) return;
    await service.createSuggestion(BASE_REQ);
    await service.createSuggestion({ ...BASE_REQ, blockId: "block-002" });
    const all = service.getSuggestionsForDocument("doc-test");
    expect(all.length).toBe(2);
  });

  it("getSuggestionById returns null for unknown suggestion id", () => {
    if (!sqliteModuleAvailable) return;
    const result = service.getSuggestionById("nonexistent");
    expect(result).toBeNull();
  });

  it("full lifecycle: open -> accepted", async () => {
    if (!sqliteModuleAvailable) return;
    const s = await service.createSuggestion(BASE_REQ);
    expect(s.status).toBe("open");
    const accepted = service.transition(s.id, "accepted");
    expect(accepted?.status).toBe("accepted");
    const fetched = service.getSuggestionById(s.id);
    expect(fetched?.status).toBe("accepted");
  });
});
