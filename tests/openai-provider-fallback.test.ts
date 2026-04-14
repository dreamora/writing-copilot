import { beforeEach, describe, expect, it } from "bun:test";
import { OpenAiSuggestionProvider } from "../src/adapters/ai/OpenAiSuggestionProvider";
import type { ChatGptAuthConfig } from "../src/adapters/ai/chatgpt-auth";
import type { SuggestionRequest } from "../src/domain/suggestions/suggestion-types";

describe("OpenAiSuggestionProvider: graceful fallback", () => {
  let provider: OpenAiSuggestionProvider;
  let testRequest: SuggestionRequest;

  beforeEach(() => {
    const auth: ChatGptAuthConfig = {
      apiKey: "sk-invalid-key",
      model: "gpt-4o-mini",
    };
    provider = new OpenAiSuggestionProvider(auth);

    testRequest = {
      documentId: "doc-fallback",
      blockId: "block-fallback",
      actionType: "clarify",
      selection: {
        selectedText: "The quick brown fox jumps.",
        charStart: 0,
        charEnd: 26,
      },
      context: {
        before: "Alpha paragraph.",
        after: "Omega paragraph.",
      },
    };
  });

  it("falls back to stub when token is invalid (401)", async () => {
    (provider as unknown as { callWithTimeout: (prompt: string) => Promise<string> }).callWithTimeout =
      async () => {
        const error = new Error("Unauthorized");
        (error as Error & { status?: number }).status = 401;
        throw error;
      };

    const response = await provider.suggest(testRequest);

    expect(response).toBeDefined();
    expect(response.issueSummary).toBeDefined();
    expect(response.riskNotes).toContain("stub");
  });

  it("includes fallback indicator in response", async () => {
    (provider as unknown as { callWithTimeout: (prompt: string) => Promise<string> }).callWithTimeout =
      async () => {
        const error = new Error("Invalid API key provided");
        throw error;
      };

    const response = await provider.suggest(testRequest);
    expect(response.riskNotes).toMatch(/stub|fallback/i);
  });

  it("sanitizes error messages (no credential leaking)", async () => {
    (provider as unknown as { callWithTimeout: (prompt: string) => Promise<string> }).callWithTimeout =
      async () => {
        const error = new Error("Invalid API key sk-secret-secret-secret");
        throw error;
      };

    const response = await provider.suggest(testRequest);
    expect(JSON.stringify(response)).not.toMatch(/sk-[a-zA-Z0-9]{10,}/);
  });
});
