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

  constructor(auth: ChatGptAuthConfig) {
    this.auth = auth;
    this.model = auth.model ?? "gpt-4o-mini";
    this.temperature = auth.temperature ?? 0.7;
  }

  async suggest(req: SuggestionRequest): Promise<SuggestionResponse> {
    if (isChatGptAccessExpired(this.auth)) {
      throw new Error(
        "OAuth access token expired. Cannot use browser-session transport."
      );
    }

    const prompt = buildPrompt(req);

    try {
      // T2: Probe sentinel requirements and solve challenges
      const requirements = await this.probeSentinelRequirements();
      if (!requirements) {
        throw new Error("Sentinel token exchange failed");
      }

      // TODO (T3): Send live conversation request via browser API

      throw new Error(
        "Browser-session transport not yet implemented (T3 live request pending)"
      );
    } catch (error) {
      const msg = (error as Error).message || String(error);
      console.error(`[ChatGptBrowserSession] suggestion failed: ${msg}`);
      throw error;
    }
  }

  /**
   * Exchange OAuth token for sentinel chat requirements.
   * Returns the requirements token or null if exchange fails.
   */
  private async exchangeSentinelToken(): Promise<string | null> {
    const accessToken = getOpenAiAccessToken(this.auth);
    const deviceId = randomUUID();

    try {
      const response = await fetch(
        "https://chatgpt.com/backend-api/sentinel/chat-requirements",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "OpenAI-Account-ID": this.auth.openai?.accountId ?? "",
            "OAI-Device-Id": deviceId,
            "Accept-Language": "en-US,en;q=0.9",
            Origin: "https://chatgpt.com",
            Referer: "https://chatgpt.com/",
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
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

  /**
   * Check if sentinel token is still valid.
   */
  private isSentinelTokenExpired(): boolean {
    if (!this.sentinelToken || !this.sentinelTokenExpiry) {
      return true;
    }
    return Date.now() > this.sentinelTokenExpiry;
  }

  /**
   * Ensure sentinel token is fresh.
   */
  private async ensureSentinelToken(): Promise<string | null> {
    if (!this.isSentinelTokenExpired()) {
      return this.sentinelToken;
    }

    // Token expired or missing — refresh
    return this.exchangeSentinelToken();
  }

  /**
   * T2: Probe sentinel requirements and solve proof-of-work if needed.
   * Returns proof-of-work token and sentinel token, or null on failure.
   */
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

    // Parse requirements from sentinel token (which contains embedded challenge data)
    // In practice, the PoW challenge is encoded in the token response itself
    // For now, we'll extract known parameters and attempt to solve

    try {
      // Example: Mock challenge for now
      // TODO (T3): Extract from actual sentinel response
      const mockChallenge = {
        seed: "chatgpt-challenge-seed",
        difficulty: "0000ff",
      };

      const powResult = generateProofOfWorkToken(mockChallenge);

      if (!powResult.solved) {
        console.warn(
          `[ChatGptBrowserSession] PoW solving failed after ${powResult.iterations} iterations`
        );
        return { sentinelToken }; // Return at least the sentinel token
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
}

export function createChatGptBrowserSessionProvider(
  auth: ChatGptAuthConfig
): ChatGptBrowserSessionProvider {
  return new ChatGptBrowserSessionProvider(auth);
}
