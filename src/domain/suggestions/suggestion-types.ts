// Suggestion domain contracts — Phase 2

export type SuggestionActionType =
  | "ask"
  | "rewrite"
  | "tighten"
  | "clarify"
  | "custom";

export type EditorRole =
  | "professional-lector"
  | "rigorous-reviewer"
  | "precise-editor"
  | "sharp-stylist"
  | "joyful-but-adult"
  | "marc-voice";

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
}

export interface SuggestionResponse {
  issueSummary: string;
  rationale: string;
  proposedText: string;
  riskNotes?: string;
  confidence?: number;
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
  status: SuggestionStatus;
  editedText?: string;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string;
}
