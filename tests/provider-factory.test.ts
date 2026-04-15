import { describe, it, expect } from "bun:test";
import { createSuggestionProvider, StubSuggestionProvider } from "../src/adapters/ai/OpenAiSuggestionProvider";
import type { ChatGptAuth } from "../src/adapters/auth/auth-config";

describe("createSuggestionProvider", () => {
  it("returns stub provider when auth is null", () => {
    const provider = createSuggestionProvider(null);
    expect(provider).toBeInstanceOf(StubSuggestionProvider);
  });

  it("returns real provider when oauth auth is valid", () => {
    const auth: ChatGptAuth = {
      openai: {
        type: "oauth",
        refresh: "refresh-token",
        access: "access-token",
        expires: Date.now() + 60_000,
        accountId: "acct-123",
      },
      model: "gpt-4o-mini",
      temperature: 0.7,
      baseURL: "https://api.openai.com/v1",
    };

    const provider = createSuggestionProvider(auth);

    expect(provider).toBeDefined();
    expect(provider).not.toBeInstanceOf(StubSuggestionProvider);
  });
});

describe("StubSuggestionProvider", () => {
  it("returns stub response without API calls", async () => {
    const provider = new StubSuggestionProvider();
    const response = await provider.suggest({
      documentId: "doc-1",
      blockId: "block-1",
      actionType: "clarify",
      selection: { selectedText: "Hello world", charStart: 0, charEnd: 11 },
      context: { before: "", after: "" },
    });

    expect(response.issueSummary).toContain("[STUB]");
    expect(response.confidence).toBe(0.5);
  });
});
