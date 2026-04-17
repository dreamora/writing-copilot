// App.tsx — Phase 4: tabbed UI with editor + insight cockpit + D2 compact summary
import { useState, useEffect, useCallback } from "react";
import BlockEditor from "./features/editor/BlockEditor";
import { useBlockEditor } from "./features/editor/blockState";
import SuggestionThread from "./features/suggestions/SuggestionThread";
import InsightsPage from "./features/insights/InsightsPage";
import CompactSummary from "./features/insights/CompactSummary";
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

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const DEFAULT_DOC = import.meta.env.VITE_DEFAULT_DOC ?? "sample.md";
const DOCUMENT_ID = "doc-main";

type Tab = "editor" | "insights";

type ApiHealth = {
  status: string;
  providerMode?: "stub" | "chatgpt" | "browser-session" | "codex";
  stubProvider?: boolean;
  authError?: string | null;
  authPath?: string;
};

function createSessionId(): string {
  const maybeCrypto = globalThis.crypto as Crypto | undefined;
  if (maybeCrypto?.randomUUID) return maybeCrypto.randomUUID();
  return `session-${Date.now()}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("editor");
  const [apiStatus, setApiStatus] = useState<"loading" | "ok" | "error">("loading");
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null);
  const [docPath, setDocPath] = useState(DEFAULT_DOC);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestionBlock, setLoadingSuggestionBlock] = useState<string | undefined>();
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [sessionId] = useState(() => createSessionId());

  const { blocks, loading, saving, error, dirtyIds, updateBlock, saveAll, loadDoc } = useBlockEditor();

  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then(async (r) => {
        if (!r.ok) {
          setApiStatus("error");
          return;
        }
        const payload = (await r.json()) as ApiHealth;
        setApiHealth(payload);
        setApiStatus("ok");
      })
      .catch(() => setApiStatus("error"));
  }, []);

  const refreshSuggestions = useCallback(async () => {
    try { setSuggestions(await fetchSuggestions(DOCUMENT_ID)); } catch {}
  }, []);

  const handleLoad = () => {
    if (docPath) { loadDoc(docPath); refreshSuggestions(); }
  };

  const handleRequestSuggestion = useCallback(async (
    blockId: string, selection: SelectionSpan,
    actionType: SuggestionActionType, customInstruction?: string
  ) => {
    setLoadingSuggestionBlock(blockId);
    setSuggestionError(null);
    try {
      const context = buildContextEnvelope(blocks, blockId);
      const newSug = await createSuggestion({ documentId: DOCUMENT_ID, blockId, selection, actionType, customInstruction, context, sessionId });
      setSuggestions((prev) => [newSug, ...prev]);
    } catch (e) {
      setSuggestionError((e as Error).message);
    } finally {
      setLoadingSuggestionBlock(undefined);
    }
  }, [blocks, sessionId]);

  const handleAccept = useCallback(async (id: string) => {
    const updated = await acceptSuggestion(id, sessionId);
    const s = suggestions.find((x) => x.id === id);
    if (s) updateBlock(s.blockId, updated.proposedText);
    setSuggestions((prev) => prev.map((x) => x.id === id ? updated : x));
  }, [sessionId, suggestions, updateBlock]);

  const handleReject = useCallback(async (id: string) => {
    const updated = await rejectSuggestion(id, sessionId);
    setSuggestions((prev) => prev.map((x) => x.id === id ? updated : x));
  }, [sessionId]);

  const handleEditApply = useCallback(async (id: string, editedText: string) => {
    const updated = await editApplySuggestion(id, editedText, sessionId);
    const s = suggestions.find((x) => x.id === id);
    if (s) updateBlock(s.blockId, editedText);
    setSuggestions((prev) => prev.map((x) => x.id === id ? updated : x));
  }, [sessionId, suggestions, updateBlock]);

  const handleDefer = useCallback(async (id: string) => {
    const updated = await deferSuggestion(id, sessionId);
    setSuggestions((prev) => prev.map((x) => x.id === id ? updated : x));
  }, [sessionId]);

  const openSuggestions = suggestions.filter((s) => s.status === "open" || s.status === "deferred");

  const providerBadgeLabel =
    apiHealth?.providerMode === "chatgpt" ? "AI live" :
    apiHealth?.providerMode === "browser-session" ? "AI browser" :
    apiHealth?.providerMode === "codex" ? "AI codex" :
    apiHealth?.providerMode === "stub" ? "AI stub" :
    "AI unknown";

  const TAB_STYLE = (active: boolean) => ({
    padding: "8px 16px",
    border: "none",
    borderBottom: active ? "2px solid #3b82f6" : "2px solid transparent",
    background: "transparent",
    color: active ? "#3b82f6" : "#6b7280",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: active ? 600 : 400,
  });

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 24px 24px", fontFamily: "sans-serif" }}>
      {/* Global header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "16px", marginBottom: "0" }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Writing Copilot</h1>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span
            style={{
              fontSize: "11px",
              padding: "2px 8px",
              borderRadius: "10px",
              background: apiStatus === "ok" ? "#d1fae5" : apiStatus === "error" ? "#fee2e2" : "#f3f4f6",
              color: apiStatus === "ok" ? "#065f46" : apiStatus === "error" ? "#991b1b" : "#6b7280",
            }}
          >
            API {apiStatus}
          </span>
          {apiStatus === "ok" && (
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "10px",
                background: apiHealth?.providerMode === "chatgpt" || apiHealth?.providerMode === "browser-session" || apiHealth?.providerMode === "codex"
                  ? "#dbeafe"
                  : "#fef3c7",
                color: apiHealth?.providerMode === "chatgpt" || apiHealth?.providerMode === "browser-session" || apiHealth?.providerMode === "codex"
                  ? "#1d4ed8"
                  : "#92400e",
              }}
              title={apiHealth?.authError ?? apiHealth?.authPath ?? providerBadgeLabel}
            >
              {providerBadgeLabel}
            </span>
          )}
        </div>
      </div>

      {apiHealth?.authError && (
        <div style={{ background: "#fef3c7", color: "#92400e", padding: "10px", borderRadius: "4px", marginTop: "12px", marginBottom: "12px", fontSize: "13px" }}>
          ⚠ Live AI is not ready yet: {apiHealth.authError}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", marginBottom: "20px" }}>
        <button type="button" style={TAB_STYLE(activeTab === "editor")} onClick={() => setActiveTab("editor")}>
          ✏️ Editor
        </button>
        <button type="button" style={TAB_STYLE(activeTab === "insights")} onClick={() => setActiveTab("insights")}>
          📊 Insights {openSuggestions.length > 0 && `(${openSuggestions.length})`}
        </button>
      </div>

      {/* Editor tab */}
      {activeTab === "editor" && (
        <>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <input type="text" value={docPath} onChange={(e) => setDocPath(e.target.value)}
              placeholder="Document path"
              style={{ flex: 1, padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "14px" }}
            />
            <button type="button" onClick={handleLoad} disabled={loading}
              style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              {loading ? "Loading…" : "Load"}
            </button>
            <button type="button" onClick={() => saveAll()} disabled={saving || blocks.length === 0 || dirtyIds.size === 0}
              style={{ padding: "8px 16px", background: dirtyIds.size > 0 ? "#f59e0b" : "#9ca3af", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              {saving ? "Saving…" : `Save${dirtyIds.size > 0 ? ` (${dirtyIds.size})` : ""}`}
            </button>
          </div>

          {(error || suggestionError) && (
            <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px", borderRadius: "4px", marginBottom: "12px", fontSize: "13px" }}>
              {error ?? suggestionError}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: blocks.length > 0 ? "1fr 340px" : "1fr", gap: "20px" }}>
            <div>
              {blocks.length > 0 ? (
                <>
                  <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "8px" }}>
                    {blocks.length} blocks{dirtyIds.size > 0 && ` · ${dirtyIds.size} unsaved`}
                    {" · "}<span style={{ color: "#6b7280" }}>Select text → AI suggestion</span>
                  </div>
                  <BlockEditor blocks={blocks} onBlockChange={updateBlock} dirtyIds={dirtyIds}
                    onRequestSuggestion={handleRequestSuggestion}
                    loadingSuggestionBlockId={loadingSuggestionBlock}
                  />
                </>
              ) : (
                <div style={{ color: "#9ca3af", textAlign: "center", padding: "40px" }}>
                  Enter a document path and click Load to begin editing.
                </div>
              )}
            </div>

            {blocks.length > 0 && (
              <div>
                {/* D2: Compact insights summary in sidebar */}
                <CompactSummary documentId={DOCUMENT_ID} sessionId={sessionId} />
                
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>
                  Suggestions {openSuggestions.length > 0 && `(${openSuggestions.length} open)`}
                </div>
                {suggestions.length === 0 ? (
                  <div style={{ color: "#9ca3af", fontSize: "13px", padding: "12px", border: "1px dashed #e5e7eb", borderRadius: "6px" }}>
                    Select text to get AI suggestions.
                  </div>
                ) : (
                  suggestions.map((s) => (
                    <SuggestionThread key={s.id} suggestion={s}
                      onAccept={handleAccept} onReject={handleReject}
                      onEditApply={handleEditApply} onDefer={handleDefer}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Insights tab */}
      {activeTab === "insights" && <InsightsPage />}
    </div>
  );
}
