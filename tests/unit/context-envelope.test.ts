// Unit tests for context envelope builder
import { describe, it, expect } from "bun:test";
import { buildContextEnvelope } from "../../src/domain/suggestions/context-envelope";
import { parseMarkdown } from "../../src/domain/blocks/parse-markdown";

const MD = "# Title\n\nBefore paragraph.\n\nTarget paragraph.\n\nAfter paragraph.";

describe("Context envelope builder", () => {
  it("returns before and after context for middle block", () => {
    const blocks = parseMarkdown(MD);
    expect(blocks.length).toBe(4);

    // Target is block at index 2 (index 0=heading, 1=before, 2=target, 3=after)
    const targetId = blocks[2]!.id;
    const env = buildContextEnvelope(blocks, targetId);

    expect(env.before).toContain("Before paragraph");
    expect(env.after).toContain("After paragraph");
  });

  it("returns empty before for first block", () => {
    const blocks = parseMarkdown(MD);
    const firstId = blocks[0]!.id;
    const env = buildContextEnvelope(blocks, firstId);
    expect(env.before).toBe("");
  });

  it("returns empty after for last block", () => {
    const blocks = parseMarkdown(MD);
    const lastId = blocks[blocks.length - 1]!.id;
    const env = buildContextEnvelope(blocks, lastId);
    expect(env.after).toBe("");
  });

  it("returns empty for unknown blockId", () => {
    const blocks = parseMarkdown(MD);
    const env = buildContextEnvelope(blocks, "nonexistent-id");
    expect(env.before).toBe("");
    expect(env.after).toBe("");
  });

  it("context is stable and deterministic", () => {
    const blocks = parseMarkdown(MD);
    const id = blocks[2]!.id;
    const env1 = buildContextEnvelope(blocks, id);
    const env2 = buildContextEnvelope(blocks, id);
    expect(env1.before).toBe(env2.before);
    expect(env1.after).toBe(env2.after);
  });
});
