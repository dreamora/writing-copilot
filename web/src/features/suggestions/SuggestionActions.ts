// Bead 2.7 — API calls for suggestion lifecycle
import type { Suggestion, SuggestionRequest } from "../../../../src/domain/suggestions/suggestion-types";

const API_BASE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE)
  ? import.meta.env.VITE_API_BASE
  : "";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(err.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function createSuggestion(req: SuggestionRequest): Promise<Suggestion> {
  return fetchJson<Suggestion>(`${API_BASE}/api/suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
}

export async function fetchSuggestions(documentId: string): Promise<Suggestion[]> {
  return fetchJson<Suggestion[]>(`${API_BASE}/api/suggestions?documentId=${encodeURIComponent(documentId)}`);
}

export async function acceptSuggestion(id: string): Promise<Suggestion> {
  return fetchJson<Suggestion>(`${API_BASE}/api/suggestions/${id}/accept`, { method: "POST" });
}

export async function rejectSuggestion(id: string): Promise<Suggestion> {
  return fetchJson<Suggestion>(`${API_BASE}/api/suggestions/${id}/reject`, { method: "POST" });
}

export async function editApplySuggestion(id: string, editedText: string): Promise<Suggestion> {
  return fetchJson<Suggestion>(`${API_BASE}/api/suggestions/${id}/edit-apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ editedText }),
  });
}

export async function deferSuggestion(id: string): Promise<Suggestion> {
  return fetchJson<Suggestion>(`${API_BASE}/api/suggestions/${id}/defer`, { method: "POST" });
}
