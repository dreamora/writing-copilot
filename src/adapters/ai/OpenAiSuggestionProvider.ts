import OpenAI from "openai";
import {
  getActionContract,
  getCuratedLens,
  getProfessionalModeContract,
} from "../../domain/suggestions/professional-mode-contracts";
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
        max_tokens: 1000,
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
    const contract = getProfessionalModeContract(req.editorRole);
    const action = getActionContract(contract.role, req.actionType);
    const lens = getCuratedLens(req.activeLens);
    const lensName = lens?.label ?? "Professional contract";
    const lensFocus = lens
      ? contract.lensInterpretations[lens.id]
      : contract.sharedActionInterpretations.rewrite;
    const focus = req.actionType === "de-slop"
      ? `AI residue removal: ${action.promptInstruction} Lens behavior: ${lensFocus}`
      : lensFocus;
    const stage = req.workflowStage ?? "final-output";
    const proposedText = req.actionType === "de-slop"
      ? deslopFallback(req.selection.selectedText)
      : req.selection.selectedText;
    const didChange = proposedText !== req.selection.selectedText;

    return {
      issueSummary: `[STUB] ${contract.label} used ${action.label} for: "${req.selection.selectedText.slice(0, 20)}..."`,
      rationale: didChange
        ? `${action.label} removed fallback-detectable AI residue while preserving the selected span's structure.`
        : `${action.label} follows the ${contract.label} contract through the ${lensName} lens.`,
      proposedText,
      shownEdit: {
        editType: action.label,
        proposedText,
        whyThisEdit: didChange
          ? "Fallback mode made conservative local edits instead of adding a role label or echoing the draft."
          : `Stub mode shows how ${contract.label} would make ${action.label} visible.`,
      },
      lenses: [
        {
          name: lensName,
          focus,
          sourceSignals: [req.selection.selectedText.slice(0, 80)],
          relevance: lens?.relevance ?? `Applies the ${contract.label} contract during ${stage} review.`,
        },
      ],
      provocations: [
        {
          kind: stage === "source-processing" ? "source-question" : "critique",
          stage,
          prompt: `What would ${contract.label} challenge before accepting this ${action.label} suggestion?`,
          whyItMatters: "Stub mode still preserves the tool-for-thought contract.",
          optional: true,
        },
        {
          kind: "alternative",
          stage: "both",
          prompt: lens
            ? `What changes if you apply a different lens than ${lens.label}?`
            : "What is the strongest plausible alternative framing?",
          whyItMatters: "Alternatives prevent the first generated edit from becoming the only path.",
          optional: true,
        },
      ],
      riskNotes: "This is a stub response (no ChatGPT auth configured, token expired, or token invalid)",
      confidence: 0.5,
    };
  }
}

function deslopFallback(text: string): string {
  return [
    [/\bOne of the clearest lessons I\u2019ve learned from two years of working with AI is that it does not need to be perfect to be useful\./g, "The clearest thing I have learned from two years of working with AI is this: it does not need to be perfect to be useful."],
    [/\bIt needs to earn its keep in specific ways:/g, "It needs to help in specific ways:"],
    [/\bchallenge my thinking and surface weak reasoning\b/g, "challenge my thinking and show me where the reasoning is weak"],
    [/\bbreak ideas down until I understand them more clearly\b/g, "break ideas down far enough that I can see what I actually think"],
    [/\bgive me a starting point I can test, fail with, and learn from quickly\b/g, "give me a starting point I can test, break, and learn from"],
    [/\bI do not need AI to outsource my judgment\./g, "I do not need AI to take over my judgment."],
    [/\bI need it to sharpen my judgment\./g, "I need it to make my judgment sharper."],
    [/\bwhere does it still fall short of the standard you actually need\?/g, "where is it still below the bar you actually need?"],
    [/\bunlocking a deeper way of thinking that empowers us to move forward with clarity\b/g, "thinking better without pretending the tool can do the judgment for us"],
    [/\bnot just about\b/g, "not really about"],
    [/\bmove forward with clarity\b/g, "make a clearer call"],
  ].reduce((current, [pattern, replacement]) => current.replace(pattern as RegExp, replacement as string), text);
}

export function createSuggestionProvider(auth: ChatGptAuthConfig | null): SuggestionProvider {
  return auth ? new OpenAiSuggestionProvider(auth) : new StubSuggestionProvider();
}

export function createOpenAiProvider(auth: ChatGptAuthConfig): OpenAiSuggestionProvider {
  return new OpenAiSuggestionProvider(auth);
}
