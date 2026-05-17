// Bead 4.6 — Summary export + end-to-end insights with real DB
import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { SuggestionService } from "../../src/domain/suggestions/suggestion-service";
import { StubSuggestionProvider } from "../../src/adapters/ai/OpenAiSuggestionProvider";
import { EventWriter } from "../../src/domain/telemetry/event-writer";
import { RewriteCapture } from "../../src/domain/telemetry/rewrite-capture";
import { BlockTimeTracker } from "../../src/domain/telemetry/block-time";
import { queryAcceptanceByType } from "../../src/domain/insights/acceptance-by-type";
import { queryTimeByBlock } from "../../src/domain/insights/time-by-block";
import { queryRewritePatterns } from "../../src/domain/insights/rewrite-patterns";
import {
  computeHelpedVsSlowed,
  generateSessionSummaryMarkdown,
} from "../../web/src/features/insights/insights-models";
import { readFileSync } from "fs";
import { join } from "path";

function createTestDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode=WAL;");
  const migDir = join(import.meta.dir, "../../src/db/migrations");
  for (const f of ["001_init.sql", "003_suggestions.sql", "004_telemetry.sql", "006_tool_for_thought.sql", "007_professional_mode_context.sql", "008_suggestion_context_provenance.sql"]) {
    db.exec(readFileSync(join(migDir, f), "utf-8"));
  }
  return db;
}

describe("Summary export (integration)", () => {
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

    const docId = "doc-export";
    const sessId = "session-export";

    // Seed: 4 suggestions, 3 accepted, 1 rejected
    const req = (blockId: string) => ({
      documentId: docId, blockId,
      selection: { charStart: 0, charEnd: 5, selectedText: "hello" },
      actionType: "rewrite" as const,
      context: { before: "", after: "" },
    });
    const s1 = await service.createSuggestion(req("b1"), sessId);
    const s2 = await service.createSuggestion(req("b2"), sessId);
    const s3 = await service.createSuggestion(req("b3"), sessId);
    const s4 = await service.createSuggestion(req("b4"), sessId);
    service.transition(s1.id, "accepted", undefined, sessId);
    service.transition(s2.id, "accepted", undefined, sessId);
    service.transition(s3.id, "accepted", undefined, sessId);
    service.transition(s4.id, "rejected", undefined, sessId);

    // Seed: rewrites
    rewrite.record({ sessionId: sessId, documentId: docId, blockId: "b1", beforeText: "old content", afterText: "new content" });

    // Seed: block time
    bt.record({ sessionId: sessId, documentId: docId, blockId: "b1", secondsSpent: 90 });
    bt.record({ sessionId: sessId, documentId: docId, blockId: "b2", secondsSpent: 45 });
  });

  it("acceptance query returns correct data for export", () => {
    const acceptance = queryAcceptanceByType(db, "doc-export");
    expect(acceptance.length).toBeGreaterThan(0);
    const rewriteMetric = acceptance.find((a) => a.actionType === "rewrite");
    expect(rewriteMetric!.accepted).toBe(3);
    expect(rewriteMetric!.total).toBe(4);
    expect(rewriteMetric!.acceptanceRate).toBeCloseTo(0.75);
  });

  it("time query returns block time data", () => {
    const times = queryTimeByBlock(db, "session-export", "doc-export");
    expect(times.length).toBe(2);
    const b1Time = times.find((t) => t.blockId === "b1");
    expect(b1Time!.secondsSpent).toBe(90);
  });

  it("rewrite patterns returns hotspot data", () => {
    const patterns = queryRewritePatterns(db, "doc-export");
    expect(patterns.length).toBeGreaterThan(0);
  });

  it("full export pipeline: DB → models → markdown", () => {
    const acceptance = queryAcceptanceByType(db, "doc-export");
    const time = queryTimeByBlock(db, "session-export", "doc-export");
    const hotspots = queryRewritePatterns(db, "doc-export");
    const helpedVsSlowed = computeHelpedVsSlowed(acceptance, hotspots);

    expect(helpedVsSlowed.netSignal).toBe("helped"); // 75% acceptance, no high hotspots

    const md = generateSessionSummaryMarkdown("session-export", "doc-export", {
      acceptance, time, hotspots, helpedVsSlowed,
    });

    expect(md).toContain("session-export");
    expect(md).toContain("doc-export");
    expect(md).toContain("HELPED");
    expect(md).toContain("rewrite");
    expect(md.length).toBeGreaterThan(300);
  });

  it("helped-vs-slowed correctly identifies helped session", () => {
    const acceptance = queryAcceptanceByType(db, "doc-export");
    const hotspots = queryRewritePatterns(db, "doc-export");
    const result = computeHelpedVsSlowed(acceptance, hotspots);
    expect(result.netSignal).toBe("helped");
    expect(result.acceptanceRate).toBeCloseTo(0.75);
  });
});
