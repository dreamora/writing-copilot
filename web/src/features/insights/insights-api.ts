// Bead 4.2 — API adapters for insight cockpit
import type { AcceptanceMetric, TimeMetric, HotspotMetric } from "./insights-models";

const API_BASE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE)
  ? import.meta.env.VITE_API_BASE
  : "";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchAcceptanceByType(documentId?: string): Promise<AcceptanceMetric[]> {
  const q = documentId ? `?documentId=${encodeURIComponent(documentId)}` : "";
  return fetchJson<AcceptanceMetric[]>(`${API_BASE}/api/insights/acceptance-by-type${q}`);
}

export async function fetchTimeByBlock(sessionId?: string, documentId?: string): Promise<TimeMetric[]> {
  const params = new URLSearchParams();
  if (sessionId) params.set("sessionId", sessionId);
  if (documentId) params.set("documentId", documentId);
  const q = params.toString() ? `?${params.toString()}` : "";
  return fetchJson<TimeMetric[]>(`${API_BASE}/api/insights/time-by-block${q}`);
}

export async function fetchRewritePatterns(documentId?: string): Promise<HotspotMetric[]> {
  const q = documentId ? `?documentId=${encodeURIComponent(documentId)}` : "";
  return fetchJson<HotspotMetric[]>(`${API_BASE}/api/insights/rewrite-patterns${q}`);
}

export async function fetchSuggestionSearch(query: string, limit = 20): Promise<Array<{ suggestionId: string; issueSummary: string; proposedText: string; rank: number }>> {
  return fetchJson(`${API_BASE}/api/insights/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}
