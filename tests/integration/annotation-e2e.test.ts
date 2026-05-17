// U7 end-to-end smoke test.
//
// Verifies the full annotation contract from the frontend network layer
// (`web/src/features/annotations/annotationApi.ts`) through the route
// handlers (`src/routes/annotations.ts`) and into the service+DB layer.
//
// fetch() is monkey-patched to dispatch into the in-memory route handler
// object, so the test exercises the exact request/response shapes the
// browser uses without needing a live server.
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AnnotationService } from "../../src/domain/annotations/annotation-service";
import { createAnnotationRoutes } from "../../src/routes/annotations";
import {
  fetchAnnotations,
  postAnnotation,
  deleteAnnotationRequest,
} from "../../web/src/features/annotations/annotationApi";

function loadMigrations(db: Database): void {
  const migDir = join(import.meta.dir, "../../src/db/migrations");
  for (const f of ["001_init.sql", "005_annotations.sql"]) {
    db.exec(readFileSync(join(migDir, f), "utf-8"));
  }
}

describe("annotation end-to-end (frontend api -> routes -> service -> db)", () => {
  let db: Database;
  let routes: ReturnType<typeof createAnnotationRoutes>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec("PRAGMA journal_mode=WAL;");
    loadMigrations(db);
    routes = createAnnotationRoutes(new AnnotationService(db));
    originalFetch = globalThis.fetch;

    // Route incoming requests to the matching handler.
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const method = (init?.method ?? "GET").toUpperCase();
      const u = new URL(url, "http://localhost");
      const pathname = u.pathname;

      const listMatch = pathname.match(/^\/api\/documents\/([^/]+)\/annotations$/);
      const deleteMatch = pathname.match(/^\/api\/annotations\/([^/]+)$/);

      let req: Request;
      const body = init?.body;
      const headers = (init?.headers as Record<string, string>) ?? { "content-type": "application/json" };

      if (listMatch && method === "GET") {
        req = new Request(`http://localhost${pathname}`, { method });
        return routes["GET /api/documents/:documentId/annotations"](req, listMatch[1]);
      }
      if (listMatch && method === "POST") {
        req = new Request(`http://localhost${pathname}`, { method, headers, body });
        return routes["POST /api/documents/:documentId/annotations"](req, listMatch[1]);
      }
      if (deleteMatch && method === "DELETE") {
        req = new Request(`http://localhost${pathname}`, { method });
        return routes["DELETE /api/annotations/:id"](req, deleteMatch[1]);
      }
      return new Response("not found", { status: 404 });
    }) as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    db.close();
  });

  it("creates, lists, and deletes an annotation through the full stack", async () => {
    const documentId = "doc-main";

    // Start empty.
    const initial = await fetchAnnotations(documentId);
    expect(initial).toEqual([]);

    // Create.
    const created = await postAnnotation(documentId, {
      blockId: documentId,
      charStart: 5,
      charEnd: 12,
      originalText: "example",
      commentText: "Reconsider this phrasing.",
    });
    expect(created.id).toBeDefined();
    expect(created.documentId).toBe(documentId);
    expect(created.charStart).toBe(5);
    expect(created.charEnd).toBe(12);
    expect(created.originalText).toBe("example");
    expect(created.commentText).toBe("Reconsider this phrasing.");

    // List sees it.
    const afterCreate = await fetchAnnotations(documentId);
    expect(afterCreate).toHaveLength(1);
    expect(afterCreate[0].id).toBe(created.id);

    // Delete.
    await deleteAnnotationRequest(created.id);

    // Empty again.
    const afterDelete = await fetchAnnotations(documentId);
    expect(afterDelete).toEqual([]);
  });

  it("isolates annotations by document id across the wire", async () => {
    await postAnnotation("doc-a", {
      charStart: 0,
      charEnd: 5,
      originalText: "alpha",
      commentText: "note A",
    });
    await postAnnotation("doc-b", {
      charStart: 0,
      charEnd: 5,
      originalText: "alpha",
      commentText: "note B",
    });

    const docA = await fetchAnnotations("doc-a");
    const docB = await fetchAnnotations("doc-b");
    expect(docA).toHaveLength(1);
    expect(docB).toHaveLength(1);
    expect(docA[0].commentText).toBe("note A");
    expect(docB[0].commentText).toBe("note B");
  });

  it("surfaces backend validation errors to the frontend", async () => {
    await expect(
      postAnnotation("doc-main", {
        charStart: 10,
        charEnd: 5, // invalid: end < start
        originalText: "bad",
        commentText: "should fail",
      } as unknown as Parameters<typeof postAnnotation>[1])
    ).rejects.toThrow(/Create failed/);
  });
});
