import { describe, expect, it } from "bun:test";
import type { Suggestion } from "../../src/domain/suggestions/suggestion-types";
import { groupReviewThreads } from "../../web/src/features/suggestions/review-thread-groups";

function makeSuggestion(id: string, status: Suggestion["status"]): Suggestion {
  return {
    id,
    documentId: "doc-1",
    blockId: `block-${id}`,
    actionType: "rewrite",
    selectedText: "selected",
    charStart: 0,
    charEnd: 8,
    contextBefore: "",
    contextAfter: "",
    issueSummary: `${id} issue`,
    rationale: `${id} rationale`,
    proposedText: `${id} proposed`,
    workflowStage: "final-output",
    lenses: [],
    provocations: [],
    status,
    createdAt: "2026-05-17T10:00:00.000Z",
    updatedAt: "2026-05-17T10:00:00.000Z",
    decidedAt: status === "open" || status === "deferred" ? undefined : "2026-05-17T10:05:00.000Z",
  };
}

describe("groupReviewThreads", () => {
  it("splits actionable threads, deferred threads, and settled history", () => {
    const grouped = groupReviewThreads([
      makeSuggestion("open-1", "open"),
      makeSuggestion("deferred-1", "deferred"),
      makeSuggestion("accepted-1", "accepted"),
      makeSuggestion("rejected-1", "rejected"),
      makeSuggestion("edited-1", "edited_applied"),
    ]);

    expect(grouped.actionable.map((suggestion) => suggestion.id)).toEqual(["open-1"]);
    expect(grouped.deferred.map((suggestion) => suggestion.id)).toEqual(["deferred-1"]);
    expect(grouped.history.map((suggestion) => suggestion.id)).toEqual(["accepted-1", "rejected-1", "edited-1"]);
  });

  it("keeps history collapsed when only settled threads remain", () => {
    const grouped = groupReviewThreads([
      makeSuggestion("accepted-1", "accepted"),
      makeSuggestion("rejected-1", "rejected"),
    ]);

    expect(grouped.actionable).toEqual([]);
    expect(grouped.deferred).toEqual([]);
    expect(grouped.history.map((suggestion) => suggestion.id)).toEqual(["accepted-1", "rejected-1"]);
  });

  it("keeps unknown statuses visible in the actionable area", () => {
    const unknownSuggestion = {
      ...makeSuggestion("custom-1", "open"),
      status: "paused" as Suggestion["status"],
    } as Suggestion;

    const grouped = groupReviewThreads([
      unknownSuggestion,
    ]);

    expect(grouped.actionable).toEqual([unknownSuggestion]);
    expect(grouped.deferred).toEqual([]);
    expect(grouped.history).toEqual([]);
  });
});
