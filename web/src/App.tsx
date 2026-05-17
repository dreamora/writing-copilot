import { useState, useEffect, useCallback, useMemo } from "react";
import ContinuousEditor from "./features/editor/ContinuousEditor";
import { useDocumentEditor } from "./features/editor/documentState";
import InsightsPage from "./features/insights/InsightsPage";
import CompactSummary from "./features/insights/CompactSummary";
import ReviewThreadList from "./features/suggestions/ReviewThreadList";
import {
  createSuggestion,
  fetchSuggestions,
  acceptSuggestion,
  rejectSuggestion,
  editApplySuggestion,
  deferSuggestion,
  reopenSuggestion,
} from "./features/suggestions/SuggestionActions";
import type { Suggestion, EditorRole, SuggestionWorkflowStage } from "../../src/domain/suggestions/suggestion-types";
import {
  getCuratedLenses,
  getProfessionalModeContract,
  normalizeCuratedLensId,
  PROFESSIONAL_MODE_CONTRACTS,
} from "../../src/domain/suggestions/professional-mode-contracts";
import type { SelectionSpan } from "./features/editor/SelectionState";
import { buildSelectionContextEnvelope } from "../../src/domain/suggestions/document-context";
import { applySuggestionToDocument, createInlineAnchorId } from "./features/editor/documentEditing";
import { useAnnotations } from "./features/annotations/annotationState";
import AnnotationPanel from "./features/annotations/AnnotationPanel";
import type { AnnotationHighlight } from "./features/editor/markdownPreview";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const DEFAULT_DOC = import.meta.env.VITE_DEFAULT_DOC ?? "sample.md";
const ROLE_STORAGE_KEY = "writing-copilot.role";
const WORKFLOW_STAGE_STORAGE_KEY = "writing-copilot.workflowStage";
const ACTIVE_LENS_STORAGE_KEY = "writing-copilot.activeLens";
const DEFAULT_EDITOR_ROLE: EditorRole = "professional-lector";
const ROLE_OPTIONS: Array<{ value: EditorRole; label: string }> = Object.values(PROFESSIONAL_MODE_CONTRACTS)
  .map((contract) => ({ value: contract.role, label: contract.label }));
const LENS_OPTIONS = getCuratedLenses();
const MODEL_STORAGE_KEY = "writing-copilot.model";
const DEFAULT_MODEL = "gpt-5.4-mini";
const MODEL_OPTIONS = ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.3-codex-spark"] as const;
const WORKFLOW_STAGE_OPTIONS: Array<{ value: SuggestionWorkflowStage; label: string }> = [
  { value: "source-processing", label: "Source processing" },
  { value: "final-output", label: "Final output" },
];
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

