import { getGuardrailsForRole } from "./editorial-guardrails";
import { getEditorialPreset } from "./editorial-presets";
import { formatFewShotExamples } from "./few-shot-examples";
import { getVoiceProfileForRole } from "./voice-profiles";
import type { SuggestionRequest } from "./suggestion-types";

export interface PromptPolicy {
  roleLabel: string;
  mission: string;
  editingHierarchy: string[];
  preferredMoves: string[];
  avoidMoves: string[];
  reviewLens: string[];
  guardrails: string[];
  voiceSummary?: string;
  voiceSourceSignals?: string[];
  voicePreferredMoves?: string[];
  voiceAvoidMoves?: string[];
  voiceCadenceNotes?: string[];
  examples: string;
}

export function buildPromptPolicy(req: SuggestionRequest): PromptPolicy {
  const preset = getEditorialPreset(req.editorRole);
  const guardrails = getGuardrailsForRole(preset.role);
  const voiceProfile = getVoiceProfileForRole(preset.role);

  return {
    roleLabel: preset.label,
    mission: preset.mission,
    editingHierarchy: preset.editingHierarchy,
    preferredMoves: preset.preferredMoves,
    avoidMoves: preset.avoidMoves,
    reviewLens: preset.reviewLens,
    guardrails,
    voiceSummary: voiceProfile?.summary,
    voiceSourceSignals: voiceProfile?.sourceSignals,
    voicePreferredMoves: voiceProfile?.preferredMoves,
    voiceAvoidMoves: voiceProfile?.avoidMoves,
    voiceCadenceNotes: voiceProfile?.cadenceNotes,
    examples: formatFewShotExamples(preset.role),
  };
}
