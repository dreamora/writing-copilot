// Bead 1.7 — Round-trip fidelity tests
import { describe, it, expect } from "bun:test";
import { parseMarkdown } from "../../src/domain/blocks/parse-markdown";
import { recomposeMarkdown, normalizeMarkdown } from "../../src/domain/blocks/recompose-markdown";
import { readFileSync } from "fs";
import { join } from "path";

const FIXTURES = join(import.meta.dir, "../fixtures");

function roundTrip(md: string): string {
  return recomposeMarkdown(parseMarkdown(md));
}

describe("Markdown round-trip fidelity", () => {
  it("simple heading + paragraph round-trips", () => {
    const md = "# Title\n\nA paragraph of text.";
    expect(normalizeMarkdown(roundTrip(md))).toBe(normalizeMarkdown(md));
  });

  it("multiple paragraphs round-trip", () => {
    const md = "# Title\n\nFirst paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
    expect(normalizeMarkdown(roundTrip(md))).toBe(normalizeMarkdown(md));
  });

  it("heading types round-trip", () => {
    const md = "# H1\n\n## H2\n\n### H3\n\nA paragraph.";
    expect(normalizeMarkdown(roundTrip(md))).toBe(normalizeMarkdown(md));
  });

  it("list round-trips", () => {
    const md = "- item 1\n- item 2\n- item 3";
    expect(normalizeMarkdown(roundTrip(md))).toBe(normalizeMarkdown(md));
  });

  it("blockquote round-trips", () => {
    const md = "> This is a quote.\n> Line two.";
    expect(normalizeMarkdown(roundTrip(md))).toBe(normalizeMarkdown(md));
  });

  it("sample-basic fixture round-trips", () => {
    const md = readFileSync(join(FIXTURES, "sample-basic.md"), "utf-8");
    expect(normalizeMarkdown(roundTrip(md))).toBe(normalizeMarkdown(md));
  });

  it("sample-nested-list fixture round-trips", () => {
    const md = readFileSync(join(FIXTURES, "sample-nested-list.md"), "utf-8");
    expect(normalizeMarkdown(roundTrip(md))).toBe(normalizeMarkdown(md));
  });

  it("recompose block count matches parse count", () => {
    const md = "# Title\n\nParagraph one.\n\nParagraph two.\n\n- list item";
    const blocks = parseMarkdown(md);
    const recomposed = recomposeMarkdown(blocks);
    const blocks2 = parseMarkdown(recomposed);
    expect(blocks2.length).toBe(blocks.length);
  });
});
