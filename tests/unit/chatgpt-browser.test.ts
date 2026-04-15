import { describe, expect, it } from "bun:test";
import {
  buildChatGptBrowserHeaders,
  createBrowserConversationPayload,
  pickPreferredModelSlug,
} from "../../src/adapters/ai/chatgpt-browser";

describe("chatgpt-browser helpers", () => {
  it("builds browser headers with optional sentinel token", () => {
    const headers = buildChatGptBrowserHeaders({
      accessToken: "access-token",
      accountId: "account-123",
      deviceId: "device-123",
      sentinelToken: "sentinel-123",
    });

    expect(headers.Authorization).toBe("Bearer access-token");
    expect(headers["OpenAI-Account-ID"]).toBe("account-123");
    expect(headers["OAI-Device-Id"]).toBe("device-123");
    expect(headers["OpenAI-Sentinel-Chat-Requirements-Token"]).toBe("sentinel-123");
  });

  it("creates a browser conversation payload", () => {
    const payload = createBrowserConversationPayload({
      model: "gpt-4o",
      prompt: "hello from bilby",
      parentMessageId: "parent-1",
      messageId: "message-1",
      websocketRequestId: "ws-1",
    });

    expect(payload.model).toBe("gpt-4o");
    expect(payload.parent_message_id).toBe("parent-1");
    expect(payload.websocket_request_id).toBe("ws-1");
    expect((payload.messages as Array<any>)[0].content.parts[0]).toBe("hello from bilby");
  });

  it("picks the best available model slug", () => {
    const payload = {
      categories: [
        { models: [{ slug: "gpt-4o-mini" }, { slug: "gpt-5-3" }] },
        { models: [{ slug: "o3" }] },
      ],
    };

    expect(pickPreferredModelSlug(payload)).toBe("gpt-5-3");
  });

  it("returns null when no slugs are present", () => {
    expect(pickPreferredModelSlug({ foo: "bar" })).toBeNull();
  });
});
