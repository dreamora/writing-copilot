import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import WorkspaceSidebar from "../../web/src/features/workspace/WorkspaceSidebar";
import type { WorkspaceFileEntry } from "../../web/src/features/workspace/workspaceTypes";

function entry(relativePath: string): WorkspaceFileEntry {
  const name = relativePath.split("/").pop()!;
  return {
    id: `workspace:abc:${relativePath}`,
    name,
    relativePath,
    extension: name.endsWith(".markdown") ? ".markdown" : ".md",
    status: "available",
    handle: {
      name,
      kind: "file",
      getFile: async () => new File([""], name),
    },
  };
}

function renderSidebar(props: Partial<React.ComponentProps<typeof WorkspaceSidebar>> = {}) {
  const draft = entry("draft.md");
  const source = entry("sources/source.md");
  return renderToStaticMarkup(
    <WorkspaceSidebar
      mode="ready"
      supported
      directoryName="writing"
      files={[draft, source]}
      activeDocumentId={draft.id}
      contextEntries={[source]}
      contextPacket={null}
      onOpenWorkspace={() => {}}
      onCloseWorkspace={() => {}}
      onSelectFile={() => {}}
      onAddContext={() => {}}
      onRemoveContext={() => {}}
      {...props}
    />
  );
}

describe("WorkspaceSidebar", () => {
  it("shows active draft without automatically marking it as context", () => {
    const html = renderSidebar();

    expect(html).toContain("Active draft");
    expect(html).toContain("draft.md");
    expect(html).toContain("Add draft.md to context");
    expect(html).toContain("source.md already in context");
  });

  it("renders unsupported browser fallback state", () => {
    const html = renderSidebar({
      mode: "unsupported",
      supported: false,
      directoryName: undefined,
      files: [],
      activeDocumentId: undefined,
      contextEntries: [],
    });

    expect(html).toContain("Folder picker unavailable");
    expect(html).toContain("Default document mode remains available");
  });
});
