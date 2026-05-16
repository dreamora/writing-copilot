// Suggestion domain contracts — Phase 2

export type SuggestionActionType =
  | "ask"
  | "rewrite"
  | "tighten"
  | "clarify"
  | "de-slop"
  | "custom"
  | "flow-check"
  | "register-check"
  | "challenge-claim"
  | "evidence-stress-test"
  | "disambiguate"
  | "cut-to-exact-claim"
  | "sharpen-contrast"
  | "improve-cadence"
  | "add-warmth"
  | "lift-without-cuteness"
  | "agency-frame"
  | "ground-the-claim";

export type SuggestionWorkflowStage = "source-processing" | "final-output";

export type ProvocationStage = SuggestionWorkflowStage | "both";

export type ProvocationKind =
  | "critique"
  | "alternative"
  | "counterargument"
  | "fallacy-check"
  | "lateral-move"
  | "source-question";

export type EditorRole =
  | "professional-lector"
  | "rigorous-reviewer"
  | "precise-editor"
  | "sharp-stylist"
  | "joyful-but-adult"
  | "marc-voice";

export type CuratedLensId =
  | "evidence-quality"
  | "reader-friction"
  | "strategic-risk"
  | "voice-fidelity"
  | "commercial-implication"
  | "source-relevance";

export type SuggestionStatus =
  | "open"
  | "accepted"
  | "rejected"
  | "edited_applied"
  | "deferred";

export interface SuggestionSelection {
  charStart: number;
  charEnd: number;
  selectedText: string;
}

export interface SuggestionContext {
  before: string;
  after: string;
}

export interface SuggestionStyle {
  voice?: string;
  brevity?: "short" | "medium" | "long";
  tone?: string;
}

export interface ShownEdit {
  editType: string;
  proposedText: string;
  whyThisEdit: string;
}

export interface ThoughtLens {
  name: string;
  focus: string;
  sourceSignals: string[];
  relevance: string;
}

export interface ThoughtProvocation {
  kind: ProvocationKind;
  stage: ProvocationStage;
  prompt: string;
  whyItMatters: string;
  optional: boolean;
}

export interface SuggestionRequest {
  documentId: string;
  blockId: string;
  selection: SuggestionSelection;
  actionType: SuggestionActionType;
  customInstruction?: string;
  context: SuggestionContext;
  style?: SuggestionStyle;
  model?: string;
  editorRole?: EditorRole;
  workflowStage?: SuggestionWorkflowStage;
  activeLens?: string;
}

export interface SuggestionResponse {
  issueSummary: string;
  rationale: string;
  proposedText: string;
  riskNotes?: string;
  confidence?: number;
  shownEdit?: ShownEdit;
  lenses?: ThoughtLens[];
  provocations?: ThoughtProvocation[];
}

export interface Suggestion {
  id: string;
  documentId: string;
  blockId: string;
  actionType: SuggestionActionType;
  selectedText: string;
  charStart: number;
  charEnd: number;
  contextBefore: string;
  contextAfter: string;
  customInstruction?: string;
  issueSummary: string;
  rationale: string;
  proposedText: string;
  riskNotes?: string;
  confidence?: number;
  editorRole?: EditorRole;
  workflowStage: SuggestionWorkflowStage;
  activeLens?: string;
  shownEdit?: ShownEdit;
  lenses: ThoughtLens[];
  provocations: ThoughtProvocation[];
  status: SuggestionStatus;
  editedText?: string;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string;
}
