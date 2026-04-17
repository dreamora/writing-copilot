import OpenAI from "openai";
import { buildPrompt } from "../../domain/suggestions/prompt-builder";
import { parseModelResponse } from "../../domain/suggestions/response-parser";
import type { SuggestionProvider } from "./SuggestionProvider";
import type {
  SuggestionRequest,
  SuggestionResponse,
} from "../../domain/suggestions/suggestion-types";
import type { ChatGptAuthConfig } from "./chatgpt-auth";
import { getOpenAiAccessToken, isChatGptAccessExpired } from "./chatgpt-auth";
import { isTokenInvalid, sanitizeAuthError } from "./token-lifecycle";

const TIMEOUT_MS = 30000;
const MAX_RETRIES = 1;

export class OpenAiSuggestionProvider implements SuggestionProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly temperature: number;
  private readonly stubProvider: StubSuggestionProvider;
  private readonly auth: ChatGptAuthConfig;

  constructor(auth: ChatGptAuthConfig) {
    this.auth = auth;
    this.client = new OpenAI({
      apiKey: getOpenAiAccessToken(auth),
      baseURL: auth.baseURL,
    });
    this.model = auth.model ?? "gpt-5.4-mini";
    this.temperature = auth.temperature ?? 0.7;
    this.stubProvider = new StubSuggestionProvider();
  }

  async suggest(req: SuggestionRequest): Promise<SuggestionResponse> {
    if (isChatGptAccessExpired(this.auth)) {
      console.warn("OAuth access token expired before suggestion call. Falling back to stub mode.");
      return this.stubProvider.suggest(req);
    }

    const prompt = buildPrompt(req);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.callWithTimeout(prompt, req.model?.trim() || this.model);
        return parseModelResponse(response);
      } catch (error) {
        lastError = error as Error;

        if (isTokenInvalid(error)) {
          console.warn(`Token error: ${sanitizeAuthError(error)}. Falling back to stub mode.`);
          return this.stubProvider.suggest(req);
        }

        if (attempt < MAX_RETRIES && this.isValidationError(lastError)) {
          console.warn(
            `Suggestion parse failed (attempt ${attempt + 1}), retrying…`,
            lastError.message
          );
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new Error("Unknown error in suggest");
  }

  private async callWithTimeout(prompt: string, model: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: this.temperature,
        max_tokens: 500,
      });

      const text = response.choices[0]?.message?.content || "";
      if (!text) {
        throw new Error("OpenAI returned empty content");
      }

      return text;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private isValidationError(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("schema validation") ||
      msg.includes("no json object") ||
      msg.includes("not valid json")
    );
  }
}

export class StubSuggestionProvider implements SuggestionProvider {
  async suggest(req: SuggestionRequest): Promise<SuggestionResponse> {
    return {
      issueSummary: `[STUB] Improved clarity for: "${req.selection.selectedText.slice(0, 20)}..."`,
      rationale: `This ${req.actionType} improves readability.`,
      proposedText: `[IMPROVED] ${req.selection.selectedText}`,
      riskNotes: "This is a stub response (no ChatGPT auth configured, token expired, or token invalid)",
      confidence: 0.5,
    };
  }
}

export function createSuggestionProvider(auth: ChatGptAuthConfig | null): SuggestionProvider {
  return auth ? new OpenAiSuggestionProvider(auth) : new StubSuggestionProvider();
}

export function createOpenAiProvider(auth: ChatGptAuthConfig): OpenAiSuggestionProvider {
  return new OpenAiSuggestionProvider(auth);
}
