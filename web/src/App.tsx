// App.tsx — Phase 2: full suggestion loop
import { useState, useEffect, useCallback } from "react";
import BlockEditor from "./features/editor/BlockEditor";
import { useBlockEditor } from "./features/editor/blockState";
import SuggestionThread from "./features/suggestions/SuggestionThread";
import {
  createSuggestion,
  fetchSuggestions,
  acceptSuggestion,
  rejectSuggestion,
  editApplySuggestion,
  deferSuggestion,
} from "./features/suggestions/SuggestionActions";
import type { Suggestion, SuggestionActionType } from "../../src/domain/suggestions/suggestion-types";
import type { SelectionSpan } from "./features/editor/SelectionState";
import { buildContextEnvelope } from "../../src/domain/suggestions/context-envelope";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";
const DEFAULT_DOC = import.meta.env.VITE_DEFAULT_DOC ?? "sample.md";
const DOCUMENT_ID = "doc-main"; // fixed for single-doc workflow

export default function App() {
  const [apiStatus, setApiStatus] = useState<"loading" | "ok" | "error">("loading");
  const [docPath, setDocPath] = useState(DEFAULT_DOC);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestionBlock, setLoadingSuggestionBlock] = useState<string | undefined>();
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const { blocks, loading, saving, error, dirtyIds, updateBlock, saveAll, loadDoc } =
    useBlockEditor();

  // API health check
  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((r) => (r.ok ? setApiStatus("ok") : setApiStatus("error")))
      .catch(() => setApiStatus("error"));
  }, []);

  // Load suggestions for document
  const refreshSuggestions = useCallback(async () => {
    try {
      const s = await fetchSuggestions(DOCUMENT_ID);
      setSuggestions(s);
    } catch {
      // non-critical
    }
  }, []);

  const handleLoad = () => {
    if (docPath) {
      loadDoc(docPath);
      refreshSuggestions();
    }
  };

  // Handle suggestion request from popover
  const handleRequestSuggestion = useCallback(
    async (
      blockId: string,
      selection: SelectionSpan,
      actionType: SuggestionActionType,
      customInstruction?: string
    ) => {
      setLoadingSuggestionBlock(blockId);
      setSuggestionError(null);
      try {
        const context = buildContextEnvelope(blocks, blockId);
        const newSuggestion = await createSuggestion({
          documentId: DOCUMENT_ID,
          blockId,
          selection,
          actionType,
          customInstruction,
          context,
        });
        setSuggestions((prev) => [newSuggestion, ...prev]);
      } catch (e) {
        setSuggestionError((e as Error).message);
      } finally {
        setLoadingSuggestionBlock(undefined);
      }
    },
    [blocks]
  );

  // Lifecycle actions
  const handleAccept = useCallback(async (id: string) => {
    const updated = await acceptSuggestion(id);
    // Apply proposed text to the block
    const s = suggestions.find((x) => x.id === id);
    if (s) updateBlock(s.blockId, updated.proposedText);
    setSuggestions((prev) => prev.map((x) => (x.id === id ? updated : x)));
  }, [suggestions, updateBlock]);

  const handleReject = useCallback(async (id: string) => {
    const updated = await rejectSuggestion(id);
    setSuggestions((prev) => prev.map((x) => (x.id === id ? updated : x)));
  }, []);

  const handleEditApply = useCallback(async (id: string, editedText: string) => {
    const updated = await editApplySuggestion(id, editedText);
    const s = suggestions.find((x) => x.id === id);
    if (s) updateBlock(s.blockId, editedText);
    setSuggestions((prev) => prev.map((x) => (x.id === id ? updated : x)));
  }, [suggestions, updateBlock]);

  const handleDefer = useCallback(async (id: string) => {
    const updated = await deferSuggestion(id);
    setSuggestions((prev) => prev.map((x) => (x.id === id ? updated : x)));
  }, []);

  const openSuggestions = suggestions.filter((s) => s.status === "open" || s.status === "deferred");

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "24px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "4px" }}>Writing Copilot</h1>

      {/* API status */}
      <div style={{ marginBottom: "16px" }}>
        <span
          style={{
            display: "inline-block",
            padding: "3px 10px",
            borderRadius: "12px",
            fontSize: "12px",
            background: apiStatus === "ok" ? "#d1fae5" : apiStatus === "error" ? "#fee2e2" : "#f3f4f6",
            color: apiStatus === "ok" ? "#065f46" : apiStatus === "error" ? "#991b1b" : "#6b7280",
          }}
        >
          API: {apiStatus}
        </span>
      </div>

      {/* Doc controls */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          type="text"
          value={docPath}
          onChange={(e) => setDocPath(e.target.value)}
          placeholder="Document path"
          style={{ flex: 1, padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "14px" }}
        />
        <button
          onClick={handleLoad}
          disabled={loading}
          style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
        >
          {loading ? "Loading…" : "Load"}
        </button>
        <button
          onClick={() => saveAll()}
          disabled={saving || blocks.length === 0 || dirtyIds.size === 0}
          style={{ padding: "8px 16px", background: dirtyIds.size > 0 ? "#f59e0b" : "#9ca3af", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
        >
          {saving ? "Saving…" : `Save${dirtyIds.size > 0 ? ` (${dirtyIds.size})` : ""}`}
        </button>
      </div>

      {(error || suggestionError) && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px", borderRadius: "4px", marginBottom: "12px", fontSize: "13px" }}>
          {error ?? suggestionError}
        </div>
      )}

      {/* Main layout: editor left, suggestions right */}
      <div style={{ display: "grid", gridTemplateColumns: blocks.length > 0 ? "1fr 360px" : "1fr", gap: "20px" }}>
        {/* Editor */}
        <div>
          {blocks.length > 0 && (
            <>
              <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "8px" }}>
                {blocks.length} block{blocks.length !== 1 ? "s" : ""}
                {dirtyIds.size > 0 && ` · ${dirtyIds.size} unsaved`}
                {" · "}
                <span style={{ color: "#6b7280" }}>Select text to get AI suggestion</span>
              </div>
              <BlockEditor
                blocks={blocks}
                onBlockChange={updateBlock}
                dirtyIds={dirtyIds}
                onRequestSuggestion={handleRequestSuggestion}
                loadingSuggestionBlockId={loadingSuggestionBlock}
              />
            </>
          )}
          {blocks.length === 0 && !loading && (
            <div style={{ color: "#9ca3af", textAlign: "center", padding: "40px" }}>
              Enter a document path and click Load to begin editing.
            </div>
          )}
        </div>

        {/* Suggestion panel */}
        {blocks.length > 0 && (
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>
              Suggestions {openSuggestions.length > 0 && `(${openSuggestions.length} open)`}
            </div>
            {suggestions.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: "13px", padding: "12px", border: "1px dashed #e5e7eb", borderRadius: "6px" }}>
                No suggestions yet. Select text in the editor to get started.
              </div>
            ) : (
              suggestions.map((s) => (
                <SuggestionThread
                  key={s.id}
                  suggestion={s}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onEditApply={handleEditApply}
                  onDefer={handleDefer}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
