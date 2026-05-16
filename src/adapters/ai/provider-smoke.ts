import type { SuggestionRequest, SuggestionResponse } from "../../domain/suggestions/suggestion-types";

export interface ProviderSmokeResult {
  ok: boolean;
  usedStub: boolean;
  message: string;
}

export function buildProviderSmokeRequest(): SuggestionRequest {
  return {
    documentId: "smoke-doc",
    blockId: "smoke-block",
    actionType: "clarify",
    editorRole: "rigorous-reviewer",
    workflowStage: "source-processing",
    activeLens: "evidence-quality",
    selection: {
      selectedText: "This paragraph should communicate the point more clearly.",
      charStart: 0,
      charEnd: 56,
    },
    context: {
      before: "Intro paragraph before the selection.",
      after: "Follow-up paragraph after the selection.",
    },
    style: {
      brevity: "medium",
      tone: "clear",
    },
  };
}

export function didUseStubFallback(response: SuggestionResponse): boolean {
  return (response.riskNotes ?? "").toLowerCase().includes("stub");
}

export function summarizeSmokeResponse(response: SuggestionResponse): ProviderSmokeResult {
  if (didUseStubFallback(response)) {
    return {
      ok: false,
      usedStub: true,
      message: "Provider returned a stub fallback response. Check the OAuth auth file, access token, or token expiry before relying on live suggestions.",
    };
  }

  return {
    ok: true,
    usedStub: false,
    message: "Live provider returned a non-stub suggestion response.",
  };
}
