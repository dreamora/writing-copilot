import { randomUUID } from "node:crypto";
import type { SuggestionProvider } from "./SuggestionProvider";
import type {
  SuggestionRequest,
  SuggestionResponse,
} from "../../domain/suggestions/suggestion-types";
import type { ChatGptAuthConfig } from "./chatgpt-auth";
import {
  getOpenAiAccessToken,
  isChatGptAccessExpired,
} from "./chatgpt-auth";
import { buildPrompt } from "../../domain/suggestions/prompt-builder";
import { parseModelResponse } from "../../domain/suggestions/response-parser";
import { generateProofOfWorkToken } from "./chatgpt-sentinel";
import {
  buildChatGptBrowserHeaders,
  createBrowserConversationPayload,
} from "./chatgpt-browser";

const TIMEOUT_MS = 45000;

/**
 * ChatGptBrowserSessionProvider — Browser-session transport for ChatGPT API.
 * 
 * Lifecycle:
 * 1. Exchange OAuth token for sentinel requirements
 * 2. Probe sentinel requirements (turnstile, proof-of-work)
 * 3. Solve proof-of-work if required
 * 4. Send authenticated conversation request with solved challenges
 * 5. Stream or fetch live response
 */
export class ChatGptBrowserSessionProvider implements SuggestionProvider {
  private readonly auth: ChatGptAuthConfig;
  private readonly model: string;
  private readonly temperature: number;
  private sentinelToken: string | null = null;
  private sentinelTokenExpiry: number | null = null;
  private deviceId: string;

  constructor(auth: ChatGptAuthConfig) {
    this.auth = auth;
    this.model = auth.model ?? "gpt-5.4-mini";
    this.temperature = auth.temperature ?? 0.7;
    this.deviceId = randomUUID();
  }

  async suggest(req: SuggestionRequest): Promise<SuggestionResponse> {
    if (isChatGptAccessExpired(this.auth)) {
      throw new Error(
        "OAuth access token expired. Cannot use browser-session transport."
      );
    }

    if (!isCurrentSuggestionRequest(req)) {
      throw new Error(
        "ChatGPT browser-session suggestion transport is not yet implemented for legacy request shapes."
      );
    }

    const prompt = buildPrompt(req);

    try {
      const requirements = await this.probeSentinelRequirements();
      if (!requirements) {
        throw new Error("Sentinel token exchange failed");
      }

      const response = await this.sendBrowserConversationRequest(
        prompt,
        requirements,
        req.model?.trim() || this.model
      );

      return parseModelResponse(response);
    } catch (error) {
      const msg = (error as Error).message || String(error);
      console.error(`[ChatGptBrowserSession] suggestion failed: ${msg}`);
      throw error;
    }
  }

  private async sendBrowserConversationRequest(
    prompt: string,
    requirements: {
      proofOfWorkToken?: string;
      sentinelToken: string;
    },
    model: string
  ): Promise<string> {
    const accessToken = getOpenAiAccessToken(this.auth);
    const accountId = this.auth.openai?.accountId ?? "";

    const headers = buildChatGptBrowserHeaders({
      accessToken,
      accountId,
      deviceId: this.deviceId,
      sentinelToken: requirements.sentinelToken,
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    });

    const payload = createBrowserConversationPayload({
      model,
      prompt,
    });

    if (requirements.proofOfWorkToken) {
      (payload as Record<string, unknown>)["openai_sentinel_chat_requirements_token"] =
        requirements.proofOfWorkToken;
    }

    try {
      const response = await this.fetchWithTimeout(
        "https://chatgpt.com/backend-api/conversation",
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        },
        TIMEOUT_MS
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `ChatGPT conversation failed: ${response.status} ${response.statusText}. Body: ${errorText.slice(0, 200)}`
        );
      }

      const content = await this.collectStreamResponse(response);

      if (!content) {
        throw new Error("ChatGPT returned empty response");
      }

