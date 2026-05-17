import { describe, expect, it } from "bun:test";
import {
  createServerDocumentId,
} from "../../web/src/features/editor/documentSource";
import {
  createWorkspaceDocumentId,
} from "../../web/src/features/workspace/workspaceInventory";

describe("document identity", () => {
  it("keeps server document identity separate from workspace identity", () => {
    expect(createServerDocumentId("sample.md")).toStartWith("doc-");
    expect(createWorkspaceDocumentId("writing", "sample.md")).toStartWith("workspace:");
  });

  it("treats rename or move as a new workspace document identity", () => {
    const original = createWorkspaceDocumentId("writing", "draft.md");
    const renamed = createWorkspaceDocumentId("writing", "renamed.md");
    const moved = createWorkspaceDocumentId("writing", "folder/draft.md");

    expect(original).not.toBe(renamed);
    expect(original).not.toBe(moved);
  });
});
