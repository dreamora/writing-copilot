import { describe, expect, it, mock } from "bun:test";
import { ChatGptBrowserSessionProvider } from "../../src/adapters/ai/ChatGptBrowserSessionProvider";
import type { ChatGptAuthConfig } from "../../src/adapters/ai/chatgpt-auth";

describe("ChatGptBrowserSessionProvider", () => {
  const mockAuth: ChatGptAuthConfig = {
    openai: {
      type: "oauth",
      refresh: "refresh_token",
      access: "access_token",
      expires: Date.now() + 3600000, // 1 hour from now
      accountId: "test-account-id",
    },
    model: "gpt-4o-mini",
    temperature: 0.7,
  };

  it("instantiates with OAuth auth config", () => {
    const provider = new ChatGptBrowserSessionProvider(mockAuth);
    expect(provider).toBeDefined();
  });

  it("rejects suggestion if access token is expired", async () => {
    const expiredAuth: ChatGptAuthConfig = {
      ...mockAuth,
      openai: {
        ...mockAuth.openai,
        expires: Date.now() - 1000, // Already expired
      },
    };

    const provider = new ChatGptBrowserSessionProvider(expiredAuth);

    try {
      await provider.suggest({
        actionType: "improve",
        selection: {
          selectedText: "test text",
          contextBefore: "before",
          contextAfter: "after",
          filepath: "/test.md",
        },
      });
      expect.unreachable();
    } catch (error) {
      const msg = (error as Error).message;
      expect(msg).toContain("OAuth access token expired");
    }
  });

  it("throws on suggest call — T2-T3 placeholder", async () => {
    const provider = new ChatGptBrowserSessionProvider(mockAuth);

    try {
      await provider.suggest({
        actionType: "improve",
        selection: {
          selectedText: "test text",
          contextBefore: "before",
          contextAfter: "after",
          filepath: "/test.md",
        },
      });
      expect.unreachable();
    } catch (error) {
      const msg = (error as Error).message;
      expect(msg).toContain("not yet implemented");
    }
  });
});

describe("sentinel requirements parsing", () => {
  it("parses basic sentinel response", async () => {
    const { parseSentinelResponse } = await import(
      "../../src/adapters/ai/sentinel-requirements"
    );

    const response = parseSentinelResponse({
      token: "sentinel-token-abc123",
      proofofwork: {
        required: true,
        difficulty: "00ffff",
        seed: "pow-seed",
      },
    });

    expect(response?.token).toBe("sentinel-token-abc123");
    expect(response?.proofofwork?.required).toBe(true);
    expect(response?.proofofwork?.difficulty).toBe("00ffff");
  });

  it("returns null for invalid sentinel response", async () => {
    const { parseSentinelResponse } = await import(
      "../../src/adapters/ai/sentinel-requirements"
    );

    const response = parseSentinelResponse({
      // missing token
      data: "invalid",
    });

    expect(response).toBe(null);
  });

  it("handles missing proofofwork requirement", async () => {
    const { parseSentinelResponse } = await import(
      "../../src/adapters/ai/sentinel-requirements"
    );

    const response = parseSentinelResponse({
      token: "sentinel-token",
      // no proofofwork
    });

    expect(response?.token).toBe("sentinel-token");
    expect(response?.proofofwork).toBeUndefined();
  });
});
