import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import {
  fetchAnnotations,
  postAnnotation,
  deleteAnnotationRequest,
} from "../../web/src/features/annotations/annotationApi";

const realFetch = globalThis.fetch;

interface FetchCall {
  url: string;
  method: string;
  body?: string;
}

let calls: FetchCall[] = [];
let nextResponse: { status: number; body: unknown } = { status: 200, body: [] };

function installFetch() {
  globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({
      url,
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? init.body : undefined,
    });
    const r = nextResponse;
    return new Response(r.status === 204 ? null : JSON.stringify(r.body), {
      status: r.status,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  calls = [];
  nextResponse = { status: 200, body: [] };
  installFetch();
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("annotationApi", () => {
  it("fetchAnnotations GETs the documents endpoint and returns the list", async () => {
    nextResponse = {
      status: 200,
      body: [
        {
          id: "a1",
          documentId: "doc-1",
          blockId: "doc-1",
          charStart: 0,
          charEnd: 5,
          originalText: "hello",
          commentText: "hi",
          createdAt: "2026-05-16T00:00:00.000Z",
          updatedAt: "2026-05-16T00:00:00.000Z",
        },
      ],
    };
    const list = await fetchAnnotations("doc-1");
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("a1");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/api/documents/doc-1/annotations");
    expect(calls[0].method).toBe("GET");
  });

  it("fetchAnnotations URL-encodes the documentId", async () => {
    nextResponse = { status: 200, body: [] };
    await fetchAnnotations("doc with spaces");
    expect(calls[0].url).toContain("/api/documents/doc%20with%20spaces/annotations");
  });

  it("fetchAnnotations throws on non-ok response with server error message", async () => {
    nextResponse = { status: 500, body: { error: "boom" } };
    await expect(fetchAnnotations("doc-1")).rejects.toThrow(/Load failed: boom/);
  });

  it("postAnnotation POSTs JSON body and returns created annotation", async () => {
    nextResponse = {
      status: 201,
      body: {
        id: "a2",
        documentId: "doc-1",
        blockId: "doc-1",
        charStart: 3,
        charEnd: 8,
        originalText: "world",
        commentText: "comment",
        createdAt: "2026-05-16T00:00:00.000Z",
        updatedAt: "2026-05-16T00:00:00.000Z",
      },
    };
    const created = await postAnnotation("doc-1", {
      blockId: "doc-1",
      charStart: 3,
      charEnd: 8,
      originalText: "world",
      commentText: "comment",
    });
    expect(created.id).toBe("a2");
    expect(calls[0].method).toBe("POST");
    expect(calls[0].body).toBeDefined();
    const sent = JSON.parse(calls[0].body!) as { commentText: string; charStart: number };
    expect(sent.commentText).toBe("comment");
    expect(sent.charStart).toBe(3);
  });

  it("postAnnotation throws on validation error from server", async () => {
    nextResponse = { status: 400, body: { error: "invalid range" } };
    await expect(
      postAnnotation("doc-1", {
        blockId: "doc-1",
        charStart: 10,
        charEnd: 5,
        originalText: "x",
        commentText: "y",
      }),
    ).rejects.toThrow(/Create failed: invalid range/);
  });

  it("deleteAnnotationRequest DELETEs the annotation by id", async () => {
    nextResponse = { status: 204, body: null };
    await deleteAnnotationRequest("a1");
    expect(calls[0].method).toBe("DELETE");
    expect(calls[0].url).toContain("/api/annotations/a1");
  });

  it("deleteAnnotationRequest throws when annotation not found", async () => {
    nextResponse = { status: 404, body: { error: "not found" } };
    await expect(deleteAnnotationRequest("missing")).rejects.toThrow(/Delete failed: not found/);
  });

  it("deleteAnnotationRequest URL-encodes the id", async () => {
    nextResponse = { status: 204, body: null };
    await deleteAnnotationRequest("id/with/slashes");
    expect(calls[0].url).toContain("/api/annotations/id%2Fwith%2Fslashes");
  });
});
