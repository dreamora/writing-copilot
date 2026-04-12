// Bead 2.3 — OpenAI adapter implementation
import type { SuggestionProvider } from "./SuggestionProvider";
import type { SuggestionRequest, SuggestionResponse } from "../../domain/suggestions/suggestion-types";
import { buildPrompt } from "../../domain/suggestions/prompt-builder";
import { parseModelResponse } from "../../domain/suggestions/response-parser";

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 1;

export class OpenAiSuggestionProvider implements SuggestionProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(options?: { apiKey?: string; model?: string; baseUrl?: string }) {
    this.apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.model = options?.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    this.baseUrl = options?.baseUrl ?? "https://api.openai.com/v1";
  }

  async suggest(req: SuggestionRequest): Promise<SuggestionResponse> {
    const prompt = buildPrompt(req);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.callApi(prompt);
        return parseModelResponse(result);
      } catch (err) {
        if (attempt === MAX_RETRIES) throw err;
        // On parse failure, retry once with explicit JSON reminder
      }
    }

    throw new Error("Unreachable");
  }

  private async callApi(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`OpenAI API error ${res.status}: ${body.slice(0, 200)}`);
      }

      const data = (await res.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      return data.choices[0]?.message.content ?? "";
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Stub provider for tests — returns deterministic response without API call */
export class StubSuggestionProvider implements SuggestionProvider {
  async suggest(req: SuggestionRequest): Promise<SuggestionResponse> {
    return {
      issueSummary: `[STUB] Issue with "${req.selection.selectedText.slice(0, 30)}"`,
      rationale: "This is a stub response for testing.",
      proposedText: req.selection.selectedText + " [improved]",
      confidence: 0.8,
    };
  }
}
