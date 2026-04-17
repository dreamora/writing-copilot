import type { EditorRole } from "./suggestion-types";

export const ALWAYS_ON_GUARDRAILS = [
  "Edit only the selected span. Do not rewrite surrounding paragraphs, headings, or ideas outside the selection.",
  "Preserve factual meaning unless the user explicitly asks for a deeper rewrite.",
  "Preserve the original register unless the selected role explicitly changes it.",
  "If the original sentence is already strong, make a minimal edit rather than a visible rewrite.",
  "Prefer stronger verbs, cleaner nouns, and better rhythm over adding adjectives.",
  "Do not add explanation, commentary, or meta-text inside proposedText.",
];

const ROLE_GUARDRAILS: Partial<Record<EditorRole, string[]>> = {
  "professional-lector": ["Favor local improvements in clarity, grammar, rhythm, and emphasis."],
  "rigorous-reviewer": ["Be more diagnostic than decorative: surface the weakness clearly before fixing it."],
  "precise-editor": ["Choose the cleanest, most exact wording available."],
  "sharp-stylist": ["Increase edge and memorability through control, not ornament."],
  "joyful-but-adult": [
    "Increase joy through lift, rhythm, and vividness — not through cuteness.",
    "Avoid childlike modifiers such as little, sparkly, magical, whimsical, adorable, or playful unless the source already clearly supports them.",
  ],
  "marc-voice": [
    "Keep the line grounded, sharp, adult, and practical.",
    "Favor agency, tension, and judgment over generic niceness.",
    "Avoid motivational fluff, corporate uplift, and cute embellishment.",
  ],
};

export function getGuardrailsForRole(role: EditorRole): string[] {
  return [...ALWAYS_ON_GUARDRAILS, ...(ROLE_GUARDRAILS[role] ?? [])];
}
