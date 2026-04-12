// Unit tests for context-envelope builder (Bead 2.2)
import { describe, it, expect } from "bun:test";
import { buildContextEnvelope } from "../../src/domain/suggestions/context-envelope";
import type { Block } from "../../src/domain/blocks/block";

const mockBlocks = (markdowns: string[]): Block[] =>
  markdowns.map((md, i) => ({
    id: `block-${i}`,
    type: "paragraph" as const,
    index: i,
    markdown: md,
  }));

describe("Context Envelope Builder", () => {
  it("handles single block with no surrounding context", () => {
    const blocks = mockBlocks(["Hello world"]);
    const result = buildContextEnvelope(blocks, "block-0");

    expect(result.before).toBe("");
    expect(result.after).toBe("");
  });

  it("includes preceding blocks in before context", () => {
    const blocks = mockBlocks(["First block", "Second block", "Third block"]);
    const result = buildContextEnvelope(blocks, "block-2");

    expect(result.before).toContain("First block");
    expect(result.before).toContain("Second block");
    expect(result.after).toBe("");
  });

  it("includes following blocks in after context", () => {
    const blocks = mockBlocks(["First block", "Second block", "Third block"]);
    const result = buildContextEnvelope(blocks, "block-0");

    expect(result.before).toBe("");
    expect(result.after).toContain("Second block");
    expect(result.after).toContain("Third block");
  });

  it("respects MAX_CONTEXT_CHARS limit (400)", () => {
    const longText = "a".repeat(300);
    const blocks = mockBlocks([
      longText,
      longText,
      "target block",
      longText,
      longText,
    ]);
    const result = buildContextEnvelope(blocks, "block-2");

    // Context should be limited to ~400 chars
    expect(result.before.length).toBeLessThanOrEqual(450); // some tolerance for newlines
    expect(result.after.length).toBeLessThanOrEqual(450);
  });

  it("returns empty for non-existent block id", () => {
    const blocks = mockBlocks(["Block 1", "Block 2"]);
    const result = buildContextEnvelope(blocks, "non-existent");

    expect(result.before).toBe("");
    expect(result.after).toBe("");
  });

  it("sanitizes excessive whitespace", () => {
    const blocks = mockBlocks([
      "Line  1   with   spaces",
      "Line 2",
    ]);
    const result = buildContextEnvelope(blocks, "block-1");

    expect(result.before).not.toMatch(/  {2,}/); // no double spaces
  });
});