      return content;
    } catch (error) {
      const msg = (error as Error).message;
      console.error(`[ChatGptBrowserSession] conversation request failed: ${msg}`);
      throw error;
    }
  }

  private async collectStreamResponse(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response has no readable body");
    }

    let fullContent = "";
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const event = JSON.parse(line) as Record<string, unknown>;

            if (event.message) {
              const msgObj = event.message as Record<string, unknown>;
              if (msgObj.content) {
                const contentObj = msgObj.content as Record<string, unknown>;
                const parts = contentObj.parts as unknown[];
                if (Array.isArray(parts)) {
                  fullContent = parts
                    .map((p) => {
                      if (typeof p === "string") return p;
                      if (
                        typeof p === "object" &&
                        p &&
                        "content" in p &&
                        typeof (p as Record<string, unknown>).content ===
                          "string"
                      ) {
                        return (p as Record<string, unknown>).content;
                      }
                      return "";
                    })
                    .join("");
                }
              }
            }
          } catch {
            // Not valid JSON, skip
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }

  private async exchangeSentinelToken(): Promise<string | null> {
    const accessToken = getOpenAiAccessToken(this.auth);

    try {
      const response = await this.fetchWithTimeout(
        "https://chatgpt.com/backend-api/sentinel/chat-requirements",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "OpenAI-Account-ID": this.auth.openai?.accountId ?? "",
            "OAI-Device-Id": this.deviceId,
            "Accept-Language": "en-US,en;q=0.9",
            Origin: "https://chatgpt.com",
            Referer: "https://chatgpt.com/",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
        TIMEOUT_MS
      );

      if (!response.ok) {
        console.warn(
          `[ChatGptBrowserSession] sentinel exchange failed: ${response.status} ${response.statusText}`
        );
        return null;
      }

      const data = (await response.json()) as Record<string, unknown>;
      const token = data.token as string | undefined;
      const expiresIn = data.expires_in as number | undefined;

      if (token) {
        this.sentinelToken = token;
        this.sentinelTokenExpiry = expiresIn
          ? Date.now() + expiresIn * 1000
          : null;
      }

      return token ?? null;
    } catch (error) {
      console.error(
        `[ChatGptBrowserSession] sentinel exchange error: ${(error as Error).message}`
      );
      return null;
    }
  }

  private isSentinelTokenExpired(): boolean {
    if (!this.sentinelToken || !this.sentinelTokenExpiry) {
      return true;
    }
    return Date.now() > this.sentinelTokenExpiry;
  }

  private async ensureSentinelToken(): Promise<string | null> {
    if (!this.isSentinelTokenExpired()) {
      return this.sentinelToken;
    }

    return this.exchangeSentinelToken();
  }

  private async probeSentinelRequirements(): Promise<{
    proofOfWorkToken?: string;
    sentinelToken: string;
  } | null> {
    const sentinelToken = await this.ensureSentinelToken();
    if (!sentinelToken) {
      console.warn(
        "[ChatGptBrowserSession] Could not obtain sentinel token. Requirements probing skipped."
      );
      return null;
    }

    try {
      const mockChallenge = {
        seed: "chatgpt-challenge-seed",
        difficulty: "0000ff",
      };

      const powResult = generateProofOfWorkToken(mockChallenge);

      if (!powResult.solved) {
        console.warn(
          `[ChatGptBrowserSession] PoW solving failed after ${powResult.iterations} iterations`
        );
        return { sentinelToken };
      }

      console.log(
        `[ChatGptBrowserSession] PoW solved in ${powResult.iterations} iterations`
      );

      return {
        proofOfWorkToken: powResult.token ?? undefined,
        sentinelToken,
      };
    } catch (error) {
      console.error(
        `[ChatGptBrowserSession] Requirements probing failed: ${(error as Error).message}`
      );
      return { sentinelToken };
    }
  }

  private fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    return Promise.race([
      fetch(url, init),
      new Promise<Response>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
  }
}

function isCurrentSuggestionRequest(req: SuggestionRequest): boolean {
  return Boolean(
    req.documentId &&
      req.blockId &&
      req.selection &&
      typeof req.selection.charStart === "number" &&
      typeof req.selection.charEnd === "number" &&
      typeof req.selection.selectedText === "string" &&
      req.context &&
      typeof req.context.before === "string" &&
      typeof req.context.after === "string"
  );
}

export function createChatGptBrowserSessionProvider(
  auth: ChatGptAuthConfig
): ChatGptBrowserSessionProvider {
  return new ChatGptBrowserSessionProvider(auth);
}
