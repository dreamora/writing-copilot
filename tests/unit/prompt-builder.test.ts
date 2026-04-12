// Unit tests for prompt builder (Bead 2.4)
import { describe, it, expect } from "bun:test";
import { buildPrompt } from "../../src/domain/suggestions/prompt-builder";
import type { SuggestionRequest } from "../../src/domain/suggestions/suggestion-types";

const createRequest = (overrides: Partial<SuggestionRequest> = {}): SuggestionRequest => ({
  documentId: "doc-1",
  blockId: "block-1",
  selection: {
    charStart: 0,
    charEnd: 5,
    selectedText: "hello",
  },
  actionType: "rewrite",
  context: {
    before: "This is context before.",
    after: "This is context after.",
  },
  ...overrides,
});

describe("Prompt Builder", () => {
  it("builds a prompt for rewrite action", () => {
    const req = createRequest({ actionType: "rewrite" });
    const prompt = buildPrompt(req);

    expect(prompt).toContain("Rewrite"); // Capital R
    expect(prompt).toContain("hello");
    expect(prompt).toContain("clarity and flow");
  });

  it("builds a prompt for tighten action", () => {
    const req = createRequest({ actionType: "tighten" });
    const prompt = buildPrompt(req);

    expect(prompt).toContain("Tighten");
    expect(prompt).toContain("remove redundancy");
  });

  it("builds a prompt for clarify action", () => {
    const req = createRequest({ actionType: "clarify" });
    const prompt = buildPrompt(req);

    expect(prompt).toContain("Clarify");
    expect(prompt).toContain("easier to understand");
  });

  it("includes custom instruction when action is custom", () => {
    const req = createRequest({
      actionType: "custom",
      customInstruction: "Make it rhyme",
    });
    const prompt = buildPrompt(req);

    expect(prompt).toContain("Make it rhyme");
  });

  it("includes context envelope in prompt", () => {
    const req = createRequest();
    const prompt = buildPrompt(req);

    expect(prompt).toContain("CONTEXT BEFORE");
    expect(prompt).toContain("CONTEXT AFTER");
    expect(prompt).toContain("This is context before");
    expect(prompt).toContain("This is context after");
  });

  it("handles missing context gracefully", () => {
    const req = createRequest({
      context: { before: "", after: "" },
    });
    const prompt = buildPrompt(req);

    // When context is empty, those sections are omitted,
    // so we just check the prompt doesn't crash
    expect(prompt).toContain("hello");
    expect(prompt).toContain("TASK");
  });

  it("includes style constraints when provided", () => {
    const req = createRequest({
      style: {
        voice: "formal",
        brevity: "short",
        tone: "professional",
      },
    });
    const prompt = buildPrompt(req);

    expect(prompt).toContain("STYLE CONSTRAINTS");
    expect(prompt).toContain("formal");
    expect(prompt).toContain("short");
    expect(prompt).toContain("professional");
  });

  it("includes JSON response schema in prompt", () => {
    const req = createRequest();
    const prompt = buildPrompt(req);

    expect(prompt).toContain("issueSummary");
    expect(prompt).toContain("proposedText");
    expect(prompt).toContain("rationale");
  });
});
