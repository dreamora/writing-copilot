// Bead 2.6 — Diff preview component (inline)
import React from "react";

interface SuggestionDiffProps {
  originalText: string;
  proposedText: string;
}

/**
 * Simple word-level diff display.
 * Red = removed from original, green = added in proposed.
 */
export default function SuggestionDiff({ originalText, proposedText }: SuggestionDiffProps) {
  return (
    <div style={{ fontSize: "13px" }}>
      <div style={{ marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Original
        </span>
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "4px",
            padding: "8px",
            marginTop: "4px",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <span style={{ color: "#dc2626", textDecoration: "line-through" }}>
            {originalText}
          </span>
        </div>
      </div>
      <div>
        <span style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Proposed
        </span>
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "4px",
            padding: "8px",
            marginTop: "4px",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          <span style={{ color: "#16a34a" }}>{proposedText}</span>
        </div>
      </div>
    </div>
  );
}
