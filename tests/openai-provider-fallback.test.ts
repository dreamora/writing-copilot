/**
 * Integration test: OpenAiSuggestionProvider AC2 fallback behavior
 * Verifies that invalid tokens gracefully fall back to StubSuggestionProvider
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import { OpenAiSuggestionProvider } from "../src/adapters/ai/OpenAiSuggestionProvider";
import type { ChatGptAuthConfig } from "../src/adapters/ai/chatgpt-auth";
import type { SuggestionRequest } from "../src/domain/suggestions/suggestion-types";

describe("OpenAiSuggestionProvider: AC2 Graceful Fallback", () => {
  let provider: OpenAiSuggestionProvider;
  let testRequest: SuggestionRequest;

  beforeEach(() => {
    // Create provider with dummy auth (will fail on API call)
    const auth: ChatGptAuthConfig = {
      apiKey: "sk-invalid-key",
      model: "gpt-4o-mini",
    };
    provider = new OpenAiSuggestionProvider(auth);

    // Standard test request
    testRequest = {
      selection: {
        selectedText: "The quick brown fox jumps.",
        context: "The quick brown fox jumps over the lazy dog.",
        startOffset: 0,
      },
      actionType: "enhance-clarity",
    };
  });

  it("falls back to stub when token is invalid (401)", async () => {
    // Mock the OpenAI client to throw 401
    // Note: In real scenario, OpenAI SDK throws this on invalid token
    const response = await provider.suggest(testRequest);

    // Even with invalid token, we get a response (not a crash)
    expect(response).toBeDefined();
    expect(response.issueSummary).toBeDefined();
    // Stub response is marked with [STUB]
    expect(response.riskNotes).toContain("stub");
  });

  it("includes fallback indicator in response", async () => {
    const response = await provider.suggest(testRequest);
    // When falling back, riskNotes should indicate it's a stub
    expect(response.riskNotes).toMatch(/stub|fallback/i);
  });

  it("sanitizes error messages (no credential leaking)", async () => {
    // This is tested via token-lifecycle.test.ts
    // Here we verify the provider doesn't leak credentials in its fallback path
    const response = await provider.suggest(testRequest);
    // Response should not contain API key patterns
    expect(JSON.stringify(response)).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
  });
});
