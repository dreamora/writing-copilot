import { describe, expect, it } from "bun:test";
import {
  buildContextPacket,
  toContextProvenance,
} from "../../web/src/features/workspace/contextPacket";
import type { WorkspaceFileEntry } from "../../web/src/features/workspace/workspaceTypes";

function entry(relativePath: string, content: string | Error): WorkspaceFileEntry {
  const name = relativePath.split("/").pop()!;
  return {
    id: `workspace:abc:${relativePath}`,
    name,
    relativePath,
    extension: name.endsWith(".markdown") ? ".markdown" : ".md",
    status: "available",
    handle: {
      kind: "file",
      name,
      getFile: async () => {
        if (content instanceof Error) throw content;
        return new File([content], name, { type: "text/markdown" });
      },
    },
  };
}

function unreadableTextEntry(relativePath: string, size: number): WorkspaceFileEntry {
  const name = relativePath.split("/").pop()!;
  return {
    id: `workspace:abc:${relativePath}`,
    name,
    relativePath,
    extension: ".md",
    status: "available",
    handle: {
      kind: "file",
      name,
      getFile: async () => ({
        name,
        size,
        slice: () => {
          throw new Error("slice should not be called when budget is exhausted");
        },
        text: async () => {
          throw new Error("text should not be called when budget is exhausted");
        },
      } as unknown as File),
    },
  };
}

describe("context packet", () => {
  it("includes selected context files whole while under budget", async () => {
    const packet = await buildContextPacket([
      entry("sources/a.md", "alpha"),
      entry("sources/b.md", "beta"),
    ], { budget: 20 });

    expect(packet.totalIncludedChars).toBe(9);
    expect(packet.hasOmissions).toBe(false);
    expect(packet.items.map((item) => item.inclusionMode)).toEqual(["full", "full"]);
    expect(packet.items[0].content).toBe("alpha");
    expect(packet.items[0].contentHash).toBeTruthy();
  });

  it("trims and omits context when the visible budget is exceeded", async () => {
    const packet = await buildContextPacket([
      entry("a.md", "12345"),
      entry("b.md", "abcdef"),
      entry("c.md", "extra"),
    ], { budget: 8 });

    expect(packet.items.map((item) => item.inclusionMode)).toEqual(["full", "trimmed", "omitted"]);
    expect(packet.items[1].content).toBe("abc");
    expect(packet.items[2].content).toBeUndefined();
    expect(packet.hasOmissions).toBe(true);
  });

  it("does not read omitted file text when the budget is exhausted", async () => {
    const packet = await buildContextPacket([
      entry("a.md", "12345"),
      unreadableTextEntry("b.md", 100_000),
    ], { budget: 5 });

    expect(packet.items[1].inclusionMode).toBe("omitted");
    expect(packet.items[1].charCount).toBe(100_000);
    expect(packet.items[1].content).toBeUndefined();
  });

  it("keeps unavailable selected context visible in the packet", async () => {
    const packet = await buildContextPacket([
      entry("broken.md", new Error("permission revoked")),
    ]);

    expect(packet.items[0].inclusionMode).toBe("unavailable");
    expect(packet.items[0].error).toBe("permission revoked");
  });

  it("produces provenance without full content", async () => {
    const packet = await buildContextPacket([
      entry("secret.md", 'token = "abcdef1234567890"'),
    ]);
    const provenance = toContextProvenance(packet.items);

    expect(provenance[0].relativePath).toBe("secret.md");
    expect(provenance[0].warningKinds).toEqual(["token"]);
    expect(JSON.stringify(provenance)).not.toContain("abcdef1234567890");
  });
});
