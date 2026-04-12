// Bead 1.6 — Block editor state hook
import { useState, useCallback } from "react";
import type { Block } from "../../../../src/domain/blocks/block";
import { parseMarkdown } from "../../../../src/domain/blocks/parse-markdown";
import { saveDocument, loadDocument } from "./saveDocument";
import type { SaveResult } from "./saveDocument";

interface BlockEditorState {
  blocks: Block[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  lastSave: SaveResult | null;
  dirtyIds: Set<string>;
  updateBlock: (id: string, newMarkdown: string) => void;
  saveAll: () => Promise<void>;
  loadDoc: (docPath: string) => Promise<void>;
}

export function useBlockEditor(initialDocPath?: string): BlockEditorState {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSave, setLastSave] = useState<SaveResult | null>(null);
  const [docPath, setDocPath] = useState(initialDocPath ?? "");

  const loadDoc = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    setDocPath(path);
    try {
      const { content } = await loadDocument(path);
      const parsed = parseMarkdown(content);
      setBlocks(parsed);
      setDirtyIds(new Set());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBlock = useCallback((id: string, newMarkdown: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, markdown: newMarkdown } : b))
    );
    setDirtyIds((prev) => new Set([...prev, id]));
  }, []);

  const saveAll = useCallback(async () => {
    if (!docPath) return;
    setSaving(true);
    setError(null);
    try {
      const result = await saveDocument(docPath, blocks);
      setLastSave(result);
      // Re-parse after save to reset dirty state and recompute IDs
      const { content } = await loadDocument(docPath);
      setBlocks(parseMarkdown(content));
      setDirtyIds(new Set());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [docPath, blocks]);

  return {
    blocks,
    loading,
    saving,
    error,
    lastSave,
    dirtyIds,
    updateBlock,
    saveAll,
    loadDoc,
  };
}
