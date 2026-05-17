import type { EditorRole } from "./suggestion-types";

export interface VoiceProfile {
  name: string;
  sourceSignals: string[];
  summary: string;
  preferredMoves: string[];
  avoidMoves: string[];
  cadenceNotes: string[];
}

export const MARC_VOICE_PROFILE: VoiceProfile = {
  name: "Marc public voice",
  sourceSignals: [
    "03-Resources/Substack Archive/dreamora.substack.com/2026-03-30-how-fear-shows-you-here-ai-can-help-you-most.md",
    "03-Resources/Substack Archive/dreamora.substack.com/2025-09-25-why-i-deleted-my-health-apps-and-started-feeling-healthier.md",
    "02-Areas/Writing/Writing Process.md",
    "01-Projects/AI Business Building/Substack/Content Strategy.md",
  ],
  summary:
    "Grounded, sharp, practical, adult, and agency-oriented. Prefers clear framing, useful tension, and vivid clarity over fluff or decoration.",
  preferredMoves: [
    "Use contrast to sharpen a point.",
    "Favor concrete claims over abstract uplift.",
    "Let rhythm carry force without becoming theatrical.",
    "Use light dry humor sparingly when it increases precision or bite.",
  ],
  avoidMoves: [
    "Childish or cutesy language.",
    "Generic AI politeness or smoothing.",
    "LinkedIn-bro inspiration language.",
    "LinkedIn creator cadence: hook, bullets, lesson, engagement question.",
    "Too many adjectives or inflated emotional tone.",
    "Em-dash-heavy AI cadence.",
    "Generic hinge phrases that create fake depth.",
    "Social-post packaging, CTAs, or audience prompts added to a local edit.",
    "Over-clean phrasing that removes the useful roughness from a real thought.",
  ],
  cadenceNotes: [
    "Often builds through contrast or reframed questions.",
    "Can be reflective, but lands on agency or judgment.",
    "Prefers tight, forceful sentences over ornamental ones.",
    "Uses clean sentence breaks more often than ornamental punctuation.",
    "Preserves the draft's rhetorical shape instead of converting it into platform-native content.",
    "Can keep a little unevenness when it makes the line sound thought-through rather than manufactured.",
  ],
};

export function getVoiceProfileForRole(role: EditorRole): VoiceProfile | undefined {
  if (role === "marc-voice") return MARC_VOICE_PROFILE;
  return undefined;
}
