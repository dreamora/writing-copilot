import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { SuggestionService } from "../../src/domain/suggestions/suggestion-service";
import { StubSuggestionProvider } from "../../src/adapters/ai/OpenAiSuggestionProvider";
import { EventWriter } from "../../src/domain/telemetry/event-writer";
import { RewriteCapture } from "../../src/domain/telemetry/rewrite-capture";
import { BlockTimeTracker } from "../../src/domain/telemetry/block-time";
import { queryAcceptanceByType } from "../../src/domain/insights/acceptance-by-type";
import { queryTimeByBlock } from "../../src/domain/insights/time-by-block";
import { queryRewritePatterns, searchSuggestions } from "../../src/domain/insights/rewrite-patterns";
import { readFileSync } from "fs";
import { join } from "path";

function createTestDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode=WAL;");
  const migDir = join(import.meta.dir, "../../src/db/migrations");
  for (const f of ["001_init.sql", "003_suggestions.sql", "004_telemetry.sql", "006_tool_for_thought.sql", "007_professional_mode_context.sql"]) {
    const sql = readFileSync(join(migDir, f), "utf-8");
    db.exec(sql);
  }
  return db;
}

const BASE = {
  documentId: "doc-insights",
  context: { before: "ctx before", after: "ctx after" },
};

describe("Insights queries (integration)", () => {
  let db: Database;
  let service: SuggestionService;
  let rewrite: RewriteCapture;
  let bt: BlockTimeTracker;

  beforeEach(async () => {
    db = createTestDb();
    const ew = new EventWriter(db);
    service = new SuggestionService(db, new StubSuggestionProvider(), ew);
    rewrite = new RewriteCapture(db);
    bt = new BlockTimeTracker(db);

    // Seed: 3 rewrite suggestions, accept 2, reject 1
    const s1 = await service.createSuggestion({ ...BASE, blockId: "b1", actionType: "rewrite", selection: { charStart: 0, charEnd: 4, selectedText: "text" } });
    const s2 = await service.createSuggestion({ ...BASE, blockId: "b2", actionType: "rewrite", selection: { charStart: 0, charEnd: 4, selectedText: "word" } });
    const s3 = await service.createSuggestion({ ...BASE, blockId: "b3", actionType: "tighten", selection: { charStart: 0, charEnd: 4, selectedText: "long" } });
    service.transition(s1.id, "accepted");
    service.transition(s2.id, "accepted");
    service.transition(s3.id, "rejected");

    // Seed: rewrites
    rewrite.record({ sessionId: "s1", documentId: "doc-insights", blockId: "b1", beforeText: "old text here", afterText: "new text" });
    rewrite.record({ sessionId: "s1", documentId: "doc-insights", blockId: "b1", beforeText: "another old", afterText: "another new" });

    // Seed: block time
    bt.record({ sessionId: "s1", documentId: "doc-insights", blockId: "b1", secondsSpent: 60 });
    bt.record({ sessionId: "s1", documentId: "doc-insights", blockId: "b2", secondsSpent: 30 });
  });

  it("acceptance-by-type returns correct acceptance rates", () => {
    const metrics = queryAcceptanceByType(db, "doc-insights");
    const rewriteMetric = metrics.find((m) => m.actionType === "rewrite");
    expect(rewriteMetric).toBeDefined();
    expect(rewriteMetric!.accepted).toBe(2);
    expect(rewriteMetric!.total).toBe(2);
    expect(rewriteMetric!.acceptanceRate).toBe(1.0);

    const tightenMetric = metrics.find((m) => m.actionType === "tighten");
    expect(tightenMetric!.rejected).toBe(1);
    expect(tightenMetric!.acceptanceRate).toBe(0);
  });

  it("time-by-block returns aggregated seconds", () => {
    const times = queryTimeByBlock(db, "s1", "doc-insights");
    expect(times.length).toBe(2);
    const b1 = times.find((t) => t.blockId === "b1");
    expect(b1!.secondsSpent).toBe(60);
  });

  it("rewrite-patterns identifies high-frequency blocks", () => {
    const patterns = queryRewritePatterns(db, "doc-insights");
    expect(patterns.length).toBeGreaterThan(0);
    const b1Pattern = patterns.find((p) => p.blockId === "b1");
    expect(b1Pattern!.rewriteCount).toBe(2);
  });

  it("FTS5 search returns suggestions matching query", () => {
    const results = searchSuggestions(db, "STUB");
    // StubProvider inserts "[STUB] Improved clarity..." as issueSummary
    expect(results.length).toBeGreaterThan(0);
  });

  it("acceptance-by-type returns empty array for unknown document", () => {
    const metrics = queryAcceptanceByType(db, "nonexistent-doc");
    expect(metrics).toEqual([]);
  });
});
