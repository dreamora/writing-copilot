import { describe, expect, it } from "bun:test";
import {
  applySuggestionToDocument,
  createLineNumberLookup,
  getLineNumberForOffset,
} from "../../web/src/features/editor/documentEditing";
import type { Suggestion } from "../../src/domain/suggestions/suggestion-types";

function makeSuggestion(overrides: Partial<Suggestion>): Suggestion {
  return {
    id: "s-1",
    documentId: "doc-1",
    blockId: "line-1",
    actionType: "rewrite",
    selectedText: "target",
    charStart: 0,
    charEnd: 6,
    contextBefore: "",
    contextAfter: "",
    issueSummary: "issue",
    rationale: "rationale",
    proposedText: "replacement",
    editorRole: "professional-lector",
    workflowStage: "final-output",
    lenses: [],
    provocations: [],
    status: "open",
    createdAt: "2026-05-18T00:00:00.000Z",
    updatedAt: "2026-05-18T00:00:00.000Z",
    ...overrides,
  };
}

describe("document editing helpers", () => {
  it("uses direct offsets when the stored selection still matches", () => {
    const content = "before target after";
    const suggestion = makeSuggestion({ charStart: 7, charEnd: 13 });

    const result = applySuggestionToDocument(content, suggestion, "replacement");

    expect(result.content).toBe("before replacement after");
    expect(result.charStart).toBe(7);
  });

  it("falls back to the nearest unique matching selection instead of the first occurrence", () => {
    const content = "target before\nmiddle target after";
    const suggestion = makeSuggestion({ charStart: 21, charEnd: 30 });

    const result = applySuggestionToDocument(content, suggestion, "replacement");

    expect(result.content).toBe("target before\nmiddle replacement after");
    expect(result.charStart).toBe(21);
  });

  it("fails when duplicate fallback matches are equally likely", () => {
    const content = "target\nmiddle\ntarget";
    const suggestion = makeSuggestion({ charStart: 7, charEnd: 13 });

    expect(() => applySuggestionToDocument(content, suggestion, "replacement")).toThrow(
      "multiple equally likely locations",
    );
  });

  it("supports precomputed line-number lookup", () => {
    const content = "one\ntwo\nthree";
    const lookup = createLineNumberLookup(content);

    expect(lookup(0)).toBe(1);
    expect(lookup(4)).toBe(2);
    expect(lookup(content.length)).toBe(3);
    expect(getLineNumberForOffset(content, 8)).toBe(3);
  });
});
