import { afterEach, describe, expect, it } from "bun:test";
import { reopenSuggestion } from "../../web/src/features/suggestions/SuggestionActions";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("SuggestionActions", () => {
  it("reports stale API/static fallback HTML as a restartable server mismatch", async () => {
    globalThis.fetch = async () =>
      new Response("<!DOCTYPE html><html></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });

    await expect(reopenSuggestion("suggestion-1", "session-1")).rejects.toThrow(
      "API returned HTML instead of JSON"
    );
    await expect(reopenSuggestion("suggestion-1", "session-1")).rejects.toThrow(
      "restart it so the latest routes are loaded"
    );
  });
});
