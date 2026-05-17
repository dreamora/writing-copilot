import { useCallback, useState } from "react";
import {
  createServerDocumentSource,
  type DocumentSource,
} from "./documentSource";

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
  loadDoc: (source: string | DocumentSource) => Promise<void>;
  updateContent: (next: string) => void;
  saveDoc: (source: string | DocumentSource) => Promise<DocumentSaveResult>;
}

export function useDocumentEditor(): DocumentEditorState {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const loadDoc = useCallback(async (input: string | DocumentSource) => {
    const source = resolveDocumentSource(input);
    setLoading(true);
    setError(null);
    try {
      const result = await source.load();
      setContent(result.content);
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateContent = useCallback((next: string) => {
    setContent(next);
    setDirty(true);
  }, []);

  const saveDoc = useCallback(async (input: string | DocumentSource) => {
    const source = resolveDocumentSource(input);
    setSaving(true);
    setError(null);
    try {
      const result = await source.save(content);
      setDirty(false);
      return result;
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

function resolveDocumentSource(input: string | DocumentSource): DocumentSource {
  return typeof input === "string" ? createServerDocumentSource(input) : input;
}
