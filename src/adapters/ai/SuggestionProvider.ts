// Bead 2.3 — AI provider interface (isolates model SDK from domain)
import type { SuggestionRequest, SuggestionResponse } from "../../domain/suggestions/suggestion-types";

export interface SuggestionProvider {
  /**
   * Request a suggestion from the AI model.
   * Returns structured SuggestionResponse or throws.
   */
  suggest(req: SuggestionRequest): Promise<SuggestionResponse>;
}
