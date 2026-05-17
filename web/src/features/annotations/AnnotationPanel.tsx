// Annotations sidebar — Plannotator-style right pane listing the active
// document's annotations. Selecting an item lifts state up so the renderer
// can show the matching <mark> as focused. Delete removes the row both
// locally (filtered in the hook) and on the server.
import React from "react";
import type { Annotation } from "../../../../src/domain/annotations/annotation-types";

interface AnnotationPanelProps {
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void | Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

const PANEL_WIDTH = 280;
const EXCERPT_MAX = 60;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AnnotationPanel({
  annotations,
  selectedAnnotationId,
  onSelect,
  onDelete,
  isLoading = false,
  error = null,
}: AnnotationPanelProps) {
  return (
    <aside
      style={{
        width: PANEL_WIDTH,
        minWidth: PANEL_WIDTH,
        maxWidth: PANEL_WIDTH,
        borderLeft: "1px solid #e5e7eb",
        background: "#fafafa",
        padding: "16px 14px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        overflowY: "auto",
        maxHeight: "calc(100vh - 32px)",
      }}
    >
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#374151", letterSpacing: "0.02em", textTransform: "uppercase" }}>
          Annotations ({annotations.length})
        </h2>
        {isLoading && <span style={{ fontSize: "11px", color: "#6b7280" }}>loading…</span>}
      </header>

      {error && (
        <div style={{ fontSize: "12px", color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: "6px 8px", borderRadius: "6px" }}>
          {error}
        </div>
      )}

      {annotations.length === 0 && !isLoading && !error && (
        <p style={{ fontSize: "12px", color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
          Select text in the document and choose <strong>✎ Annotate</strong> to leave a comment.
        </p>
      )}

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
        {annotations.map((a) => {
          const focused = a.id === selectedAnnotationId;
          return (
            <li key={a.id}>
              <article
                onClick={() => onSelect(focused ? null : a.id)}
                style={{
                  background: focused ? "#dbeafe" : "#fff",
                  border: focused ? "1px solid #2563eb" : "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  cursor: "pointer",
                  boxShadow: focused ? "0 0 0 3px rgba(37, 99, 235, 0.15)" : "none",
                  transition: "border-color 120ms ease, box-shadow 120ms ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "#92400e",
                    background: "#fef3c7",
                    padding: "3px 6px",
                    borderRadius: "4px",
                    fontStyle: "italic",
                    wordBreak: "break-word",
                  }}
                  title={a.originalText}
                >
                  &ldquo;{truncate(a.originalText, EXCERPT_MAX)}&rdquo;
                </div>
                <div style={{ fontSize: "13px", color: "#111827", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {a.commentText}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "2px" }}>
                  <time style={{ fontSize: "11px", color: "#6b7280" }} dateTime={a.createdAt}>
                    {formatTimestamp(a.createdAt)}
                  </time>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void onDelete(a.id);
                    }}
                    title="Delete annotation"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#9ca3af",
                      cursor: "pointer",
                      fontSize: "12px",
                      padding: "2px 6px",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
