// Unit tests for prompt builder
import { describe, it, expect } from "bun:test";
import { buildPrompt } from "../../src/domain/suggestions/prompt-builder";
import type { SuggestionRequest } from "../../src/domain/suggestions/suggestion-types";

const BASE_REQ: SuggestionRequest = {
  documentId: "doc-1",
  blockId: "block-1",
  selection: { charStart: 0, charEnd: 20, selectedText: "This is my sentence." },
  actionType: "rewrite",
  context: { before: "Prior paragraph.", after: "Following paragraph." },
};

describe("Prompt builder", () => {
  it("includes selected text in prompt", () => {
    const prompt = buildPrompt(BASE_REQ);
    expect(prompt).toContain("This is my sentence.");
  });

  it("includes context before and after", () => {
    const prompt = buildPrompt(BASE_REQ);
    expect(prompt).toContain("Prior paragraph.");
    expect(prompt).toContain("Following paragraph.");
  });

  it("includes action description for rewrite", () => {
    const prompt = buildPrompt({ ...BASE_REQ, actionType: "rewrite" });
    expect(prompt.toLowerCase()).toContain("rewrite");
  });

  it("includes custom instruction for custom type", () => {
    const prompt = buildPrompt({ ...BASE_REQ, actionType: "custom", customInstruction: "Make it punchier" });
    expect(prompt).toContain("Make it punchier");
  });

  it("includes JSON schema in output format section", () => {
    const prompt = buildPrompt(BASE_REQ);
    expect(prompt).toContain("issueSummary");
    expect(prompt).toContain("proposedText");
  });
});
