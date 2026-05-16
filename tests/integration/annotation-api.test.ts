// Integration test for the annotation REST API.
// Tests the full HTTP request/response cycle through the route handlers
// against an in-memory SQLite DB seeded with the 005_annotations migration.
import { beforeEach, describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AnnotationService } from "../../src/domain/annotations/annotation-service";
import { createAnnotationRoutes } from "../../src/routes/annotations";

function createTestDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode=WAL;");
  const migDir = join(import.meta.dir, "../../src/db/migrations");
  for (const f of ["001_init.sql", "005_annotations.sql"]) {
    db.exec(readFileSync(join(migDir, f), "utf-8"));
  }
  return db;
}

describe("annotation routes", () => {
  let db: Database;
  let routes: ReturnType<typeof createAnnotationRoutes>;

  beforeEach(() => {
    db = createTestDb();
    routes = createAnnotationRoutes(new AnnotationService(db));
  });

  function makeCreateRequest(documentId: string, body: unknown): Request {
    return new Request(`http://localhost/api/documents/${documentId}/annotations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("creates, lists, and deletes an annotation through the full cycle", async () => {
    const documentId = "doc-main";

    const createReq = makeCreateRequest(documentId, {
      blockId: documentId,
      charStart: 0,
      charEnd: 5,
      originalText: "Hello",
      commentText: "Greeting feels weak",
    });
    const createRes = await routes["POST /api/documents/:documentId/annotations"](createReq, documentId);
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string; commentText: string; documentId: string };
    expect(created.id).toBeTruthy();
    expect(created.documentId).toBe(documentId);
    expect(created.commentText).toBe("Greeting feels weak");

    const listReq = new Request(`http://localhost/api/documents/${documentId}/annotations`);
    const listRes = routes["GET /api/documents/:documentId/annotations"](listReq, documentId);
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as Array<{ id: string }>;
    expect(list.length).toBe(1);
    expect(list[0]!.id).toBe(created.id);

    const deleteReq = new Request(`http://localhost/api/annotations/${created.id}`, { method: "DELETE" });
    const deleteRes = routes["DELETE /api/annotations/:id"](deleteReq, created.id);
    expect(deleteRes.status).toBe(204);

    const listAfter = (await routes["GET /api/documents/:documentId/annotations"](listReq, documentId).json()) as unknown[];
    expect(listAfter.length).toBe(0);
  });

  it("isolates annotations per document", async () => {
    const reqA = makeCreateRequest("doc-a", {
      charStart: 0,
      charEnd: 3,
      originalText: "abc",
      commentText: "first",
    });
    const reqB = makeCreateRequest("doc-b", {
      charStart: 0,
      charEnd: 3,
      originalText: "xyz",
      commentText: "second",
    });
    await routes["POST /api/documents/:documentId/annotations"](reqA, "doc-a");
    await routes["POST /api/documents/:documentId/annotations"](reqB, "doc-b");

    const listA = (await routes["GET /api/documents/:documentId/annotations"](
      new Request("http://localhost/api/documents/doc-a/annotations"),
      "doc-a"
    ).json()) as Array<{ commentText: string }>;
    expect(listA.length).toBe(1);
    expect(listA[0]!.commentText).toBe("first");
  });

  it("rejects creation with missing commentText", async () => {
    const req = makeCreateRequest("doc-main", {
      charStart: 0,
      charEnd: 5,
      originalText: "Hello",
      // commentText omitted
    });
    const res = await routes["POST /api/documents/:documentId/annotations"](req, "doc-main");
    expect(res.status).toBe(400);
    const err = (await res.json()) as { error: string };
    expect(err.error).toContain("commentText");
  });

  it("rejects creation with an invalid range (charEnd < charStart)", async () => {
    const req = makeCreateRequest("doc-main", {
      charStart: 10,
      charEnd: 5,
      originalText: "x",
      commentText: "y",
    });
    const res = await routes["POST /api/documents/:documentId/annotations"](req, "doc-main");
    expect(res.status).toBe(400);
  });

  it("rejects creation with non-numeric offsets", async () => {
    const req = makeCreateRequest("doc-main", {
      charStart: "0",
      charEnd: "5",
      originalText: "Hello",
      commentText: "comment",
    });
    const res = await routes["POST /api/documents/:documentId/annotations"](req, "doc-main");
    expect(res.status).toBe(400);
  });

  it("rejects deletion of a nonexistent id with 404", () => {
    const req = new Request("http://localhost/api/annotations/does-not-exist", { method: "DELETE" });
    const res = routes["DELETE /api/annotations/:id"](req, "does-not-exist");
    expect(res.status).toBe(404);
  });

  it("rejects invalid JSON bodies on POST", async () => {
    const req = new Request("http://localhost/api/documents/doc-main/annotations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const res = await routes["POST /api/documents/:documentId/annotations"](req, "doc-main");
    expect(res.status).toBe(400);
  });

  it("defaults blockId to documentId when omitted", async () => {
    const documentId = "doc-main";
    const req = makeCreateRequest(documentId, {
      charStart: 0,
      charEnd: 3,
      originalText: "abc",
      commentText: "no blockId provided",
    });
    const res = await routes["POST /api/documents/:documentId/annotations"](req, documentId);
    expect(res.status).toBe(201);
    const created = (await res.json()) as { blockId: string };
    expect(created.blockId).toBe(documentId);
  });
});
