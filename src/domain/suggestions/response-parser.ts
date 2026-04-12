// Bead 2.4 — Structured response parser with schema validation
import { z } from "zod";
import type { SuggestionResponse } from "./suggestion-types";

const SuggestionResponseSchema = z.object({
  issueSummary: z.string().min(1),
  rationale: z.string().min(1),
  proposedText: z.string().min(1),
  riskNotes: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

/**
 * Parse and validate an AI model response string into SuggestionResponse.
 * Extracts JSON from the response (handles markdown code blocks).
 * Throws if the response is malformed or fails schema validation.
 */
export function parseModelResponse(raw: string): SuggestionResponse {
  // Strip markdown code fences if present
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  // Extract JSON object (find first { ... } block)
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Model response contains no JSON object. Got: ${raw.slice(0, 200)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`Model response is not valid JSON: ${(e as Error).message}`);
  }

  const result = SuggestionResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Model response failed schema validation: ${result.error.issues.map((i) => i.message).join("; ")}`
    );
  }

  return {
    issueSummary: result.data.issueSummary,
    rationale: result.data.rationale,
    proposedText: result.data.proposedText,
    riskNotes: result.data.riskNotes ?? undefined,
    confidence: result.data.confidence,
  };
}
