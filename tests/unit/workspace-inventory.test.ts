import { describe, expect, it } from "bun:test";
import {
  createWorkspaceDocumentId,
  scanWorkspaceDirectory,
  shouldSkipWorkspacePath,
} from "../../web/src/features/workspace/workspaceInventory";
import type {
  WorkspaceDirectoryHandle,
  WorkspaceFileHandle,
  WorkspaceHandle,
} from "../../web/src/features/workspace/workspaceTypes";

function file(name: string, content = ""): WorkspaceFileHandle {
  return {
    kind: "file",
    name,
    getFile: async () => new File([content], name, { type: "text/markdown" }),
  };
}

function directory(name: string, children: WorkspaceHandle[]): WorkspaceDirectoryHandle {
  return {
    kind: "directory",
    name,
    async *entries() {
      for (const child of children) {
        yield [child.name, child] as [string, WorkspaceHandle];
      }
    },
  };
}

describe("workspace inventory", () => {
  it("lists visible Markdown files with workspace-relative identities", async () => {
    const root = directory("writing", [
      file("draft.md"),
      file("outline.markdown"),
      file("notes.txt"),
      directory("sources", [
        file("draft.md"),
      ]),
    ]);

    const files = await scanWorkspaceDirectory(root);

    expect(files.map((entry) => entry.relativePath)).toEqual([
      "draft.md",
      "outline.markdown",
      "sources/draft.md",
    ]);
    expect(files[0].id).toBe(createWorkspaceDocumentId("writing", "draft.md"));
    expect(files[2].id).not.toBe(files[0].id);
  });

  it("skips hidden, backup, archive, dependency, and generated paths", async () => {
    const root = directory("writing", [
      file(".secret.md"),
      file("draft.md~"),
      file("draft.md.bak"),
      file("actual.md"),
      file("summary.generated.md"),
      directory(".obsidian", [file("private.md")]),
      directory("archive", [file("old.md")]),
      directory("node_modules", [file("package.md")]),
      directory("generated", [file("auto.md")]),
    ]);

    const files = await scanWorkspaceDirectory(root);

    expect(files.map((entry) => entry.relativePath)).toEqual(["actual.md"]);
  });

  it("honors the scan depth limit", async () => {
    const root = directory("writing", [
      directory("level-1", [
        directory("level-2", [
          directory("level-3", [
            file("too-deep.md"),
          ]),
        ]),
      ]),
      file("root.md"),
    ]);

    const files = await scanWorkspaceDirectory(root, { maxDepth: 2 });

    expect(files.map((entry) => entry.relativePath)).toEqual(["root.md"]);
  });

  it("classifies skipped path segments without reading files", () => {
    expect(shouldSkipWorkspacePath([".private", "note.md"], "file")).toBe(true);
    expect(shouldSkipWorkspacePath(["archive", "note.md"], "file")).toBe(true);
    expect(shouldSkipWorkspacePath(["notes", "note.md"], "file")).toBe(false);
  });
});
