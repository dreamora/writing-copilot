import type { WorkspaceFileEntry } from "./workspaceTypes";

interface WorkspaceFileListProps {
  files: WorkspaceFileEntry[];
  activeDocumentId?: string;
  contextDocumentIds: Set<string>;
  query: string;
  onQueryChange: (next: string) => void;
  onSelectFile: (entry: WorkspaceFileEntry) => void;
  onAddContext: (entry: WorkspaceFileEntry) => void;
}

export default function WorkspaceFileList({
  files,
  activeDocumentId,
  contextDocumentIds,
  query,
  onQueryChange,
  onSelectFile,
  onAddContext,
}: WorkspaceFileListProps) {
  const normalizedQuery = query.trim().toLowerCase();
  const visibleFiles = normalizedQuery
    ? files.filter((file) => file.relativePath.toLowerCase().includes(normalizedQuery))
    : files;

  return (
    <section aria-label="Workspace files">
      <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "#6b7280", marginBottom: "10px" }}>
        Search files
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Filter Markdown files"
          style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "13px" }}
        />
      </label>
      <div style={{ display: "grid", gap: "6px" }}>
        {visibleFiles.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: "13px", padding: "12px 0" }}>No Markdown files match.</div>
        ) : visibleFiles.map((file) => {
          const active = file.id === activeDocumentId;
          const inContext = contextDocumentIds.has(file.id);
          return (
            <div
              key={file.id}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: "8px",
                alignItems: "center",
                padding: "8px",
                border: active ? "1px solid #2563eb" : "1px solid #e5e7eb",
                borderRadius: "4px",
                background: active ? "#eff6ff" : "#fff",
              }}
            >
              <button
                type="button"
                onClick={() => onSelectFile(file)}
                aria-current={active ? "page" : undefined}
                style={{
                  minWidth: 0,
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span style={{ display: "block", fontSize: "13px", fontWeight: active ? 700 : 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {file.name}
                </span>
                <span style={{ display: "block", fontSize: "11px", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {file.relativePath}
                </span>
                {active && <span style={{ fontSize: "11px", color: "#2563eb" }}>Active draft</span>}
              </button>
              <button
                type="button"
                onClick={() => onAddContext(file)}
                disabled={inContext}
                aria-label={inContext ? `${file.name} already in context` : `Add ${file.name} to context`}
                title={inContext ? "Already in context" : "Add to context"}
                style={{
                  width: "30px",
                  height: "30px",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  background: inContext ? "#f3f4f6" : "#fff",
                  color: inContext ? "#9ca3af" : "#374151",
                  cursor: inContext ? "not-allowed" : "pointer",
                }}
              >
                +
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