function createDocumentId(docPath: string): string {
  let hash = 2166136261;
  for (let i = 0; i < docPath.length; i += 1) {
    hash ^= docPath.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `doc-${(hash >>> 0).toString(36)}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("editor");
  const [showSidebar, setShowSidebar] = useState(false);
  const [apiStatus, setApiStatus] = useState<"loading" | "ok" | "error">("loading");
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null);
  const [docPath, setDocPath] = useState(DEFAULT_DOC);
  const [loadedDocPath, setLoadedDocPath] = useState(DEFAULT_DOC);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [sessionId] = useState(() => createSessionId());
  const [selectedRole, setSelectedRole] = useState<EditorRole>(() => {
    if (typeof window === "undefined") return DEFAULT_EDITOR_ROLE;
    return (window.localStorage.getItem(ROLE_STORAGE_KEY) as EditorRole | null) || DEFAULT_EDITOR_ROLE;
  });
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_MODEL;
    return window.localStorage.getItem(MODEL_STORAGE_KEY) || DEFAULT_MODEL;
  });
  const [workflowStage, setWorkflowStage] = useState<SuggestionWorkflowStage>(() => {
    if (typeof window === "undefined") return "final-output";
    return (window.localStorage.getItem(WORKFLOW_STAGE_STORAGE_KEY) as SuggestionWorkflowStage | null) || "final-output";
  });
  const [activeLens, setActiveLens] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return normalizeCuratedLensId(window.localStorage.getItem(ACTIVE_LENS_STORAGE_KEY) || "") || "";
  });
  const { content, loading, saving, error, dirty, loadDoc, updateContent, saveDoc } = useDocumentEditor();
  const documentId = useMemo(() => createDocumentId(loadedDocPath), [loadedDocPath]);
  const {
    annotations,
    selectedAnnotationId,
    setSelectedAnnotationId,
    createAnnotation,
    deleteAnnotation,
    isLoading: annotationsLoading,
    error: annotationsError,
  } = useAnnotations(documentId);
  const [showAnnotations, setShowAnnotations] = useState(false);

  const annotationHighlights = useMemo<AnnotationHighlight[]>(
    () => annotations.map((a) => ({
      id: a.id,
      charStart: a.charStart,
      charEnd: a.charEnd,
      focused: a.id === selectedAnnotationId,
    })),
    [annotations, selectedAnnotationId]
  );

  const handleAnnotate = useCallback(
    async (selection: SelectionSpan, commentText: string) => {
      await createAnnotation(selection, commentText);
      setShowAnnotations(true);
    },
    [createAnnotation]
  );

  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then(async (r) => {
        if (!r.ok) return void setApiStatus("error");
        setApiHealth((await r.json()) as ApiHealth);
        setApiStatus("ok");
      })
      .catch(() => setApiStatus("error"));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(ROLE_STORAGE_KEY, selectedRole);
  }, [selectedRole]);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(WORKFLOW_STAGE_STORAGE_KEY, workflowStage);
  }, [workflowStage]);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(ACTIVE_LENS_STORAGE_KEY, activeLens);
  }, [activeLens]);

  const handleLoad = useCallback(async () => {
    if (!docPath) return;
    const nextDocumentId = createDocumentId(docPath);
    setSuggestions([]);
    setSelectedAnnotationId(null);
    await loadDoc(docPath);
    setLoadedDocPath(docPath);
    try { setSuggestions(await fetchSuggestions(nextDocumentId)); } catch {}
  }, [docPath, loadDoc, setSelectedAnnotationId]);

  const handleSave = useCallback(async () => {
    if (!docPath) return;
    await saveDoc(docPath);
  }, [docPath, saveDoc]);

  const handleRequestSuggestion = useCallback(async (
    selection: SelectionSpan,
    actionType: Suggestion["actionType"],
    customInstruction?: string
  ) => {
    setLoadingSuggestion(true);
    setSuggestionError(null);
    try {
      const context = buildSelectionContextEnvelope(content, selection.charStart, selection.charEnd);
      const blockId = createInlineAnchorId(content, selection.charStart);
      const next = await createSuggestion({
        documentId,
        blockId,
        selection,
        actionType,
        customInstruction,
        context,
        sessionId,
        model: selectedModel,
        editorRole: selectedRole,
        workflowStage,
        activeLens: normalizeCuratedLensId(activeLens),
      });
      setSuggestions((prev) => [next, ...prev]);
    } catch (e) {
      setSuggestionError((e as Error).message);
    } finally {
      setLoadingSuggestion(false);
    }
  }, [activeLens, content, documentId, selectedModel, selectedRole, sessionId, workflowStage]);

  const handleAccept = useCallback(async (id: string) => {
    const suggestion = suggestions.find((entry) => entry.id === id);
    if (!suggestion) return;
    const updated = await acceptSuggestion(id, sessionId);
    const applied = applySuggestionToDocument(content, suggestion, updated.proposedText);
    updateContent(applied.content);
    setSuggestions((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));
  }, [content, sessionId, suggestions, updateContent]);

  const handleReject = useCallback(async (id: string) => {
    const updated = await rejectSuggestion(id, sessionId);
    setSuggestions((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));
  }, [sessionId]);

  const handleEditApply = useCallback(async (id: string, editedText: string) => {
    const suggestion = suggestions.find((entry) => entry.id === id);
    if (!suggestion) return;
    const updated = await editApplySuggestion(id, editedText, sessionId);
    const applied = applySuggestionToDocument(content, suggestion, editedText);
    updateContent(applied.content);
    setSuggestions((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));
  }, [content, sessionId, suggestions, updateContent]);

  const handleDefer = useCallback(async (id: string) => {
    const updated = await deferSuggestion(id, sessionId);
    setSuggestions((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));
  }, [sessionId]);

  const handleReopen = useCallback(async (id: string) => {
    const updated = await reopenSuggestion(id, sessionId);
    setSuggestions((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));
  }, [sessionId]);

  const actionableSuggestionsCount = suggestions.filter((s) => s.status === "open").length;
  const suggestionSummaryRefreshKey = suggestions.map((s) => `${s.id}:${s.status}:${s.updatedAt}`).join("|");
  const selectedRoleLabel = getProfessionalModeContract(selectedRole).label;
  const activeLensOption = LENS_OPTIONS.find((lens) => lens.id === activeLens);
  const providerBadgeLabel = apiHealth?.providerMode === "chatgpt" ? "AI live"
    : apiHealth?.providerMode === "browser-session" ? "AI browser"
    : apiHealth?.providerMode === "codex" ? "AI codex"
    : apiHealth?.providerMode === "stub" ? "AI stub"
    : "AI unknown";
  const tabStyle = (active: boolean) => ({
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
    <div style={{ width: "100%", maxWidth: "none", margin: 0, padding: "0 clamp(12px, 2vw, 24px) 24px", boxSizing: "border-box", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "16px", marginBottom: 0 }}>
        <h1 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Writing Copilot</h1>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: apiStatus === "ok" ? "#d1fae5" : apiStatus === "error" ? "#fee2e2" : "#f3f4f6", color: apiStatus === "ok" ? "#065f46" : apiStatus === "error" ? "#991b1b" : "#6b7280" }}>
            API {apiStatus}
          </span>
          {apiStatus === "ok" && (
            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "10px", background: apiHealth?.providerMode === "chatgpt" || apiHealth?.providerMode === "browser-session" || apiHealth?.providerMode === "codex" ? "#dbeafe" : "#fef3c7", color: apiHealth?.providerMode === "chatgpt" || apiHealth?.providerMode === "browser-session" || apiHealth?.providerMode === "codex" ? "#1d4ed8" : "#92400e" }} title={apiHealth?.authError ?? apiHealth?.authPath ?? providerBadgeLabel}>
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

      <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", marginBottom: "20px" }}>
        <button type="button" style={tabStyle(activeTab === "editor")} onClick={() => setActiveTab("editor")}>✏️ Review</button>
        <button type="button" style={tabStyle(activeTab === "insights")} onClick={() => setActiveTab("insights")}>📊 Insights {actionableSuggestionsCount > 0 && `(${actionableSuggestionsCount})`}</button>
        {content && activeTab === "editor" && (
          <>
            <button type="button" style={{ ...tabStyle(showAnnotations), marginLeft: "auto" }} onClick={() => setShowAnnotations((current) => !current)}>
              {showAnnotations ? "Hide annotations" : `Annotations${annotations.length > 0 ? ` (${annotations.length})` : ""}`}
            </button>
            <button type="button" style={tabStyle(showSidebar)} onClick={() => setShowSidebar((current) => !current)}>
              {showSidebar ? "Hide review sidebar" : `Show review sidebar${actionableSuggestionsCount > 0 ? ` (${actionableSuggestionsCount})` : ""}`}
            </button>
          </>
        )}
      </div>

      {activeTab === "editor" && (
        <>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center", flexWrap: "wrap" }}>
            <input type="text" value={docPath} onChange={(e) => setDocPath(e.target.value)} placeholder="Document path" style={{ flex: 1, minWidth: "280px", padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "14px" }} />
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#6b7280" }}>
              Role
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as EditorRole)} style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "13px", background: "#fff", color: "#111827" }}>
                {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#6b7280" }}>
              Model
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "13px", background: "#fff", color: "#111827" }}>
                {MODEL_OPTIONS.map((model) => <option key={model} value={model}>{model}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#6b7280" }}>
              Stage
              <select value={workflowStage} onChange={(e) => setWorkflowStage(e.target.value as SuggestionWorkflowStage)} style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "13px", background: "#fff", color: "#111827" }}>
                {WORKFLOW_STAGE_OPTIONS.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#6b7280", minWidth: "240px", flex: "0 1 320px" }}>
              Lens
              <select
                value={activeLens}
                onChange={(e) => setActiveLens(e.target.value)}
                title={activeLensOption?.purpose ?? "Choose a curated thinking lens"}
                style={{ flex: 1, minWidth: "160px", padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "13px", background: "#fff", color: "#111827" }}
              >
                <option value="">No lens</option>
                {LENS_OPTIONS.map((lens) => <option key={lens.id} value={lens.id}>{lens.label}</option>)}
              </select>
            </label>
            <button type="button" onClick={handleLoad} disabled={loading} style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>{loading ? "Loading…" : "Load"}</button>
            <button type="button" onClick={handleSave} disabled={saving || !content || !dirty} style={{ padding: "8px 16px", background: dirty ? "#f59e0b" : "#9ca3af", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>{saving ? "Saving…" : "Save"}</button>
          </div>

          {(error || suggestionError) && (
            <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px", borderRadius: "4px", marginBottom: "12px", fontSize: "13px" }}>
              {error ?? suggestionError}
            </div>
          )}

          <section className="editor-workspace" aria-label="Writing workspace">
            <main className="editor-main">
              {content ? (
                <>
                  <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "8px" }}>
                    one continuous document field
                    {dirty && " · unsaved"}
                    {" · role: "}<span style={{ color: "#6b7280" }}>{selectedRoleLabel}</span>
                    {" · model: "}<span style={{ color: "#6b7280" }}>{selectedModel}</span>
                    {" · stage: "}<span style={{ color: "#6b7280" }}>{WORKFLOW_STAGE_OPTIONS.find((stage) => stage.value === workflowStage)?.label ?? workflowStage}</span>
                    {activeLensOption && <>{" · lens: "}<span style={{ color: "#6b7280" }}>{activeLensOption.label}</span></>}
                    {" · "}<span style={{ color: "#6b7280" }}>select text to add inline review feedback</span>
                  </div>
                  <ContinuousEditor
                    documentId={documentId}
                    content={content}
                    dirty={dirty}
                    onChange={updateContent}
                    onRequestSuggestion={handleRequestSuggestion}
                    editorRole={selectedRole}
                    loadingSuggestion={loadingSuggestion}
                    annotationHighlights={annotationHighlights}
                    onAnnotate={handleAnnotate}
                    onAnnotationClick={(id) => { setSelectedAnnotationId(id); setShowAnnotations(true); }}
                  />
                </>
              ) : (
                <div style={{ color: "#9ca3af", textAlign: "center", padding: "40px" }}>Enter a document path and click Load to begin reviewing a full document.</div>
              )}
            </main>

            {content && (showSidebar || showAnnotations) && (
              <aside className="editor-secondary-panels" aria-label="Review context">
                {showSidebar && (
                  <div>
                    <CompactSummary documentId={documentId} sessionId={sessionId} refreshKey={suggestionSummaryRefreshKey} />
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>
                      Review threads
                    </div>
                    <ReviewThreadList
                      content={content}
                      suggestions={suggestions}
                      onAccept={handleAccept}
                      onReject={handleReject}
                      onEditApply={handleEditApply}
                      onDefer={handleDefer}
                      onReopen={handleReopen}
                    />
                  </div>
                )}

                {showAnnotations && (
                  <AnnotationPanel
                    annotations={annotations}
                    selectedAnnotationId={selectedAnnotationId}
                    onSelect={setSelectedAnnotationId}
                    onDelete={deleteAnnotation}
                    isLoading={annotationsLoading}
                    error={annotationsError}
                  />
                )}
              </aside>
            )}
          </section>
        </>
      )}

      {activeTab === "insights" && <InsightsPage />}
      <style>{`
        .editor-workspace {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 18px;
          width: 100%;
        }

        .editor-main {
          min-width: 0;
          width: 100%;
        }

        .editor-secondary-panels {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
          gap: 16px;
          align-items: start;
          width: 100%;
        }

        @media (min-width: 1280px) {
          .editor-secondary-panels {
            grid-template-columns: minmax(360px, 1.1fr) minmax(260px, 0.9fr);
          }
        }
      `}</style>
    </div>
  );
}
