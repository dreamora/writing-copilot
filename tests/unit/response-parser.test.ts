// Unit tests for response parser (Bead 2.4)
import { describe, it, expect } from "bun:test";
import { parseModelResponse } from "../../src/domain/suggestions/response-parser";

describe("Response Parser", () => {
  it("parses valid JSON response", () => {
    const response = JSON.stringify({
      issueSummary: "Clarity improvement",
      rationale: "This is clearer",
      proposedText: "improved text",
      confidence: 0.9,
    });

    const result = parseModelResponse(response);
    expect(result.issueSummary).toBe("Clarity improvement");
    expect(result.proposedText).toBe("improved text");
    expect(result.confidence).toBe(0.9);
  });

  it("extracts JSON from markdown code fence", () => {
    const response = `\`\`\`json
{
  "issueSummary": "Test",
  "rationale": "Reason",
  "proposedText": "text"
}
\`\`\``;

    const result = parseModelResponse(response);
    expect(result.issueSummary).toBe("Test");
  });

  it("rejects response without JSON object", () => {
    const response = "This is not JSON at all";
    expect(() => parseModelResponse(response)).toThrow("contains no JSON object");
  });

  it("rejects malformed JSON", () => {
    const response = '{ invalid json }';
    expect(() => parseModelResponse(response)).toThrow("not valid JSON");
  });

  it("rejects response missing required fields", () => {
    const response = JSON.stringify({
      issueSummary: "Test",
      // missing proposedText and rationale
    });

    expect(() => parseModelResponse(response)).toThrow("schema validation");
  });

  it("accepts null riskNotes", () => {
    const response = JSON.stringify({
      issueSummary: "Test",
      rationale: "Reason",
      proposedText: "text",
      riskNotes: null,
    });

    const result = parseModelResponse(response);
    expect(result.riskNotes).toBeUndefined();
  });

  it("rejects confidence outside 0-1 range", () => {
    const response = JSON.stringify({
      issueSummary: "Test",
      rationale: "Reason",
      proposedText: "text",
      confidence: 1.5,
    });

    expect(() => parseModelResponse(response)).toThrow("schema validation");
  });

  it("handles leading/trailing whitespace", () => {
    const response = `   
{
  "issueSummary": "Test",
  "rationale": "Reason",
  "proposedText": "text"
}
    `;

    const result = parseModelResponse(response);
    expect(result.issueSummary).toBe("Test");
  });
});
