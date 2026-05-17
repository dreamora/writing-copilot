import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Suggestion } from "../../src/domain/suggestions/suggestion-types";
import ReviewThreadList from "../../web/src/features/suggestions/ReviewThreadList";

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

function renderReviewThreadList(suggestions: Suggestion[]) {
  return renderToStaticMarkup(
    <ReviewThreadList
      content="alpha\nbeta\ngamma"
      suggestions={suggestions}
      onAccept={async () => {}}
      onReject={async () => {}}
      onEditApply={async () => {}}
      onDefer={async () => {}}
      onReopen={async () => {}}
    />
  );
}

describe("ReviewThreadList", () => {
  it("renders active threads first and keeps history collapsed by default when active work exists", () => {
    const html = renderReviewThreadList([
      makeSuggestion("open-1", "open"),
      makeSuggestion("accepted-1", "accepted"),
    ]);

    expect(html).toContain("Actionable now");
    expect(html).toContain("open-1 issue");
    expect(html).not.toContain("accepted-1 issue");
    expect(html).not.toContain("<details open");
  });

  it("shows the professional mode, specialist action, and curated lens context", () => {
    const suggestion = {
      ...makeSuggestion("mode-1", "open"),
      editorRole: "marc-voice",
      actionType: "agency-frame",
      activeLens: "voice-fidelity",
      shownEdit: {
        editType: "agency frame",
        proposedText: "Agency is the point.",
        whyThisEdit: "It makes responsibility visible.",
      },
    } satisfies Suggestion;

    const html = renderReviewThreadList([suggestion]);

    expect(html).toContain("Marc voice");
    expect(html).toContain("Agency frame");
    expect(html).toContain("Voice fidelity");
    expect(html).toContain("It makes responsibility visible.");
  });

  it("shows the de-slop action context in review threads", () => {
    const suggestion = {
      ...makeSuggestion("deslop-1", "open"),
      editorRole: "marc-voice",
      actionType: "de-slop",
      activeLens: "voice-fidelity",
    } satisfies Suggestion;

    const html = renderReviewThreadList([suggestion]);

    expect(html).toContain("Marc voice");
    expect(html).toContain("De-slop");
    expect(html).toContain("Voice fidelity");
  });

  it("keeps settled history collapsed when no actionable threads remain", () => {
    const html = renderReviewThreadList([
      makeSuggestion("accepted-1", "accepted"),
    ]);

    expect(html).not.toContain("accepted-1 issue");
    expect(html).not.toContain("<details open");
  });

  it("keeps deferred threads collapsed outside the actionable queue", () => {
    const html = renderReviewThreadList([
      makeSuggestion("deferred-1", "deferred"),
    ]);

    expect(html).toContain("Actionable now");
    expect(html).toContain("Deferred for later");
    expect(html).toContain("No open review threads");
    expect(html).not.toContain("deferred-1 issue");
    expect(html).not.toContain("aria-label=\"Reopen suggestion\"");
    expect(html).not.toContain("<details open");
  });

  it("keeps the empty state when there are no suggestions", () => {
    const html = renderReviewThreadList([]);

    expect(html).toContain("Select any span in the full document");
    expect(html).not.toContain("aria-expanded");
  });
});
