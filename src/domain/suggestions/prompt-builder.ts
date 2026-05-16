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
  "shownEdit": {
    "editType": "<what visible edit operation was shown: precision, compression, tone test, strategic framing, etc.>",
    "proposedText": "<same replacement text as proposedText>",
    "whyThisEdit": "<one sentence: why this shown edit helps the user think or write better>"
  },
  "lenses": [
    {
      "name": "<short lens name>",
      "focus": "<what this lens makes visible in the selected text or source material>",
      "sourceSignals": ["<specific phrase, claim, assumption, or evidence signal from the text/context>"],
      "relevance": "<why this lens matters for the current task>"
    }
  ],
  "provocations": [
    {
      "kind": "<critique | alternative | counterargument | fallacy-check | lateral-move | source-question>",
      "stage": "<source-processing | final-output | both>",
      "prompt": "<a concise thinking prompt, not a command to accept the AI answer>",
      "whyItMatters": "<why this provocation could improve the user's reasoning>",
      "optional": true
    }
  ],
  "riskNotes": "<optional: any risk or caveat, or null>",
  "confidence": <number 0.0 to 1.0>
}
`.trim();

function buildToolForThoughtSection(req: SuggestionRequest): string {
  const stage = req.workflowStage ?? "final-output";
  const stageLabel = stage === "source-processing" ? "SOURCE PROCESSING" : "FINAL OUTPUT WRITING";
  const activeLens = req.activeLens?.trim();

  return `\n\n---TOOL-FOR-THOUGHT MODE---\nStage: ${stageLabel}\n${activeLens ? `Active lens: ${activeLens}\n` : ""}Principles from AI-as-tool-for-thought design:\n- Preserve material engagement: the user should still inspect the source or draft, not outsource judgment.\n- Lenses are task-specific micro-representations, not generic summaries; they emphasize what matters for the current decision.\n- The shown edit must make the visible writing move explicit, not only provide polished replacement text.\n- Provocations are not meant to be accepted every time; they stimulate thinking and can be rejected when the user has reason.\n- Provocations must be useful during source processing and final output writing.\n- For source processing, use provocations to test source claims, missing evidence, assumptions, and relevance.\n- For final output writing, use provocations as critiques, alternatives, counterarguments, fallacy checks, or lateral moves.`;
}

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

${buildToolForThoughtSection(req)}

---TASK---
${actionDesc}

---SELECTED TEXT (the span to improve)---
${req.selection.selectedText}${contextSection}${styleSection}${examplesSection}

---FINAL INSTRUCTIONS---
- Return the strongest local edit that still sounds like the same author.
- Keep the rewrite anchored to the selected text only.
- If the best edit is minimal, keep it minimal.
- Do not become cute, whimsical, inflated, or generic.
- Include at least one lens and at least two provocations.
- Keep provocations short, sharp, and optional; they should make the user think, not obey.

---OUTPUT FORMAT---
${RESPONSE_SCHEMA}`;
}
