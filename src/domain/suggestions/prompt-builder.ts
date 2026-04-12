// Bead 2.4 — Prompt builder with strict response schema
import type { SuggestionRequest, SuggestionActionType } from "./suggestion-types";

const ACTION_DESCRIPTIONS: Record<SuggestionActionType, string> = {
  ask: "Answer the user's question about this text, referencing the specific passage.",
  rewrite: "Rewrite the selected text to improve clarity and flow while preserving the original meaning.",
  tighten: "Tighten the selected text: remove redundancy, shorten sentences, eliminate filler words.",
  clarify: "Clarify the selected text: make it easier to understand without dumbing it down.",
  custom: "Follow the custom instruction provided by the user.",
};

const RESPONSE_SCHEMA = `
Respond with ONLY valid JSON in this exact shape (no markdown, no preamble):
{
  "issueSummary": "<one sentence: what problem this edit solves>",
  "rationale": "<one to two sentences: why this change is better>",
  "proposedText": "<the replacement text for the selected span only>",
  "riskNotes": "<optional: any risk or caveat, or null>",
  "confidence": <number 0.0 to 1.0>
}
`.trim();

export function buildPrompt(req: SuggestionRequest): string {
  const actionDesc = req.actionType === "custom" && req.customInstruction
    ? `Custom instruction: ${req.customInstruction}`
    : ACTION_DESCRIPTIONS[req.actionType];

  const contextSection =
    req.context.before || req.context.after
      ? `\n\n---CONTEXT BEFORE---\n${req.context.before || "(start of document)"}\n\n---CONTEXT AFTER---\n${req.context.after || "(end of document)"}`
      : "";

  const styleSection = req.style
    ? `\n\n---STYLE CONSTRAINTS---\n${req.style.voice ? `Voice: ${req.style.voice}` : ""}${req.style.tone ? `\nTone: ${req.style.tone}` : ""}${req.style.brevity ? `\nBrevity: ${req.style.brevity}` : ""}`
    : "";

  return `You are an expert editorial AI. Your job is to provide a precise, anchored suggestion for a specific text selection.

---TASK---
${actionDesc}

---SELECTED TEXT (the span to improve)---
${req.selection.selectedText}
${contextSection}
${styleSection}

---OUTPUT FORMAT---
${RESPONSE_SCHEMA}`;
}
