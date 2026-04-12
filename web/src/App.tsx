// Updated App.tsx — Phase 1: uses BlockEditor + useBlockEditor hook
import { useState, useEffect } from "react";
import BlockEditor from "./features/editor/BlockEditor";
import { useBlockEditor } from "./features/editor/blockState";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";
const DEFAULT_DOC = import.meta.env.VITE_DEFAULT_DOC ?? "sample.md";

export default function App() {
  const [apiStatus, setApiStatus] = useState<"loading" | "ok" | "error">("loading");
  const [docPath, setDocPath] = useState(DEFAULT_DOC);

  const { blocks, loading, saving, error, dirtyIds, updateBlock, saveAll, loadDoc } =
    useBlockEditor();

  // Check API health on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((r) => (r.ok ? setApiStatus("ok") : setApiStatus("error")))
      .catch(() => setApiStatus("error"));
  }, []);

  const handleLoad = () => {
    if (docPath) loadDoc(docPath);
  };

  const handleSave = () => {
    saveAll();
  };

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "24px", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "4px" }}>Writing Copilot</h1>

      {/* API status badge */}
      <div style={{ marginBottom: "16px" }}>
        <span
          style={{
            display: "inline-block",
            padding: "3px 10px",
            borderRadius: "12px",
            fontSize: "12px",
            background:
              apiStatus === "ok" ? "#d1fae5" : apiStatus === "error" ? "#fee2e2" : "#f3f4f6",
            color:
              apiStatus === "ok" ? "#065f46" : apiStatus === "error" ? "#991b1b" : "#6b7280",
          }}
        >
          API: {apiStatus}
        </span>
      </div>

      {/* Doc path input + load */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          type="text"
          value={docPath}
          onChange={(e) => setDocPath(e.target.value)}
          placeholder="Document path (e.g. sample.md)"
          style={{
            flex: 1,
            padding: "8px",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        />
        <button
          onClick={handleLoad}
          disabled={loading}
          style={{
            padding: "8px 16px",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {loading ? "Loading…" : "Load"}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || blocks.length === 0 || dirtyIds.size === 0}
          style={{
            padding: "8px 16px",
            background: dirtyIds.size > 0 ? "#f59e0b" : "#9ca3af",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {saving ? "Saving…" : `Save${dirtyIds.size > 0 ? ` (${dirtyIds.size})` : ""}`}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "12px",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      {/* Block editor */}
      {blocks.length > 0 && (
        <div>
          <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "8px" }}>
            {blocks.length} block{blocks.length !== 1 ? "s" : ""}
            {dirtyIds.size > 0 && ` · ${dirtyIds.size} unsaved`}
          </div>
          <BlockEditor blocks={blocks} onBlockChange={updateBlock} dirtyIds={dirtyIds} />
        </div>
      )}

      {blocks.length === 0 && !loading && (
        <div style={{ color: "#9ca3af", textAlign: "center", padding: "40px" }}>
          Enter a document path and click Load to begin editing.
        </div>
      )}
    </div>
  );
}
