import { hashString } from "../../../../src/domain/blocks/hash-string";
import { loadDocument } from "./saveDocument";
import type { DocumentSaveResult } from "./documentState";
import type { WorkspaceFileEntry, WorkspaceFileHandle } from "../workspace/workspaceTypes";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export type DocumentSourceKind = "server" | "workspace";

export interface LoadedDocument {
  content: string;
  hash: string;
}

export interface DocumentSource {
  kind: DocumentSourceKind;
  documentId: string;
  label: string;
  relativePath: string;
  load: () => Promise<LoadedDocument>;
  save: (content: string) => Promise<DocumentSaveResult>;
}

export function createServerDocumentId(docPath: string): string {
  return `doc-${fnv1a(docPath)}`;
}

export function createServerDocumentSource(docPath: string): DocumentSource {
  return {
    kind: "server",
    documentId: createServerDocumentId(docPath),
    label: docPath,
    relativePath: docPath,
    load: () => loadDocument(docPath),
    save: async (content: string) => {
      const res = await fetch(`${API_BASE}/api/docs/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: docPath, content }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(`Save failed: ${(err as { error?: string }).error ?? res.statusText}`);
      }
      const payload = (await res.json()) as { hash: string; backupPath: string; timestamp: string };
      return {
        hash: payload.hash,
        backupPath: payload.backupPath,
        savedAt: payload.timestamp,
      };
    },
  };
}

export function createWorkspaceDocumentSource(entry: WorkspaceFileEntry): DocumentSource {
  return {
    kind: "workspace",
    documentId: entry.id,
    label: entry.name,
    relativePath: entry.relativePath,
    load: async () => readWorkspaceFile(entry.handle),
    save: async (content: string) => writeWorkspaceFile(entry.handle, content),
  };
}

export async function readWorkspaceFile(handle: WorkspaceFileHandle): Promise<LoadedDocument> {
  const file = await handle.getFile();
  const content = await file.text();
  return {
    content,
    hash: hashString(content),
  };
}

export async function writeWorkspaceFile(
  handle: WorkspaceFileHandle,
  content: string,
): Promise<DocumentSaveResult> {
  if (!handle.createWritable) {
    throw new Error("Save failed: workspace file is not writable");
  }
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
  return {
    hash: hashString(content),
    backupPath: "",
    savedAt: new Date().toISOString(),
  };
}

function fnv1a(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
