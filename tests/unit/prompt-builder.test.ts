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

  it("includes explicitly selected workspace context when provided", () => {
    const prompt = buildPrompt({
      ...BASE_REQ,
      workspaceContext: {
        budget: 1000,
        totalIncludedChars: 42,
        items: [
          {
            documentId: "workspace:abc:sources/source.md",
            title: "source.md",
            relativePath: "sources/source.md",
            inclusionMode: "full",
            content: "Grounding note says the claim needs evidence.",
            charCount: 42,
            includedCharCount: 42,
            contentHash: "hash-1",
            warningKinds: [],
          },
        ],
      },
    });

    expect(prompt).toContain("---SELECTED WORKSPACE CONTEXT---");
    expect(prompt).toContain("Workspace-relative path: sources/source.md");
    expect(prompt).toContain("Grounding note says the claim needs evidence.");
    expect(prompt).toContain("Do not imply a document influenced your answer");
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
    expect(prompt).toContain("shownEdit");
    expect(prompt).toContain("lenses");
    expect(prompt).toContain("provocations");
  });

  it("defaults to professional lector guidance", () => {
    const prompt = buildPrompt(BASE_REQ);
    expect(prompt).toContain("Professional lector");
    expect(prompt).toContain("Preserve meaning before improving style.");
  });

  it("injects anti-whimsy guidance for joyful but adult mode", () => {
    const prompt = buildPrompt({ ...BASE_REQ, editorRole: "joyful-but-adult" });
    expect(prompt).toContain("Joyful but adult");
    expect(prompt).toContain("sparkling little unicorn");
    expect(prompt).toContain("not through cuteness");
  });

  it("injects Marc voice profile when requested", () => {
    const prompt = buildPrompt({ ...BASE_REQ, editorRole: "marc-voice" });
    expect(prompt).toContain("Marc voice");
    expect(prompt).toContain("Grounded, sharp, practical, adult, and agency-oriented");
    expect(prompt).toContain("The more you automate, the less you actually understand.");
  });

  it("frames source processing as lens-driven material engagement", () => {
    const prompt = buildPrompt({
      ...BASE_REQ,
      workflowStage: "source-processing",
      activeLens: "evidence-quality",
    });

    expect(prompt).toContain("---TOOL-FOR-THOUGHT MODE---");
    expect(prompt).toContain("SOURCE PROCESSING");
    expect(prompt).toContain("Active lens: Evidence quality");
    expect(prompt).toContain("Role-specific lens behavior");
    expect(prompt).toContain("Lenses are task-specific micro-representations");
    expect(prompt).toContain("Preserve material engagement");
  });

  it("frames final output as shown edit plus provocations", () => {
    const prompt = buildPrompt({
      ...BASE_REQ,
      workflowStage: "final-output",
    });

    expect(prompt).toContain("FINAL OUTPUT WRITING");
    expect(prompt).toContain("shown edit");
    expect(prompt).toContain("Provocations are not meant to be accepted every time");
    expect(prompt).toContain("critiques, alternatives, counterarguments, fallacy checks, or lateral moves");
  });

  it("makes rigorous reviewer evidence clarification a claim support stress test", () => {
    const prompt = buildPrompt({
      ...BASE_REQ,
      editorRole: "rigorous-reviewer",
      actionType: "clarify",
      activeLens: "evidence-quality",
    });

    expect(prompt).toContain("Rigorous reviewer");
    expect(prompt).toContain("Clarify by exposing the claim, support, and missing assumption.");
    expect(prompt).toContain("Stress-test support, source quality, and claim strength");
    expect(prompt).toContain("Challenge unsupported claims.");
  });

  it("makes precise editor evidence clarification constrain claims", () => {
    const prompt = buildPrompt({
      ...BASE_REQ,
      editorRole: "precise-editor",
      actionType: "clarify",
      activeLens: "evidence-quality",
    });

    expect(prompt).toContain("Precise editor");
    expect(prompt).toContain("Clarify by removing ambiguity and narrowing scope.");
    expect(prompt).toContain("Constrain the claim to what the evidence can support.");
    expect(prompt).toContain("Narrow claims to the support available.");
  });

  it("supports role-specific action guidance", () => {
    const prompt = buildPrompt({
      ...BASE_REQ,
      editorRole: "sharp-stylist",
      actionType: "sharpen-contrast",
      activeLens: "reader-friction",
    });

    expect(prompt).toContain("Sharp stylist");
    expect(prompt).toContain("Sharpen contrast");
    expect(prompt).toContain("Sharpen the contrast in the selected span");
    expect(prompt).toContain("Use style to remove friction and sharpen the reader path.");
  });

  it("keeps Marc voice agency framing grounded instead of motivational", () => {
    const prompt = buildPrompt({
      ...BASE_REQ,
      editorRole: "marc-voice",
      actionType: "agency-frame",
      activeLens: "voice-fidelity",
    });

    expect(prompt).toContain("Marc voice");
    expect(prompt).toContain("agency-oriented");
    expect(prompt).toContain("Do not produce generic motivational prose.");
    expect(prompt).toContain("no em-dash performance");
    expect(prompt).toContain("no AI-smooth connective sludge");
    expect(prompt).toContain("Do not use em dashes in proposedText");
    expect(prompt).toContain("Avoid AI-smooth connective filler");
  });

  it("blocks Marc voice rewrite from becoming LinkedIn-style creator packaging", () => {
    const prompt = buildPrompt({
      ...BASE_REQ,
      editorRole: "marc-voice",
      actionType: "rewrite",
      activeLens: "voice-fidelity",
      selection: {
        charStart: 0,
        charEnd: 143,
        selectedText:
          "AI does not need to be perfect to be useful. It needs to help me think better without taking the judgment away from me.",
      },
    });

    expect(prompt).toContain("Make the smallest local rewrite that preserves the selected span's structure");
    expect(prompt).toContain("no creator-cadence packaging");
    expect(prompt).toContain("no invented bullet conversion");
    expect(prompt).toContain("The selected text is prose; proposedText must remain prose");
    expect(prompt).toContain("Do not add a closing question");
    expect(prompt).toContain("Do not add new claims, examples, lessons, timelines, or audience prompts.");
    expect(prompt).toContain("Do not turn the selected passage into a social post");
    expect(prompt).toContain("Avoid LinkedIn creator cadence");
    expect(prompt).toContain("Marc voice preserves structure without creator sludge");
    expect(prompt).toContain("What has AI actually improved for you");
  });

  it("preserves existing Marc voice list and question structure while blocking generic substitutions", () => {
    const prompt = buildPrompt({
      ...BASE_REQ,
      editorRole: "marc-voice",
      actionType: "rewrite",
      activeLens: "voice-fidelity",
      selection: {
        charStart: 0,
        charEnd: 500,
        selectedText:
          "One of the biggest lessons I have learned from working with AI over the past two years is that it does not need to be perfect to be useful.\n\nIt needs to be useful in the right ways:\n\n- challenge my thinking and sharpen my reasoning\n- break down ideas so I understand them more deeply\n- give me a solid starting point so I can try, fail, and learn fast\n\nI do not need AI to outsource my judgment.\n\nI need it to raise the quality of my thinking.\n\nWhat has AI genuinely improved for you, and where does it still fall short?",
      },
    });

    expect(prompt).toContain("The selected text already uses list structure; preserve or repair that structure only if it serves the selected span.");
    expect(prompt).toContain("The selected text already ends as a question; keep a question only if it remains the local edit.");
    expect(prompt).toContain("The bad version keeps the broad format but sands away specificity");
    expect(prompt).toContain("The good version preserves the list and question because they are in the source");
    expect(prompt).toContain("I do not need AI to outsource my judgment.");
    expect(prompt).toContain("What has AI genuinely improved for you, and where does it still fall short?");
  });

  it("makes de-slop diagnose AI residue without fake human errors", () => {
    const prompt = buildPrompt({
      ...BASE_REQ,
      editorRole: "marc-voice",
      actionType: "de-slop",
      activeLens: "voice-fidelity",
      selection: {
        charStart: 0,
        charEnd: 210,
        selectedText:
          "This is not just about productivity, but about unlocking a deeper way of thinking that empowers us to move forward with clarity.",
      },
    });

    expect(prompt).toContain("De-slop");
    expect(prompt).toContain("AI residue");
    expect(prompt).toContain("template cadence");
    expect(prompt).toContain("controlled roughness");
    expect(prompt).toContain("no random typos");
    expect(prompt).toContain("no fake human errors");
    expect(prompt).toContain("The selected text is prose; proposedText must remain prose");
    expect(prompt).toContain("Voice fidelity");
  });
});
