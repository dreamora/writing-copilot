import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { EventWriter } from "../../src/domain/telemetry/event-writer";
import { RewriteCapture } from "../../src/domain/telemetry/rewrite-capture";
import { BlockTimeTracker } from "../../src/domain/telemetry/block-time";
import { SuggestionService } from "../../src/domain/suggestions/suggestion-service";
import { StubSuggestionProvider } from "../../src/adapters/ai/OpenAiSuggestionProvider";
import { readFileSync } from "fs";
import { join } from "path";

function createTestDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode=WAL;");
  const migDir = join(import.meta.dir, "../../src/db/migrations");
  for (const f of ["001_init.sql", "003_suggestions.sql", "004_telemetry.sql", "006_tool_for_thought.sql", "007_professional_mode_context.sql", "008_suggestion_context_provenance.sql"]) {
    const sql = readFileSync(join(migDir, f), "utf-8");
    db.exec(sql);
  }
  return db;
}

describe("Telemetry pipeline (integration)", () => {
  let db: Database;
  let eventWriter: EventWriter;
  let rewriteCapture: RewriteCapture;
  let blockTime: BlockTimeTracker;
  let suggestionService: SuggestionService;

  beforeEach(() => {
    db = createTestDb();
    eventWriter = new EventWriter(db);
    rewriteCapture = new RewriteCapture(db);
    blockTime = new BlockTimeTracker(db);
    suggestionService = new SuggestionService(db, new StubSuggestionProvider(), eventWriter);
  });

  it("suggestion_created emits telemetry event", async () => {
    await suggestionService.createSuggestion({
      documentId: "doc-1", blockId: "b-1",
      selection: { charStart: 0, charEnd: 10, selectedText: "test text" },
      actionType: "rewrite",
      context: { before: "", after: "" },
    }, "session-1");

    const events = eventWriter.getBySession("session-1");
    expect(events.length).toBe(1);
    expect(events[0]!.eventType).toBe("suggestion_created");
    expect(events[0]!.documentId).toBe("doc-1");
  });

  it("suggestion lifecycle actions emit corresponding events", async () => {
    const s = await suggestionService.createSuggestion({
      documentId: "doc-1", blockId: "b-1",
      selection: { charStart: 0, charEnd: 5, selectedText: "hello" },
      actionType: "tighten",
      context: { before: "", after: "" },
    }, "session-2");

    suggestionService.transition(s.id, "accepted", undefined, "session-2");
    const events = eventWriter.getBySession("session-2");
    const types = events.map((e) => e.eventType);
    expect(types).toContain("suggestion_created");
    expect(types).toContain("suggestion_accepted");
  });

  it("reject emits suggestion_rejected event", async () => {
    const s = await suggestionService.createSuggestion({
      documentId: "doc-1", blockId: "b-1",
      selection: { charStart: 0, charEnd: 5, selectedText: "word" },
      actionType: "clarify",
      context: { before: "", after: "" },
    }, "session-3");

    suggestionService.transition(s.id, "rejected", undefined, "session-3");
    const events = eventWriter.getBySession("session-3");
    expect(events.some((e) => e.eventType === "suggestion_rejected")).toBe(true);
  });

  it("edit-apply emits suggestion_edited_then_applied", async () => {
    const s = await suggestionService.createSuggestion({
      documentId: "doc-1", blockId: "b-1",
      selection: { charStart: 0, charEnd: 5, selectedText: "text" },
      actionType: "ask",
      context: { before: "", after: "" },
    }, "session-4");

    suggestionService.transition(s.id, "edited_applied", "my version", "session-4");
    const events = eventWriter.getBySession("session-4");
    expect(events.some((e) => e.eventType === "suggestion_edited_then_applied")).toBe(true);
  });

  it("manual rewrite capture persists before/after/delta", () => {
    const result = rewriteCapture.record({
      sessionId: "session-5",
      documentId: "doc-1",
      blockId: "block-1",
      beforeText: "Original paragraph text.",
      afterText: "Revised paragraph content.",
    });
    expect(result).not.toBeNull();
    expect(result!.deltaMetric).toBeGreaterThan(0);
    expect(result!.deltaMetric).toBeLessThanOrEqual(1);

    const rewrites = rewriteCapture.getByDocument("doc-1");
    expect(rewrites.length).toBe(1);
    expect(rewrites[0]!.beforeText).toBe("Original paragraph text.");
  });

  it("manual rewrite skips identical text", () => {
    const result = rewriteCapture.record({
      sessionId: "s1", documentId: "d1", blockId: "b1",
      beforeText: "same", afterText: "same",
    });
    expect(result).toBeNull();
  });

  it("block time records are queryable per session", () => {
    blockTime.record({ sessionId: "s-time", documentId: "d1", blockId: "b1", secondsSpent: 30 });
    blockTime.record({ sessionId: "s-time", documentId: "d1", blockId: "b2", secondsSpent: 15 });
    blockTime.record({ sessionId: "s-time", documentId: "d1", blockId: "b1", secondsSpent: 10 });

    const records = blockTime.getBySession("s-time");
    expect(records.length).toBe(2); // grouped by blockId
    const b1Record = records.find((r) => r.blockId === "b1");
    expect(b1Record!.secondsSpent).toBe(40); // 30 + 10
  });

  it("block time skips zero seconds", () => {
    const result = blockTime.record({ sessionId: "s1", documentId: "d1", blockId: "b1", secondsSpent: 0 });
    expect(result).toBeNull();
  });
});
