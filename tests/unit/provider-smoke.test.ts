import { describe, expect, it } from "bun:test";
import {
  buildProviderSmokeRequest,
  didUseStubFallback,
  summarizeSmokeResponse,
} from "../../src/adapters/ai/provider-smoke";

describe("provider-smoke", () => {
  it("builds a stable smoke request", () => {
    const req = buildProviderSmokeRequest();
    expect(req.documentId).toBe("smoke-doc");
    expect(req.blockId).toBe("smoke-block");
    expect(req.actionType).toBe("clarify");
    expect(req.selection.selectedText.length).toBeGreaterThan(10);
  });

  it("detects stub fallback responses", () => {
    expect(
      didUseStubFallback({
        issueSummary: "stub",
        rationale: "stub",
        proposedText: "stub",
        riskNotes: "This is a STUB response",
      })
    ).toBe(true);
  });

  it("reports live responses as successful", () => {
    const result = summarizeSmokeResponse({
      issueSummary: "Improved clarity",
      rationale: "Removes ambiguity",
      proposedText: "A clearer paragraph",
      confidence: 0.8,
    });

    expect(result.ok).toBe(true);
    expect(result.usedStub).toBe(false);
  });

  it("reports stub responses as blocked", () => {
    const result = summarizeSmokeResponse({
      issueSummary: "[STUB] Improved clarity",
      rationale: "fallback",
      proposedText: "stub text",
      riskNotes: "stub fallback response",
    });

    expect(result.ok).toBe(false);
    expect(result.usedStub).toBe(true);
    expect(result.message).toContain("stub fallback");
  });
});
