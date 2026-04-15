import { beforeEach, describe, expect, it } from "bun:test";
import { OpenAiSuggestionProvider } from "../src/adapters/ai/OpenAiSuggestionProvider";
import type { ChatGptAuthConfig } from "../src/adapters/ai/chatgpt-auth";
import type { SuggestionRequest } from "../src/domain/suggestions/suggestion-types";

describe("OpenAiSuggestionProvider: graceful fallback", () => {
  let provider: OpenAiSuggestionProvider;
  let testRequest: SuggestionRequest;

  beforeEach(() => {
    const auth: ChatGptAuthConfig = {
      openai: {
        type: "oauth",
        refresh: "refresh-token",
        access: "expired-or-invalid-access-token",
        expires: Date.now() + 60_000,
        accountId: "acct-123",
      },
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

  it("falls back to stub when the oauth access token is expired locally", async () => {
    const expiredProvider = new OpenAiSuggestionProvider({
      openai: {
        type: "oauth",
        refresh: "refresh-token",
        access: "access-token",
        expires: Date.now() - 1,
        accountId: "acct-123",
      },
    });

    const response = await expiredProvider.suggest(testRequest);
    expect(response.riskNotes).toMatch(/stub|expired/i);
  });

  it("includes fallback indicator in response", async () => {
    (provider as unknown as { callWithTimeout: (prompt: string) => Promise<string> }).callWithTimeout =
      async () => {
        throw new Error("Invalid token provided");
      };

    const response = await provider.suggest(testRequest);
    expect(response.riskNotes).toMatch(/stub|fallback/i);
  });

  it("sanitizes error messages (no credential leaking)", async () => {
    (provider as unknown as { callWithTimeout: (prompt: string) => Promise<string> }).callWithTimeout =
      async () => {
        throw new Error("Invalid token access-secret-secret-secret");
      };

    const response = await provider.suggest(testRequest);
    expect(JSON.stringify(response)).not.toContain("access-secret-secret-secret");
  });
});
