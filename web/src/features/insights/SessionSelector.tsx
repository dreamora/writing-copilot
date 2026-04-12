import React from "react";

interface SessionSelectorProps {
  sessionId: string;
  documentId: string;
  onSessionChange: (sessionId: string) => void;
  onDocumentChange: (documentId: string) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export default function SessionSelector({
  sessionId,
  documentId,
  onSessionChange,
  onDocumentChange,
  onRefresh,
  loading,
}: SessionSelectorProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
        alignItems: "center",
        padding: "12px 16px",
        background: "#f9fafb",
        borderRadius: "8px",
        marginBottom: "20px",
        border: "1px solid #e5e7eb",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <label style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Session ID
        </label>
        <input
          type="text"
          value={sessionId}
          onChange={(e) => onSessionChange(e.target.value)}
          placeholder="session-id (optional)"
          style={{
            padding: "5px 8px",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            fontSize: "13px",
            width: "180px",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <label style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Document ID
        </label>
        <input
          type="text"
          value={documentId}
          onChange={(e) => onDocumentChange(e.target.value)}
          placeholder="doc-id (optional)"
          style={{
            padding: "5px 8px",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            fontSize: "13px",
            width: "180px",
          }}
        />
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        style={{
          marginTop: "14px",
          padding: "6px 14px",
          background: "#3b82f6",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "default" : "pointer",
          fontSize: "13px",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Loading…" : "↺ Refresh"}
      </button>
    </div>
  );
}
