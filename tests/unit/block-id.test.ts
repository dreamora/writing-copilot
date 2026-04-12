// Bead 1.7 — Block ID stability tests
import { describe, it, expect } from "bun:test";
import { parseMarkdown } from "../../src/domain/blocks/parse-markdown";
import { recomposeMarkdown } from "../../src/domain/blocks/recompose-markdown";
import { readFileSync } from "fs";
import { join } from "path";

const FIXTURES = join(import.meta.dir, "../fixtures");

describe("Block ID stability", () => {
  it("same input produces same block IDs (deterministic)", () => {
    const md = "# Title\n\nFirst paragraph.\n\nSecond paragraph.";
    const blocks1 = parseMarkdown(md);
    const blocks2 = parseMarkdown(md);
    expect(blocks1.map((b) => b.id)).toEqual(blocks2.map((b) => b.id));
  });

  it("no-op save (recompose then re-parse) keeps IDs stable", () => {
    const md = "# Title\n\nFirst paragraph.\n\nSecond paragraph.";
    const blocks1 = parseMarkdown(md);
    const recomposed = recomposeMarkdown(blocks1);
    const blocks2 = parseMarkdown(recomposed);
    expect(blocks1.map((b) => b.id)).toEqual(blocks2.map((b) => b.id));
  });

  it("editing one block does not change IDs of other blocks", () => {
    const md = "# Title\n\nFirst paragraph.\n\nSecond paragraph.";
    const blocks1 = parseMarkdown(md);

    // Edit only the second block (index 1)
    const editedBlocks = blocks1.map((b, i) =>
      i === 1 ? { ...b, markdown: "EDITED paragraph." } : b
    );
    const recomposed = recomposeMarkdown(editedBlocks);
    const blocks2 = parseMarkdown(recomposed);

    // Block 0 (heading) should keep same ID
    expect(blocks2[0]!.id).toBe(blocks1[0]!.id);
    // Block 1 (edited) should have different ID
    expect(blocks2[1]!.id).not.toBe(blocks1[1]!.id);
    // Block 2 (untouched) — same content, same sibling index → same ID
    expect(blocks2[2]!.id).toBe(blocks1[2]!.id);
  });

  it("produces unique IDs for different blocks", () => {
    const md = "# Title\n\nFirst paragraph.\n\nSecond paragraph.";
    const blocks = parseMarkdown(md);
    const ids = blocks.map((b) => b.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("sample-basic fixture: IDs stable on no-op", () => {
    const md = readFileSync(join(FIXTURES, "sample-basic.md"), "utf-8");
    const blocks1 = parseMarkdown(md);
    const blocks2 = parseMarkdown(recomposeMarkdown(blocks1));
    expect(blocks1.map((b) => b.id)).toEqual(blocks2.map((b) => b.id));
  });
});
