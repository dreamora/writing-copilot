import { getGuardrailsForRole } from "./editorial-guardrails";
import { getEditorialPreset } from "./editorial-presets";
import { formatFewShotExamples } from "./few-shot-examples";
import {
  describeLensForStage,
  getActionContract,
  getCuratedLens,
  getProfessionalModeContract,
  type CuratedLens,
  type ProfessionalModeContract,
} from "./professional-mode-contracts";
import { getVoiceProfileForRole } from "./voice-profiles";
import type { SuggestionActionType, SuggestionRequest } from "./suggestion-types";

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
  professionalContract: ProfessionalModeContract;
  actionLabel: string;
  actionInstruction: string;
  actionDescription: string;
  selectedLens?: CuratedLens;
  lensStageFocus?: string;
  lensRoleInterpretation?: string;
}

export function buildPromptPolicy(req: SuggestionRequest): PromptPolicy {
  const preset = getEditorialPreset(req.editorRole);
  const professionalContract = getProfessionalModeContract(preset.role);
  const action = getActionContract(preset.role, req.actionType as SuggestionActionType);
  const selectedLens = getCuratedLens(req.activeLens);
  const workflowStage = req.workflowStage ?? "final-output";
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
    professionalContract,
    actionLabel: action.label,
    actionInstruction: action.promptInstruction,
    actionDescription: action.description,
    selectedLens,
    lensStageFocus: selectedLens ? describeLensForStage(selectedLens, workflowStage) : undefined,
    lensRoleInterpretation: selectedLens ? professionalContract.lensInterpretations[selectedLens.id] : undefined,
  };
}
