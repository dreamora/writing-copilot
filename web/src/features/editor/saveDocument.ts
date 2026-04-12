// Bead 1.6 — Save integration
import type { Block } from "../../../../src/domain/blocks/block";
import { recomposeMarkdown } from "../../../../src/domain/blocks/recompose-markdown";

export interface SaveResult {
  hash: string;
  backupPath: string;
  savedAt: string;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

/**
 * Recompose blocks to markdown and POST to the API save endpoint.
 */
export async function saveDocument(
  docPath: string,
  blocks: Block[]
): Promise<SaveResult> {
  const content = recomposeMarkdown(blocks);
  const res = await fetch(`${API_BASE}/api/docs/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: docPath, content }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`Save failed: ${(err as { error?: string }).error ?? res.statusText}`);
  }
  return res.json() as Promise<SaveResult>;
}

/**
 * Load a document from the API and return raw markdown.
 */
export async function loadDocument(docPath: string): Promise<{ content: string; hash: string }> {
  const res = await fetch(
    `${API_BASE}/api/docs?path=${encodeURIComponent(docPath)}`
  );
  if (!res.ok) {
    throw new Error(`Load failed: ${res.statusText}`);
  }
  return res.json() as Promise<{ content: string; hash: string }>;
}
