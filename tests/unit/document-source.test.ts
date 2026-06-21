import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  createServerDocumentSource,
  createWorkspaceDocumentSource,
} from "../../web/src/features/editor/documentSource";
import type { WorkspaceFileEntry } from "../../web/src/features/workspace/workspaceTypes";

const realFetch = globalThis.fetch;
let writes: string[] = [];

beforeEach(() => {
  writes = [];
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("document sources", () => {
  it("loads and saves server documents through existing API routes", async () => {
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("/api/docs?")) {
        return Response.json({ content: "server draft", hash: "h1" });
      }
      expect(init?.method).toBe("POST");
      expect(init?.body).toContain("server draft edited");
      return Response.json({ hash: "h2", backupPath: "backup.md", timestamp: "2026-05-18T00:00:00.000Z" });
    }) as unknown as typeof fetch;

    const source = createServerDocumentSource("sample.md");

    await expect(source.load()).resolves.toEqual({ content: "server draft", hash: "h1" });
    await expect(source.save("server draft edited")).resolves.toEqual({
      hash: "h2",
      backupPath: "backup.md",
      savedAt: "2026-05-18T00:00:00.000Z",
    });
  });

  it("loads and saves workspace files through browser file handles", async () => {
    const entry: WorkspaceFileEntry = {
      id: "workspace:abc:draft.md",
      name: "draft.md",
      relativePath: "draft.md",
      extension: ".md",
      status: "available",
      handle: {
        kind: "file",
        name: "draft.md",
        getFile: async () => new File(["workspace draft"], "draft.md"),
        createWritable: async () => ({
          write: async (content: string) => {
            writes.push(content);
          },
          close: async () => {},
        }),
      },
    };

    const source = createWorkspaceDocumentSource(entry);
    const loaded = await source.load();
    const saved = await source.save("workspace draft edited");

    expect(source.documentId).toBe("workspace:abc:draft.md");
    expect(loaded.content).toBe("workspace draft");
    expect(loaded.hash).toBeTruthy();
    expect(writes).toEqual(["workspace draft edited"]);
    expect(saved.backupPath).toBe("");
    expect(saved.hash).toBeTruthy();
  });

  it("throws a recoverable save error when a workspace handle is read-only", async () => {
    const source = createWorkspaceDocumentSource({
      id: "workspace:abc:readonly.md",
      name: "readonly.md",
      relativePath: "readonly.md",
      extension: ".md",
      status: "available",
      handle: {
        kind: "file",
        name: "readonly.md",
        getFile: async () => new File(["readonly"], "readonly.md"),
      },
    });

    await expect(source.save("new content")).rejects.toThrow(/not writable/);
  });
});
