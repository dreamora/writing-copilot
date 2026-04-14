import OpenAI from "openai";
import { buildPrompt } from "../../domain/suggestions/prompt-builder";
import { parseModelResponse } from "../../domain/suggestions/response-parser";
import type { SuggestionProvider } from "./SuggestionProvider";
import type {
  SuggestionRequest,
  SuggestionResponse,
} from "../../domain/suggestions/suggestion-types";
import type { ChatGptAuthConfig } from "./chatgpt-auth";
import { isTokenInvalid, sanitizeAuthError } from "./token-lifecycle";

const TIMEOUT_MS = 30000;
const MAX_RETRIES = 1;

export class OpenAiSuggestionProvider implements SuggestionProvider {
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private stubProvider: StubSuggestionProvider;

  constructor(auth: ChatGptAuthConfig) {
    this.client = new OpenAI({
      apiKey: auth.apiKey,
      baseURL: auth.baseURL,
      organization: auth.organization,
      project: auth.project,
    });
    this.model = auth.model ?? "gpt-4o-mini";
    this.temperature = auth.temperature ?? 0.7;
    this.stubProvider = new StubSuggestionProvider();
  }

  async suggest(req: SuggestionRequest): Promise<SuggestionResponse> {
    const prompt = buildPrompt(req);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await this.callWithTimeout(prompt);
        return parseModelResponse(response);
      } catch (error) {
        lastError = error as Error;

        // AC2: Graceful fallback on token/auth errors
        if (isTokenInvalid(error)) {
          console.warn(
            `Token error: ${sanitizeAuthError(error)}. Falling back to stub mode.`
          );
          return this.stubProvider.suggest(req);
        }

        // Retry on validation errors
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

  private async callWithTimeout(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
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
      riskNotes: "This is a stub response (no ChatGPT auth configured or token invalid)",
      confidence: 0.5,
    };
  }
}
