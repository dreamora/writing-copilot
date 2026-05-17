import { useState } from "react";
import type { ContextPacket } from "./contextPacket";
import ContextSelectionPanel from "./ContextSelectionPanel";
import WorkspaceFileList from "./WorkspaceFileList";
import type { WorkspaceFileEntry, WorkspaceMode } from "./workspaceTypes";

type SidebarTab = "files" | "context";

interface WorkspaceSidebarProps {
  mode: WorkspaceMode;
  supported: boolean;
  directoryName?: string;
  files: WorkspaceFileEntry[];
  activeDocumentId?: string;
  contextEntries: WorkspaceFileEntry[];
  contextPacket?: ContextPacket | null;
  error?: string;
  onOpenWorkspace: () => void;
  onCloseWorkspace: () => void;
  onSelectFile: (entry: WorkspaceFileEntry) => void;
  onAddContext: (entry: WorkspaceFileEntry) => void;
  onRemoveContext: (documentId: string) => void;
}

export default function WorkspaceSidebar({
  mode,
  supported,
  directoryName,
  files,
  activeDocumentId,
  contextEntries,
  contextPacket,
  error,
  onOpenWorkspace,
  onCloseWorkspace,
  onSelectFile,
  onAddContext,
  onRemoveContext,
}: WorkspaceSidebarProps) {
  const [tab, setTab] = useState<SidebarTab>("files");
  const [query, setQuery] = useState("");
  const contextDocumentIds = new Set(contextEntries.map((entry) => entry.id));
  const activeFile = files.find((file) => file.id === activeDocumentId);

  return (
    <aside className="workspace-sidebar" aria-label="Local workspace">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "12px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>Workspace</div>
          <div style={{ fontSize: "11px", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {directoryName ?? (supported ? "No folder open" : "Folder picker unavailable")}
          </div>
        </div>
        {directoryName ? (
          <button type="button" onClick={onCloseWorkspace} style={smallButtonStyle}>Close</button>
        ) : (
          <button type="button" onClick={onOpenWorkspace} disabled={!supported || mode === "opening"} style={smallButtonStyle}>
            {mode === "opening" ? "Opening..." : "Open"}
          </button>
        )}
      </div>

      {!supported && (
        <div role="status" style={noticeStyle}>
          Browser folder access is unavailable. Default document mode remains available.
        </div>
      )}
      {mode === "empty" && <div role="status" style={noticeStyle}>No visible Markdown files found.</div>}
      {mode === "cancelled" && <div role="status" style={noticeStyle}>Workspace opening was cancelled.</div>}
      {mode === "error" && <div role="alert" style={{ ...noticeStyle, color: "#991b1b", background: "#fee2e2" }}>{error ?? "Workspace access failed."}</div>}

      {activeFile && (
        <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: "4px", padding: "8px", marginBottom: "12px" }}>
          <div style={{ fontSize: "11px", color: "#1d4ed8", fontWeight: 700 }}>Active draft</div>
          <div style={{ fontSize: "13px", color: "#111827", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeFile.name}</div>
          <div style={{ fontSize: "11px", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeFile.relativePath}</div>
        </div>
      )}

      <div role="tablist" aria-label="Workspace surfaces" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", marginBottom: "12px" }}>
        <button type="button" role="tab" aria-selected={tab === "files"} onClick={() => setTab("files")} style={tabStyle(tab === "files")}>Files</button>
        <button type="button" role="tab" aria-selected={tab === "context"} onClick={() => setTab("context")} style={tabStyle(tab === "context")}>Context</button>
      </div>

      {tab === "files" ? (
        <WorkspaceFileList
          files={files}
          activeDocumentId={activeDocumentId}
          contextDocumentIds={contextDocumentIds}
          query={query}
          onQueryChange={setQuery}
          onSelectFile={onSelectFile}
          onAddContext={onAddContext}
        />
      ) : (
        <ContextSelectionPanel
          entries={contextEntries}
          packet={contextPacket}
          onRemoveContext={onRemoveContext}
        />
      )}
    </aside>
  );
}

const smallButtonStyle = {
  padding: "6px 10px",
  border: "1px solid #d1d5db",
  borderRadius: "4px",
  background: "#fff",
  color: "#374151",
  fontSize: "12px",
  cursor: "pointer",
};

const noticeStyle = {
  borderRadius: "4px",
  background: "#f9fafb",
  color: "#6b7280",
  padding: "8px",
  fontSize: "12px",
  marginBottom: "10px",
};

function tabStyle(active: boolean) {
  return {
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    background: active ? "#111827" : "#fff",
    color: active ? "#fff" : "#374151",
    padding: "7px 8px",
    fontSize: "12px",
    cursor: "pointer",
  };
}
