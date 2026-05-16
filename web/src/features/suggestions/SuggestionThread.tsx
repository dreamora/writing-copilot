// Bead 2.6 — Suggestion thread + actions (D3 polish: failure states, loading feedback)
import React, { useState } from "react";
import type { Suggestion } from "../../../../src/domain/suggestions/suggestion-types";
import SuggestionDiff from "./SuggestionDiff";

interface SuggestionThreadProps {
  suggestion: Suggestion;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onEditApply: (id: string, editedText: string) => void;
  onDefer: (id: string) => void;
}

const STATUS_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: "Open", color: "#1d4ed8", bg: "#dbeafe" },
  accepted: { label: "Accepted", color: "#166534", bg: "#dcfce7" },
  rejected: { label: "Rejected", color: "#991b1b", bg: "#fee2e2" },
  edited_applied: { label: "Edited & Applied", color: "#7c2d12", bg: "#ffedd5" },
  deferred: { label: "Deferred", color: "#6b7280", bg: "#f3f4f6" },
};

export default function SuggestionThread({
  suggestion,
  onAccept,
  onReject,
  onEditApply,
  onDefer,
}: SuggestionThreadProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [editText, setEditText] = useState(suggestion.proposedText);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  
  const badge = STATUS_BADGES[suggestion.status] ?? STATUS_BADGES.open!;
  const isDecided = suggestion.status !== "open" && suggestion.status !== "deferred";
  const lenses = suggestion.lenses ?? [];
  const provocations = suggestion.provocations ?? [];

  const handleAcceptClick = async () => {
    setLoadingAction("accept");
    setActionError(null);
    try {
      await onAccept(suggestion.id);
    } catch (e) {
      setActionError(`Failed to accept: ${(e as Error).message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRejectClick = async () => {
    setLoadingAction("reject");
    setActionError(null);
    try {
      await onReject(suggestion.id);
    } catch (e) {
      setActionError(`Failed to reject: ${(e as Error).message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEditApplyClick = async () => {
    if (!editText.trim()) return;
    setLoadingAction("edit_apply");
    setActionError(null);
    try {
      await onEditApply(suggestion.id, editText);
      setShowEdit(false);
    } catch (e) {
      setActionError(`Failed to apply: ${(e as Error).message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeferClick = async () => {
    setLoadingAction("defer");
    setActionError(null);
    try {
      await onDefer(suggestion.id);
    } catch (e) {
      setActionError(`Failed to defer: ${(e as Error).message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "14px",
        marginBottom: "12px",
        background: "#fafafa",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            background: badge.bg,
            color: badge.color,
            padding: "2px 8px",
            borderRadius: "12px",
          }}
        >
          {badge.label}
        </span>
        <span style={{ fontSize: "11px", color: "#9ca3af" }}>
          {suggestion.actionType} · {new Date(suggestion.createdAt).toLocaleTimeString()}
        </span>
      </div>

      {/* Issue summary */}
      <div style={{ fontWeight: 600, fontSize: "13px", marginBottom: "4px", color: "#111827" }}>
        {suggestion.issueSummary}
      </div>

      {/* Rationale */}
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "10px" }}>
        {suggestion.rationale}
        {suggestion.riskNotes && (
          <span style={{ color: "#f59e0b" }}> ⚠ {suggestion.riskNotes}</span>
        )}
      </div>

      {(suggestion.workflowStage || suggestion.activeLens || suggestion.shownEdit) && (
        <div style={{ fontSize: "12px", color: "#374151", marginBottom: "10px" }}>
          <div>
            <strong>Stage:</strong> {suggestion.workflowStage ?? "final-output"}
            {suggestion.activeLens && <> · <strong>Lens:</strong> {suggestion.activeLens}</>}
          </div>
          {suggestion.shownEdit && (
            <div style={{ marginTop: "4px" }}>
              <strong>Shown edit:</strong> {suggestion.shownEdit.editType} — {suggestion.shownEdit.whyThisEdit}
            </div>
          )}
        </div>
      )}

      {lenses.length > 0 && (
        <div style={{ fontSize: "12px", color: "#374151", marginBottom: "10px" }}>
          <strong>Lenses</strong>
          {lenses.slice(0, 3).map((lens, index) => (
            <div key={`${lens.name}-${index}`} style={{ marginTop: "4px" }}>
              {lens.name}: {lens.focus}
              {lens.relevance && <span style={{ color: "#6b7280" }}> ({lens.relevance})</span>}
            </div>
          ))}
        </div>
      )}

      {provocations.length > 0 && (
        <div style={{ fontSize: "12px", color: "#374151", marginBottom: "10px" }}>
          <strong>Provocations</strong>
          {provocations.slice(0, 4).map((provocation, index) => (
            <div key={`${provocation.kind}-${index}`} style={{ marginTop: "4px" }}>
              <span style={{ color: "#6b7280" }}>{provocation.kind} · {provocation.stage}:</span> {provocation.prompt}
            </div>
          ))}
        </div>
      )}

      {/* Diff preview */}
      <SuggestionDiff
        originalText={suggestion.selectedText}
        proposedText={showEdit ? editText : suggestion.proposedText}
      />

      {/* Confidence */}
      {suggestion.confidence !== undefined && (
        <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "6px" }}>
          Confidence: {Math.round(suggestion.confidence * 100)}%
        </div>
      )}

      {/* Error display (D3 polish) */}
      {actionError && (
        <div
          style={{
            marginTop: "10px",
            padding: "8px",
            background: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: "4px",
            fontSize: "12px",
            color: "#991b1b",
          }}
        >
          ⚠ {actionError}
        </div>
      )}

      {/* Edit area */}
      {showEdit && !isDecided && (
        <div style={{ marginTop: "10px" }}>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              padding: "6px 8px",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              fontFamily: "monospace",
              fontSize: "13px",
              boxSizing: "border-box",
            }}
          />
        </div>
      )}

      {/* Action buttons */}
      {suggestion.status === "open" && (
        <div style={{ display: "flex", gap: "6px", marginTop: "12px", flexWrap: "wrap" }}>
          <button
            onClick={handleAcceptClick}
            disabled={loadingAction !== null}
            style={{
              padding: "5px 12px",
              background: loadingAction === "accept" ? "#9ca3af" : "#16a34a",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: loadingAction !== null ? "not-allowed" : "pointer",
              fontSize: "12px",
              fontWeight: 600,
              opacity: loadingAction !== null && loadingAction !== "accept" ? 0.5 : 1,
            }}
            aria-label="Accept suggestion"
          >
            {loadingAction === "accept" ? "Accepting…" : "✓ Accept"}
          </button>
          <button
            onClick={handleRejectClick}
            disabled={loadingAction !== null}
            style={{
              padding: "5px 12px",
              background: loadingAction === "reject" ? "#9ca3af" : "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: loadingAction !== null ? "not-allowed" : "pointer",
              fontSize: "12px",
              opacity: loadingAction !== null && loadingAction !== "reject" ? 0.5 : 1,
            }}
            aria-label="Reject suggestion"
          >
            {loadingAction === "reject" ? "Rejecting…" : "✗ Reject"}
          </button>
          {!showEdit ? (
            <button
              onClick={() => setShowEdit(true)}
              disabled={loadingAction !== null}
              style={{
                padding: "5px 12px",
                background: "#f59e0b",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: loadingAction !== null ? "not-allowed" : "pointer",
                fontSize: "12px",
                opacity: loadingAction !== null ? 0.5 : 1,
              }}
              aria-label="Edit suggestion"
            >
              ✎ Edit & Apply
            </button>
          ) : (
            <button
              onClick={handleEditApplyClick}
              disabled={!editText.trim() || loadingAction !== null}
              style={{
                padding: "5px 12px",
                background: loadingAction === "edit_apply" ? "#9ca3af" : "#f59e0b",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor:
                  !editText.trim() || loadingAction !== null
                    ? "not-allowed"
                    : "pointer",
                fontSize: "12px",
                fontWeight: 600,
                opacity: loadingAction !== null && loadingAction !== "edit_apply" ? 0.5 : 1,
              }}
              aria-label="Apply edited text"
            >
              {loadingAction === "edit_apply" ? "Applying…" : "Apply Edit"}
            </button>
          )}
          <button
            onClick={handleDeferClick}
            disabled={loadingAction !== null}
            style={{
              padding: "5px 12px",
              background: "#f3f4f6",
              color: "#374151",
              border: "1px solid #e5e7eb",
              borderRadius: "4px",
              cursor: loadingAction !== null ? "not-allowed" : "pointer",
              fontSize: "12px",
              opacity: loadingAction !== null && loadingAction !== "defer" ? 0.5 : 1,
            }}
            aria-label="Defer suggestion"
          >
            {loadingAction === "defer" ? "Deferring…" : "↷ Defer"}
          </button>
        </div>
      )}

      {/* Show final state if decided */}
      {isDecided && suggestion.editedText && (
        <div style={{ marginTop: "8px", fontSize: "12px", color: "#374151" }}>
          Applied text: <code style={{ background: "#f3f4f6", padding: "1px 4px" }}>{suggestion.editedText}</code>
        </div>
      )}
    </div>
  );
}
