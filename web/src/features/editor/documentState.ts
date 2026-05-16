import { useCallback, useState } from "react";
import { loadDocument } from "./saveDocument";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export interface DocumentSaveResult {
  hash: string;
  backupPath: string;
  savedAt: string;
}

interface DocumentEditorState {
  content: string;
  loading: boolean;
  saving: boolean;
  error: string | null;
  dirty: boolean;
  loadDoc: (docPath: string) => Promise<void>;
  updateContent: (next: string) => void;
  saveDoc: (docPath: string) => Promise<DocumentSaveResult>;
}

export function useDocumentEditor(): DocumentEditorState {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const loadDoc = useCallback(async (docPath: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadDocument(docPath);
      setContent(result.content);
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateContent = useCallback((next: string) => {
    setContent(next);
    setDirty(true);
  }, []);

  const saveDoc = useCallback(async (docPath: string) => {
    setSaving(true);
    setError(null);
    try {
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
      setDirty(false);
      return {
        hash: payload.hash,
        backupPath: payload.backupPath,
        savedAt: payload.timestamp,
      } satisfies DocumentSaveResult;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setSaving(false);
    }
  }, [content]);

  return {
    content,
    loading,
    saving,
    error,
    dirty,
    loadDoc,
    updateContent,
    saveDoc,
  };
}
