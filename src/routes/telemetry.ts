// Telemetry + insights API routes
import { Database } from "bun:sqlite";
import { EventWriter } from "../domain/telemetry/event-writer";
import { RewriteCapture } from "../domain/telemetry/rewrite-capture";
import { BlockTimeTracker } from "../domain/telemetry/block-time";
import { queryAcceptanceByType } from "../domain/insights/acceptance-by-type";
import { queryTimeByBlock } from "../domain/insights/time-by-block";
import { queryRewritePatterns, searchSuggestions } from "../domain/insights/rewrite-patterns";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export function createTelemetryRoutes(db: Database) {
  const eventWriter = new EventWriter(db);
  const rewriteCapture = new RewriteCapture(db);
  const blockTime = new BlockTimeTracker(db);

  return {
    /** POST /api/telemetry/events */
    "POST /api/telemetry/events": async (req: Request) => {
      let body: Record<string, unknown>;
      try { body = (await req.json()) as Record<string, unknown>; }
      catch { return jsonError("Invalid JSON"); }

      try {
        const event = eventWriter.write(body as Parameters<typeof eventWriter.write>[0]);
        return json(event, 201);
      } catch (e) {
        return jsonError((e as Error).message);
      }
    },

    /** POST /api/telemetry/rewrites */
    "POST /api/telemetry/rewrites": async (req: Request) => {
      let body: Record<string, unknown>;
      try { body = (await req.json()) as Record<string, unknown>; }
      catch { return jsonError("Invalid JSON"); }

      const result = rewriteCapture.record(body as Parameters<typeof rewriteCapture.record>[0]);
      if (!result) return json({ skipped: true, reason: "no meaningful change" });
      return json(result, 201);
    },

    /** POST /api/telemetry/block-time */
    "POST /api/telemetry/block-time": async (req: Request) => {
      let body: Record<string, unknown>;
      try { body = (await req.json()) as Record<string, unknown>; }
      catch { return jsonError("Invalid JSON"); }

      const result = blockTime.record(body as Parameters<typeof blockTime.record>[0]);
      if (!result) return json({ skipped: true, reason: "secondsSpent <= 0" });
      return json(result, 201);
    },

    /** GET /api/insights/acceptance-by-type?documentId=... */
    "GET /api/insights/acceptance-by-type": (req: Request) => {
      const url = new URL(req.url);
      const documentId = url.searchParams.get("documentId") ?? undefined;
      return json(queryAcceptanceByType(db, documentId));
    },

    /** GET /api/insights/time-by-block?sessionId=...&documentId=... */
    "GET /api/insights/time-by-block": (req: Request) => {
      const url = new URL(req.url);
      const sessionId = url.searchParams.get("sessionId") ?? undefined;
      const documentId = url.searchParams.get("documentId") ?? undefined;
      return json(queryTimeByBlock(db, sessionId, documentId));
    },

    /** GET /api/insights/rewrite-patterns?documentId=... */
    "GET /api/insights/rewrite-patterns": (req: Request) => {
      const url = new URL(req.url);
      const documentId = url.searchParams.get("documentId") ?? undefined;
      return json(queryRewritePatterns(db, documentId));
    },

    /** GET /api/insights/search?q=... */
    "GET /api/insights/search": (req: Request) => {
      const url = new URL(req.url);
      const q = url.searchParams.get("q");
      if (!q) return jsonError("Missing q query param");
      const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);
      return json(searchSuggestions(db, q, limit));
    },
  } as const;
}
