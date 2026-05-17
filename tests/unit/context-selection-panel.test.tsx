import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ContextSelectionPanel from "../../web/src/features/workspace/ContextSelectionPanel";
import type { ContextPacket } from "../../web/src/features/workspace/contextPacket";
import type { WorkspaceFileEntry } from "../../web/src/features/workspace/workspaceTypes";

function entry(relativePath: string): WorkspaceFileEntry {
  const name = relativePath.split("/").pop()!;
  return {
    id: `workspace:abc:${relativePath}`,
    name,
    relativePath,
    extension: ".md",
    status: "available",
    handle: {
      name,
      kind: "file",
      getFile: async () => new File([""], name),
    },
  };
}

describe("ContextSelectionPanel", () => {
  it("shows packet status for whole, trimmed, and unavailable context", () => {
    const first = entry("sources/a.md");
    const second = entry("sources/b.md");
    const third = entry("sources/c.md");
    const packet: ContextPacket = {
      budget: 10,
      totalIncludedChars: 10,
      hasOmissions: true,
      hasWarnings: false,
      items: [
        { documentId: first.id, title: first.name, relativePath: first.relativePath, inclusionMode: "full", content: "abc", charCount: 3, includedCharCount: 3, warnings: [] },
        { documentId: second.id, title: second.name, relativePath: second.relativePath, inclusionMode: "trimmed", content: "abcdefg", charCount: 20, includedCharCount: 7, warnings: [] },
        { documentId: third.id, title: third.name, relativePath: third.relativePath, inclusionMode: "unavailable", charCount: 0, includedCharCount: 0, warnings: [], error: "permission revoked" },
      ],
    };

    const html = renderToStaticMarkup(
      <ContextSelectionPanel entries={[first, second, third]} packet={packet} onRemoveContext={() => {}} />
    );

    expect(html).toContain("Will send whole");
    expect(html).toContain("Will send trimmed");
    expect(html).toContain("Unavailable");
    expect(html).toContain("permission revoked");
  });

  it("renders an explicit empty state", () => {
    const html = renderToStaticMarkup(
      <ContextSelectionPanel entries={[]} packet={null} onRemoveContext={() => {}} />
    );

    expect(html).toContain("No context selected.");
  });
});
