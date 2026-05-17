// Bead 2.4 — Prompt builder with strict response schema
import type { SuggestionRequest } from "./suggestion-types";
import { buildPromptPolicy } from "./prompt-policy";

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

function buildToolForThoughtSection(req: SuggestionRequest, policy: ReturnType<typeof buildPromptPolicy>): string {
  const stage = req.workflowStage ?? "final-output";
  const stageLabel = stage === "source-processing" ? "SOURCE PROCESSING" : "FINAL OUTPUT WRITING";
  const lens = policy.selectedLens;
  const lensLine = lens
    ? [
        `Active lens: ${lens.label}`,
        `Lens purpose: ${lens.purpose}`,
        `Lens stage focus: ${policy.lensStageFocus}`,
        `Role-specific lens behavior: ${policy.lensRoleInterpretation}`,
      ].join("\n")
    : "Active lens: none selected\nLens behavior: apply the professional contract without inventing a free-form lens.";

  return `\n\n---TOOL-FOR-THOUGHT MODE---\nStage: ${stageLabel}\n${lensLine}\nPrinciples from AI-as-tool-for-thought design:\n- Preserve material engagement: the user should still inspect the source or draft, not outsource judgment.\n- Lenses are task-specific micro-representations, not generic summaries; they emphasize what matters for the current decision.\n- The shown edit must make the visible writing move explicit, not only provide polished replacement text.\n- Provocations are not meant to be accepted every time; they stimulate thinking and can be rejected when the user has reason.\n- Provocations must be useful during source processing and final output writing.\n- For source processing, use provocations to test source claims, missing evidence, assumptions, and relevance.\n- For final output writing, use provocations as critiques, alternatives, counterarguments, fallacy checks, or lateral moves.`;
}

function hasListStructure(text: string): boolean {
  return /(^|\n)\s*(?:[-*]|\u2022|\d+[.)])\s+\S/.test(text);
}

function endsWithQuestion(text: string): boolean {
  return /\?\s*$/.test(text.trim());
}

function buildStructurePreservationSection(req: SuggestionRequest): string {
  const selectedText = req.selection.selectedText;
  const listRule = hasListStructure(selectedText)
    ? "- The selected text already uses list structure; preserve or repair that structure only if it serves the selected span."
    : "- The selected text is prose; proposedText must remain prose, not bullets, numbered lists, headings, a thread, or a hook/body/CTA format.";
  const questionRule = endsWithQuestion(selectedText)
    ? "- The selected text already ends as a question; keep a question only if it remains the local edit."
    : "- Do not add a closing question, audience prompt, call-to-action, engagement hook, or public-post ending.";

  return `\n\n---STRUCTURE PRESERVATION---\n- proposedText is a replacement for the selected span only, not a new draft or content format.\n- Preserve the selected span's rhetorical shape unless the user explicitly asks for restructuring.\n${listRule}\n${questionRule}\n- Do not add new claims, examples, lessons, timelines, or audience prompts.\n- Do not turn the selected passage into a social post, listicle, thread, carousel, or summary.`;
}

export function buildPrompt(req: SuggestionRequest): string {
  const policy = buildPromptPolicy(req);
  const actionDesc = req.actionType === "custom" && req.customInstruction
    ? `Custom instruction: ${req.customInstruction}\nRole-bounded interpretation: ${policy.actionInstruction}`
    : `${policy.actionLabel}: ${policy.actionInstruction}\nAction purpose: ${policy.actionDescription}`;

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

---PROFESSIONAL CONTRACT---
Responsibilities:
${policy.professionalContract.responsibilities.map((item) => `- ${item}`).join("\n")}
Intervention threshold:
- ${policy.professionalContract.interventionThreshold}
Refusal boundaries:
${policy.professionalContract.refusalBoundaries.map((item) => `- ${item}`).join("\n")}
Failure modes to avoid:
${policy.professionalContract.failureModes.map((item) => `- ${item}`).join("\n")}
Contract preferred moves:
${policy.professionalContract.preferredMoves.map((item) => `- ${item}`).join("\n")}
Output emphasis:
${policy.professionalContract.outputEmphasis.map((item) => `- ${item}`).join("\n")}

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

${buildToolForThoughtSection(req, policy)}

---TASK---
${actionDesc}
Shared action interpretation for this role:
- ${policy.professionalContract.sharedActionInterpretations[req.actionType as keyof typeof policy.professionalContract.sharedActionInterpretations] ?? policy.actionInstruction}

---SELECTED TEXT (the span to improve)---
${req.selection.selectedText}${contextSection}${styleSection}${examplesSection}
${buildStructurePreservationSection(req)}

---FINAL INSTRUCTIONS---
- Return the strongest local edit that still sounds like the same author.
- Keep proposedText anchored to the selected text only; do not rewrite the idea into a different content asset.
- Preserve the selected text's structure unless the action explicitly requires restructuring.
- If the best edit is minimal, keep it minimal.
- Do not become cute, whimsical, inflated, or generic.
- Do not use em dashes in proposedText unless the selected text already uses them and preserving one is essential.
- Avoid AI-smooth connective filler: no fake-profound hinge phrases, no generic uplift, no inflated contrast.
- Avoid LinkedIn creator cadence: no hook/body/CTA packaging, no invented bullet list, no engagement-bait question.
- Do not add new claims, examples, lessons, timelines, or audience prompts.
- Include at least one lens and at least two provocations.
- Keep provocations short, sharp, and optional; they should make the user think, not obey.

---OUTPUT FORMAT---
${RESPONSE_SCHEMA}`;
}
