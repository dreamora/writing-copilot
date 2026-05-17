import { describe, expect, it } from "bun:test";
import { CodexSuggestionProvider } from "../../src/adapters/ai/CodexSuggestionProvider";
import type { ChatGptAuthConfig } from "../../src/adapters/ai/chatgpt-auth";
import type { SuggestionRequest } from "../../src/domain/suggestions/suggestion-types";

describe("CodexSuggestionProvider: fallback behavior", () => {
  const auth: ChatGptAuthConfig = {
    openai: {
      type: "oauth",
      refresh: "refresh-token",
      access: "access-token",
      expires: Date.now() + 60_000,
      accountId: "acct-123",
    },
    model: "gpt-5.4-mini",
  };

  const request: SuggestionRequest = {
    documentId: "doc-1",
    blockId: "block-1",
    actionType: "custom",
    customInstruction: "Make it sharper",
    selection: {
      selectedText: "This is a sentence that needs work.",
      charStart: 0,
      charEnd: 35,
    },
    context: {
      before: "Before.",
      after: "After.",
    },
  };

  it("falls back to stub mode when the Codex subprocess fails", async () => {
    const provider = new CodexSuggestionProvider(auth);
    (provider as unknown as { callCodex: () => Promise<string> }).callCodex = async () => {
      throw new Error("failed to initialize in-process app-server client");
    };

    const response = await provider.suggest(request);

    expect(response.issueSummary).toContain("[STUB]");
    expect(response.riskNotes).toContain("stub");
  });
});
