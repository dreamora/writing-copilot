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

  it("does not leak role labels into proposed text", async () => {
    const provider = new StubSuggestionProvider();
    const response = await provider.suggest({
      documentId: "doc-1",
      blockId: "block-1",
      editorRole: "marc-voice",
      actionType: "rewrite",
      selection: { selectedText: "Hello world", charStart: 0, charEnd: 11 },
      context: { before: "", after: "" },
    });

    expect(response.proposedText).toBe("Hello world");
    expect(response.shownEdit?.proposedText).toBe("Hello world");
  });

  it("makes conservative de-slop edits instead of echoing AI-cadence text", async () => {
    const provider = new StubSuggestionProvider();
    const selectedText = [
      "One of the clearest lessons I\u2019ve learned from two years of working with AI is that it does not need to be perfect to be useful.",
      "",
      "It needs to earn its keep in specific ways:",
      "",
      "\u2022 challenge my thinking and surface weak reasoning",
      "\u2022 break ideas down until I understand them more clearly",
      "\u2022 give me a starting point I can test, fail with, and learn from quickly",
      "",
      "I do not need AI to outsource my judgment.",
      "",
      "I need it to sharpen my judgment.",
      "",
      "What has AI genuinely improved for you \u2014 and where does it still fall short of the standard you actually need?",
    ].join("\n");

    const response = await provider.suggest({
      documentId: "doc-1",
      blockId: "block-1",
      editorRole: "marc-voice",
      actionType: "de-slop",
      activeLens: "voice-fidelity",
      selection: { selectedText, charStart: 0, charEnd: selectedText.length },
      context: { before: "", after: "" },
    });

    expect(response.proposedText).not.toBe(selectedText);
    expect(response.proposedText).not.toContain("[MARC]");
    expect(response.proposedText).toContain("The clearest thing I have learned");
    expect(response.proposedText).toContain("show me where the reasoning is weak");
    expect(response.proposedText).toContain("make my judgment sharper");
  });
});
