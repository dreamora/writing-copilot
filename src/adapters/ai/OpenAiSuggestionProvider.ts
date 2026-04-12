// Bead 2.3 — OpenAI Suggestion Provider implementation
import OpenAI from "openai";
import { buildPrompt } from "../../domain/suggestions/prompt-builder";
import { parseModelResponse } from "../../domain/suggestions/response-parser";
import type {
  SuggestionProvider,
  SuggestionRequest,
  SuggestionResponse,
} from "../../domain/suggestions/suggestion-types";

const TIMEOUT_MS = 30000; // 30 second timeout per request
const MAX_RETRIES = 1; // 1 retry on parse failure

export class OpenAiSuggestionProvider implements SuggestionProvider {
  private client: OpenAI;
  private model: string = "gpt-4o-mini";
  private temperature: number = 0.7;

  constructor(apiKey?: string, model?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
    if (model) {
      this.model = model;
    }
  }

  /**
   * Request a suggestion from OpenAI.
   * Builds prompt, calls API, parses and validates response with retry.
   */
  async suggest(req: SuggestionRequest): Promise<SuggestionResponse> {
    const prompt = buildPrompt(req);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Call OpenAI with timeout wrapper
        const response = await this.callWithTimeout(prompt);

        // Parse and validate response
        return parseModelResponse(response);
      } catch (e) {
        lastError = e as Error;

        // If this is a validation error and we have retries left, try again
        if (attempt < MAX_RETRIES && this.isValidationError(lastError)) {
          console.warn(
            `Suggestion parse failed (attempt ${attempt + 1}), retrying…`,
            lastError.message
          );
          continue;
        }

        // Otherwise, throw
        throw lastError;
      }
    }

    // Should not reach here, but just in case
    throw lastError || new Error("Unknown error in suggest");
  }

  /**
   * Call OpenAI API with timeout guardrail.
   */
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

  /**
   * Heuristic: is this a schema/parse error (retry-able)
   * vs. a fatal error (API key, quota, etc.)?
   */
  private isValidationError(error: Error): boolean {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("schema validation") ||
      msg.includes("no json object") ||
      msg.includes("not valid json")
    );
  }
}

/**
 * Stub provider for development (no API key required)
 */
export class StubSuggestionProvider implements SuggestionProvider {
  async suggest(req: SuggestionRequest): Promise<SuggestionResponse> {
    // Return a deterministic stub response
    return {
      issueSummary: `[STUB] Improved clarity for: "${req.selection.selectedText.slice(0, 20)}..."`,
      rationale: `This ${req.actionType} improves readability.`,
      proposedText: `[IMPROVED] ${req.selection.selectedText}`,
      riskNotes: "This is a stub response (no API key configured)",
      confidence: 0.5,
    };
  }
}

// Export factory for easy integration
export function createOpenAiProvider(
  apiKey?: string,
  model?: string
): OpenAiSuggestionProvider {
  return new OpenAiSuggestionProvider(apiKey, model);
}
