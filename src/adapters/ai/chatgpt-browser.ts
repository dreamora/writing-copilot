import { randomUUID } from "node:crypto";

export interface BrowserTransportHeadersOptions {
  accessToken: string;
  accountId: string;
  deviceId?: string;
  sentinelToken?: string;
  userAgent?: string;
}

export interface BrowserConversationPayloadOptions {
  model: string;
  prompt: string;
  parentMessageId?: string;
  messageId?: string;
  websocketRequestId?: string;
}

export const DEFAULT_BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";

export function buildChatGptBrowserHeaders(options: BrowserTransportHeadersOptions): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.accessToken}`,
    "OpenAI-Account-ID": options.accountId,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    Origin: "https://chatgpt.com",
    Referer: "https://chatgpt.com/",
    "User-Agent": options.userAgent ?? DEFAULT_BROWSER_USER_AGENT,
    "OAI-Device-Id": options.deviceId ?? randomUUID(),
  };

  if (options.sentinelToken) {
    headers["OpenAI-Sentinel-Chat-Requirements-Token"] = options.sentinelToken;
  }

  return headers;
}

export function createBrowserConversationPayload(
  options: BrowserConversationPayloadOptions
): Record<string, unknown> {
  return {
    action: "next",
    messages: [
      {
        id: options.messageId ?? randomUUID(),
        author: { role: "user" },
        content: {
          content_type: "text",
          parts: [options.prompt],
        },
        metadata: {},
      },
    ],
    parent_message_id: options.parentMessageId ?? randomUUID(),
    model: options.model,
    timezone_offset_min: 0,
    history_and_training_disabled: true,
    conversation_mode: { kind: "primary_assistant" },
    websocket_request_id: options.websocketRequestId ?? randomUUID(),
  };
}

export function pickPreferredModelSlug(payload: unknown): string | null {
  const found = new Set<string>();

  const visit = (value: unknown) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      for (const [key, child] of Object.entries(record)) {
        if ((key === "slug" || key === "model_slug") && typeof child === "string") {
          found.add(child);
        }
        visit(child);
      }
    }
  };

  visit(payload);

  const slugs = [...found];
  const preferred = slugs.find((slug) => slug.startsWith("gpt-5"))
    ?? slugs.find((slug) => slug.startsWith("gpt-4o"))
    ?? slugs.find((slug) => slug.startsWith("gpt-4"))
    ?? slugs[0];

  return preferred ?? null;
}
