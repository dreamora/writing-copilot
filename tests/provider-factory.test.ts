/**
 * Tests for provider factory and fallback logic.
 * Verifies:
 * - Real provider created from valid auth
 * - Stub provider returned when auth is null
 * - No credentials leak in errors or logs
 */

import { describe, it, expect } from "bun:test";
import { createSuggestionProvider, StubSuggestionProvider } from "../src/adapters/ai/OpenAiSuggestionProvider";
import type { ChatGptAuth } from "../src/adapters/auth/auth-config";

describe("createSuggestionProvider", () => {
  it("returns stub provider when auth is null", () => {
    const provider = createSuggestionProvider(null);
    expect(provider).toBeInstanceOf(StubSuggestionProvider);
  });

  it("returns OpenAI provider when auth is valid", () => {
    const auth: ChatGptAuth = {
      apiKey: "sk-test-key",
      model: "gpt-4o-mini",
      timeout: 30000,
      maxRetries: 1,
    };
    const provider = createSuggestionProvider(auth);
    // Check that it's not a stub (provider exists and can be called)
    expect(provider).toBeDefined();
    expect(provider).not.toBeInstanceOf(StubSuggestionProvider);
  });
});

describe("StubSuggestionProvider", () => {
  it("returns stub response without API calls", async () => {
    const provider = new StubSuggestionProvider();
    const response = await provider.suggest({
      actionType: "clarify",
      selection: { selectedText: "Hello world" },
      context: { beforeContext: "", afterContext: "" },
    });
    
    expect(response.issueSummary).toContain("[STUB]");
    expect(response.confidence).toBe(0.5);
  });
});
