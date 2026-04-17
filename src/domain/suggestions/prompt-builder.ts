// Bead 2.4 — Prompt builder with strict response schema
import type { SuggestionRequest, SuggestionActionType } from "./suggestion-types";
import { buildPromptPolicy } from "./prompt-policy";

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
  const policy = buildPromptPolicy(req);
  const actionDesc = req.actionType === "custom" && req.customInstruction
    ? `Custom instruction: ${req.customInstruction}`
    : ACTION_DESCRIPTIONS[req.actionType];

  const contextSection =
    req.context.before || req.context.after
      ? `\n\n---CONTEXT BEFORE---\n${req.context.before || "(start of document)"}\n\n---CONTEXT AFTER---\n${req.context.after || "(end of document)"}`
      : "";

  const styleSection = req.style
    ? `\n\n---STYLE CONSTRAINTS---\n${req.style.voice ? `Voice hint: ${req.style.voice}` : ""}${req.style.tone ? `\nTone hint: ${req.style.tone}` : ""}${req.style.brevity ? `\nBrevity hint: ${req.style.brevity}` : ""}`
    : "";

  const voiceSection = policy.voiceSummary
    ? `\n\n---VOICE PROFILE---\nSummary: ${policy.voiceSummary}\nPreferred moves:\n${policy.voicePreferredMoves?.map((item) => `- ${item}`).join("\n") ?? ""}\nAvoid:\n${policy.voiceAvoidMoves?.map((item) => `- ${item}`).join("\n") ?? ""}\nCadence notes:\n${policy.voiceCadenceNotes?.map((item) => `- ${item}`).join("\n") ?? ""}`
    : "";

  const examplesSection = policy.examples
    ? `\n\n---EDITORIAL EXAMPLES---\n${policy.examples}`
    : "";

  return `You are a senior line editor and writing reviewer. Your job is to improve the selected span only while respecting the chosen editorial role.

---ACTIVE ROLE---
${policy.roleLabel}

---ROLE MISSION---
${policy.mission}

---EDITING HIERARCHY---
${policy.editingHierarchy.map((item) => `- ${item}`).join("\n")}

---QUALITY BAR---
Review through this lens: ${policy.reviewLens.join(", ")}

---PREFERRED MOVES---
${policy.preferredMoves.map((item) => `- ${item}`).join("\n")}

---AVOID AT ALL COSTS---
${policy.avoidMoves.map((item) => `- ${item}`).join("\n")}

---HARD GUARDRAILS---
${policy.guardrails.map((item) => `- ${item}`).join("\n")}${voiceSection}

---TASK---
${actionDesc}

---SELECTED TEXT (the span to improve)---
${req.selection.selectedText}${contextSection}${styleSection}${examplesSection}

---FINAL INSTRUCTIONS---
- Return the strongest local edit that still sounds like the same author.
- Keep the rewrite anchored to the selected text only.
- If the best edit is minimal, keep it minimal.
- Do not become cute, whimsical, inflated, or generic.

---OUTPUT FORMAT---
${RESPONSE_SCHEMA}`;
}
