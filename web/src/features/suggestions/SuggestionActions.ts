import type { Suggestion, SuggestionRequest } from "../../../../src/domain/suggestions/suggestion-types";

const API_BASE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE)
  ? import.meta.env.VITE_API_BASE
  : "";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    const err = isJson
      ? await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
      : { error: await buildNonJsonError(url, res) };
    throw new Error(err.error ?? res.statusText);
  }
  if (!isJson) {
    throw new Error(await buildNonJsonError(url, res));
  }
  return res.json() as Promise<T>;
}

async function buildNonJsonError(url: string, res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  const returnedHtml = body.trimStart().startsWith("<!DOCTYPE") || body.trimStart().startsWith("<html");
  if (returnedHtml) {
    return `API returned HTML instead of JSON for ${url}. The API/static server may be stale; restart it so the latest routes are loaded.`;
  }
  return `API returned ${res.headers.get("content-type") || "non-JSON"} instead of JSON for ${url}.`;
}

async function postSuggestionAction<T>(path: string, body?: unknown): Promise<T> {
  return fetchJson<T>(`${API_BASE}${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function createSuggestion(req: SuggestionRequest & { sessionId?: string }): Promise<Suggestion> {
  return postSuggestionAction<Suggestion>("/api/suggestions", req);
}

export async function fetchSuggestions(documentId: string): Promise<Suggestion[]> {
  return fetchJson<Suggestion[]>(`${API_BASE}/api/suggestions?documentId=${encodeURIComponent(documentId)}`);
}

export async function acceptSuggestion(id: string, sessionId?: string): Promise<Suggestion> {
  return postSuggestionAction<Suggestion>(`/api/suggestions/${id}/accept`, sessionId ? { sessionId } : undefined);
}

export async function rejectSuggestion(id: string, sessionId?: string): Promise<Suggestion> {
  return postSuggestionAction<Suggestion>(`/api/suggestions/${id}/reject`, sessionId ? { sessionId } : undefined);
}

export async function editApplySuggestion(id: string, editedText: string, sessionId?: string): Promise<Suggestion> {
  return postSuggestionAction<Suggestion>(`/api/suggestions/${id}/edit-apply`, {
    editedText,
    ...(sessionId ? { sessionId } : {}),
  });
}

export async function deferSuggestion(id: string, sessionId?: string): Promise<Suggestion> {
  return postSuggestionAction<Suggestion>(`/api/suggestions/${id}/defer`, sessionId ? { sessionId } : undefined);
}

export async function reopenSuggestion(id: string, sessionId?: string): Promise<Suggestion> {
  return postSuggestionAction<Suggestion>(`/api/suggestions/${id}/reopen`, sessionId ? { sessionId } : undefined);
}
