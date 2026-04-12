import React from "react";
import type { InsightsData } from "./insights-models";
import { generateSessionSummaryMarkdown } from "./insights-models";

interface ExportSummaryButtonProps {
  sessionId: string;
  documentId: string;
  data: InsightsData;
  disabled?: boolean;
}

export default function ExportSummaryButton({
  sessionId,
  documentId,
  data,
  disabled,
}: ExportSummaryButtonProps) {
  const handleExport = () => {
    const markdown = generateSessionSummaryMarkdown(sessionId, documentId, data);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-summary-${sessionId || "export"}-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled}
      title="Export session summary as Markdown"
      style={{
        padding: "7px 16px",
        background: disabled ? "#9ca3af" : "#374151",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        cursor: disabled ? "default" : "pointer",
        fontSize: "13px",
        fontWeight: 500,
      }}
    >
      ↓ Export Summary
    </button>
  );
}
