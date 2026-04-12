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
});
