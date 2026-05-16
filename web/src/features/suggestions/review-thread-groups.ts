import type { Suggestion } from "../../../../src/domain/suggestions/suggestion-types";

export interface ReviewThreadGroups {
  actionable: Suggestion[];
  deferred: Suggestion[];
  history: Suggestion[];
}

const HISTORY_STATUSES = new Set<Suggestion["status"]>(["accepted", "rejected", "edited_applied"]);

export function groupReviewThreads(suggestions: Suggestion[]): ReviewThreadGroups {
  const actionable: Suggestion[] = [];
  const deferred: Suggestion[] = [];
  const history: Suggestion[] = [];

  for (const suggestion of suggestions) {
    if (suggestion.status === "deferred") {
      deferred.push(suggestion);
      continue;
    }

    if (HISTORY_STATUSES.has(suggestion.status)) {
      history.push(suggestion);
      continue;
    }

    actionable.push(suggestion);
  }

  return {
    actionable,
    deferred,
    history,
  };
}
