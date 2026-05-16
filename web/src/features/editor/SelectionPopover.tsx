// Bead 2.1 — Selection popover action menu
import React, { useState, useRef, useEffect } from "react";
import type { SuggestionActionType } from "../../../../src/domain/suggestions/suggestion-types";
import type { SelectionSpan, PopoverPosition } from "./SelectionState";

interface SelectionPopoverProps {
  selection: SelectionSpan;
  position: PopoverPosition;
  onAction: (actionType: SuggestionActionType, customInstruction?: string) => void;
  onClose: () => void;
  loading?: boolean;
  onAnnotate?: (commentText: string) => void | Promise<void>;
}

const ACTION_BUTTONS: Array<{ type: SuggestionActionType; label: string; title: string }> = [
  { type: "rewrite", label: "↺ Rewrite", title: "Rewrite for clarity and flow" },
  { type: "tighten", label: "✂ Tighten", title: "Remove redundancy and filler" },
  { type: "clarify", label: "💡 Clarify", title: "Make easier to understand" },
  { type: "ask", label: "? Ask", title: "Ask a question about this text" },
  { type: "custom", label: "✎ Custom", title: "Custom instruction" },
];

export default function SelectionPopover({
  selection,
  position,
  onAction,
  onClose,
  loading = false,
  onAnnotate,
}: SelectionPopoverProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");
  const [showAnnotate, setShowAnnotate] = useState(false);
  const [annotationText, setAnnotationText] = useState("");
  const [annotationSubmitting, setAnnotationSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const annotationInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showCustom) inputRef.current?.focus();
  }, [showCustom]);

  useEffect(() => {
    if (showAnnotate) annotationInputRef.current?.focus();
  }, [showAnnotate]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleAction = (type: SuggestionActionType) => {
    if (type === "custom") {
      setShowCustom(true);
    } else {
      onAction(type);
    }
  };

  const handleCustomSubmit = () => {
    if (customInstruction.trim()) {
      onAction("custom", customInstruction.trim());
    }
  };

  const handleAnnotateSubmit = async () => {
    const text = annotationText.trim();
    if (!text || !onAnnotate || annotationSubmitting) return;
    setAnnotationSubmitting(true);
    try {
      await onAnnotate(text);
      setAnnotationText("");
      setShowAnnotate(false);
      onClose();
    } finally {
      setAnnotationSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        zIndex: 1000,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        padding: "10px",
        minWidth: "280px",
        maxWidth: "400px",
      }}
    >
      {/* Selected text preview */}
      <div
        style={{
          fontSize: "11px",
          color: "#9ca3af",
          marginBottom: "8px",
          background: "#f9fafb",
          padding: "4px 8px",
          borderRadius: "4px",
          fontStyle: "italic",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        "{selection.selectedText.slice(0, 60)}{selection.selectedText.length > 60 ? "…" : ""}"
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "12px", color: "#6b7280", fontSize: "13px" }}>
          Getting suggestion…
        </div>
      ) : showCustom ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <input
            ref={inputRef}
            type="text"
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
            placeholder="Enter instruction…"
            style={{
              padding: "6px 8px",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              fontSize: "13px",
              width: "100%",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={handleCustomSubmit}
              disabled={!customInstruction.trim()}
              style={{
                flex: 1,
                padding: "6px",
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Submit
            </button>
            <button
              onClick={() => setShowCustom(false)}
              style={{
                padding: "6px 10px",
                background: "#f3f4f6",
                color: "#374151",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Back
            </button>
          </div>
        </div>
      ) : showAnnotate ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <textarea
            ref={annotationInputRef}
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void handleAnnotateSubmit();
              }
            }}
            placeholder="Add a comment… (Cmd/Ctrl+Enter to save)"
            rows={3}
            style={{
              padding: "6px 8px",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              fontSize: "13px",
              width: "100%",
              boxSizing: "border-box",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => void handleAnnotateSubmit()}
              disabled={!annotationText.trim() || annotationSubmitting}
              style={{
                flex: 1,
                padding: "6px",
                background: "#f59e0b",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: annotationText.trim() && !annotationSubmitting ? "pointer" : "not-allowed",
                fontSize: "12px",
                opacity: annotationText.trim() && !annotationSubmitting ? 1 : 0.6,
              }}
            >
              {annotationSubmitting ? "Saving…" : "Save annotation"}
            </button>
            <button
              onClick={() => {
                setShowAnnotate(false);
                setAnnotationText("");
              }}
              disabled={annotationSubmitting}
              style={{
                padding: "6px 10px",
                background: "#f3f4f6",
                color: "#374151",
                border: "none",
                borderRadius: "4px",
                cursor: annotationSubmitting ? "not-allowed" : "pointer",
                fontSize: "12px",
              }}
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {ACTION_BUTTONS.map((btn) => (
            <button
              key={btn.type}
              onClick={() => handleAction(btn.type)}
              title={btn.title}
              style={{
                padding: "5px 10px",
                background: "#f3f4f6",
                color: "#374151",
                border: "1px solid #e5e7eb",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              {btn.label}
            </button>
          ))}
          {onAnnotate && (
            <button
              onClick={() => setShowAnnotate(true)}
              title="Add a comment annotation on this text"
              style={{
                padding: "5px 10px",
                background: "#fef3c7",
                color: "#92400e",
                border: "1px solid #fde68a",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              ✎ Annotate
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: "5px 8px",
              background: "transparent",
              color: "#9ca3af",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
