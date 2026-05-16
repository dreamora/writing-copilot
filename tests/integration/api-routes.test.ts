import { beforeEach, describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SuggestionService } from "../../src/domain/suggestions/suggestion-service";
import { StubSuggestionProvider } from "../../src/adapters/ai/OpenAiSuggestionProvider";
import { EventWriter } from "../../src/domain/telemetry/event-writer";
import { RewriteCapture } from "../../src/domain/telemetry/rewrite-capture";
import { BlockTimeTracker } from "../../src/domain/telemetry/block-time";
import { createSuggestionRoutes } from "../../src/routes/suggestions";
import { createTelemetryRoutes } from "../../src/routes/telemetry";

function createTestDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode=WAL;");
  const migDir = join(import.meta.dir, "../../src/db/migrations");
  for (const f of ["001_init.sql", "003_suggestions.sql", "004_telemetry.sql", "006_tool_for_thought.sql"]) {
    db.exec(readFileSync(join(migDir, f), "utf-8"));
  }
  return db;
}

describe("suggestion routes", () => {
  let db: Database;
  let eventWriter: EventWriter;
  let suggestionRoutes: ReturnType<typeof createSuggestionRoutes>;

  beforeEach(() => {
    db = createTestDb();
    eventWriter = new EventWriter(db);
    const service = new SuggestionService(db, new StubSuggestionProvider(), eventWriter);
    suggestionRoutes = createSuggestionRoutes(service);
  });

  it("passes sessionId through create and accept lifecycle routes", async () => {
    const createReq = new Request("http://localhost/api/suggestions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: "route-session",
        documentId: "doc-route",
        blockId: "block-1",
        actionType: "rewrite",
        selection: { charStart: 0, charEnd: 4, selectedText: "text" },
        context: { before: "", after: "" },
      }),
    });

    const createRes = await suggestionRoutes["POST /api/suggestions"](createReq);
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string };

    const acceptReq = new Request(`http://localhost/api/suggestions/${created.id}/accept`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: "route-session" }),
    });

    const acceptRes = await suggestionRoutes["POST /api/suggestions/:id/accept"](acceptReq, created.id);
    expect(acceptRes.status).toBe(200);

    const events = eventWriter.getBySession("route-session");
    const types = events.map((event) => event.eventType);
    expect(types).toContain("suggestion_created");
    expect(types).toContain("suggestion_accepted");
  });
});

describe("telemetry routes", () => {
  let db: Database;
  let eventWriter: EventWriter;
  let rewriteCapture: RewriteCapture;
  let blockTime: BlockTimeTracker;
  let suggestionService: SuggestionService;
  let telemetryRoutes: ReturnType<typeof createTelemetryRoutes>;

  beforeEach(() => {
    db = createTestDb();
    eventWriter = new EventWriter(db);
    rewriteCapture = new RewriteCapture(db);
    blockTime = new BlockTimeTracker(db);
    suggestionService = new SuggestionService(db, new StubSuggestionProvider(), eventWriter);
    telemetryRoutes = createTelemetryRoutes(db);
  });

  it("returns a compact insights summary payload", async () => {
    const suggestion = await suggestionService.createSuggestion(
      {
        documentId: "doc-summary",
        blockId: "block-1",
        actionType: "rewrite",
        selection: { charStart: 0, charEnd: 4, selectedText: "text" },
        context: { before: "alpha", after: "omega" },
      },
      "summary-session"
    );
    suggestionService.transition(suggestion.id, "accepted", undefined, "summary-session");
    rewriteCapture.record({
      sessionId: "summary-session",
      documentId: "doc-summary",
      blockId: "block-1",
      beforeText: "before text",
      afterText: "after text",
    });
    blockTime.record({
      sessionId: "summary-session",
      documentId: "doc-summary",
      blockId: "block-1",
      secondsSpent: 42,
    });

    const req = new Request(
      "http://localhost/api/insights/summary?documentId=doc-summary&sessionId=summary-session&q=STUB&limit=5"
    );
    const res = telemetryRoutes["GET /api/insights/summary"](req);
    expect(res.status).toBe(200);
    const payload = (await res.json()) as {
      totals: { suggestions: number; accepted: number; rewrites: number };
      acceptance: Array<{ actionType: string }>;
      timeByBlock: Array<{ blockId: string }>;
      hotspots: Array<{ blockId: string }>;
      search: Array<{ suggestionId: string }>;
      recentSuggestions: Array<{ id: string }>;
      recentRewrites: Array<{ id: string }>;
    };

    expect(payload.totals.suggestions).toBe(1);
    expect(payload.totals.accepted).toBe(1);
    expect(payload.totals.rewrites).toBe(1);
    expect(payload.acceptance[0]?.actionType).toBe("rewrite");
    expect(payload.timeByBlock[0]?.blockId).toBe("block-1");
    expect(payload.hotspots[0]?.blockId).toBe("block-1");
    expect(payload.search[0]?.suggestionId).toBe(suggestion.id);
    expect(payload.recentSuggestions[0]?.id).toBe(suggestion.id);
    expect(payload.recentRewrites.length).toBe(1);
  });
});
