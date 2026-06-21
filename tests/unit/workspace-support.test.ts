import { describe, expect, it } from "bun:test";
import {
  createWorkspaceDocumentId,
  encodeRelativePath,
  supportsLocalWorkspace,
} from "../../web/src/features/workspace/workspaceInventory";

describe("workspace support", () => {
  it("detects File System Access directory picker support", () => {
    expect(supportsLocalWorkspace({ showDirectoryPicker: async () => ({}) })).toBe(true);
    expect(supportsLocalWorkspace({ showDirectoryPicker: "not a function" })).toBe(false);
    expect(supportsLocalWorkspace({})).toBe(false);
  });

  it("encodes relative paths while preserving folder separators", () => {
    expect(encodeRelativePath("sources/my draft.md")).toBe("sources/my%20draft.md");
  });

  it("derives different workspace document ids for same filenames in different folders", () => {
    const first = createWorkspaceDocumentId("writing", "draft.md");
    const second = createWorkspaceDocumentId("writing", "sources/draft.md");
    const third = createWorkspaceDocumentId("other", "draft.md");

    expect(first).not.toBe(second);
    expect(first).not.toBe(third);
    expect(first.startsWith("workspace:")).toBe(true);
  });
});
