// Unit tests for response parser
import { describe, it, expect } from "bun:test";
import { parseModelResponse } from "../../src/domain/suggestions/response-parser";

describe("Response parser", () => {
  it("parses valid JSON response", () => {
    const raw = JSON.stringify({
      issueSummary: "Sentence is too wordy.",
      rationale: "Removing redundant words improves clarity.",
      proposedText: "This sentence is clear.",
      confidence: 0.9,
    });
    const result = parseModelResponse(raw);
    expect(result.issueSummary).toBe("Sentence is too wordy.");
    expect(result.proposedText).toBe("This sentence is clear.");
    expect(result.confidence).toBe(0.9);
  });

  it("strips markdown code fences", () => {
    const raw = "```json\n" + JSON.stringify({
      issueSummary: "Issue",
      rationale: "Rationale",
      proposedText: "Better text",
    }) + "\n```";
    const result = parseModelResponse(raw);
    expect(result.issueSummary).toBe("Issue");
  });

  it("extracts JSON from surrounding text", () => {
    const obj = { issueSummary: "X", rationale: "Y", proposedText: "Z" };
    const raw = `Here is my response: ${JSON.stringify(obj)} Done.`;
    const result = parseModelResponse(raw);
    expect(result.proposedText).toBe("Z");
  });

  it("throws on missing required fields", () => {
    const raw = JSON.stringify({ issueSummary: "Only summary" });
    expect(() => parseModelResponse(raw)).toThrow();
  });

  it("throws on non-JSON response", () => {
    expect(() => parseModelResponse("This is just text, no JSON at all!")).toThrow();
  });

  it("accepts null riskNotes", () => {
    const raw = JSON.stringify({
      issueSummary: "Issue",
      rationale: "Rationale",
      proposedText: "Text",
      riskNotes: null,
    });
    const result = parseModelResponse(raw);
    expect(result.riskNotes).toBeUndefined();
  });

  it("parses shown edit, lenses, and provocations metadata", () => {
    const raw = JSON.stringify({
      issueSummary: "The paragraph hides the strategic choice.",
      rationale: "The edit makes the choice visible and testable.",
      proposedText: "We should test the refill offer before scaling the packaging change.",
      shownEdit: {
        editType: "strategic-framing",
        proposedText: "We should test the refill offer before scaling the packaging change.",
        whyThisEdit: "It turns a generic recommendation into a staged decision.",
      },
      lenses: [
        {
          name: "consumer preference",
          focus: "What the evidence says customers will actually change behavior for.",
          sourceSignals: ["survey respondents prefer reusable packaging when convenience is preserved"],
          relevance: "Keeps the source reading tied to the proposal decision.",
        },
      ],
      provocations: [
        {
          kind: "counterargument",
          stage: "both",
          prompt: "What would make the convenience claim false in a premium segment?",
          whyItMatters: "Forces the writer to test the strongest assumption before publishing.",
          optional: true,
        },
      ],
      riskNotes: null,
      confidence: 0.82,
    });

    const result = parseModelResponse(raw);
    expect(result.shownEdit?.editType).toBe("strategic-framing");
    expect(result.lenses?.[0]?.name).toBe("consumer preference");
    expect(result.provocations?.[0]?.kind).toBe("counterargument");
    expect(result.provocations?.[0]?.stage).toBe("both");
  });

  it("defaults missing tool-for-thought metadata for legacy responses", () => {
    const raw = JSON.stringify({
      issueSummary: "Issue",
      rationale: "Rationale",
      proposedText: "Text",
    });
    const result = parseModelResponse(raw);
    expect(result.lenses).toEqual([]);
    expect(result.provocations).toEqual([]);
    expect(result.shownEdit).toBeUndefined();
  });
});
