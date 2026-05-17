import React, { useMemo, useState } from "react";
import type { Suggestion } from "../../../../src/domain/suggestions/suggestion-types";
import { createLineNumberLookup } from "../editor/documentEditing";
import SuggestionThread from "./SuggestionThread";
import { groupReviewThreads } from "./review-thread-groups";

interface ReviewThreadListProps {
  content: string;
  suggestions: Suggestion[];
  onAccept: (id: string) => void | Promise<void>;
  onReject: (id: string) => void | Promise<void>;
  onEditApply: (id: string, editedText: string) => void | Promise<void>;
  onDefer: (id: string) => void | Promise<void>;
  onReopen: (id: string) => void | Promise<void>;
}

function threadSectionStyle(isPrimary = false): React.CSSProperties {
  return {
    marginBottom: "16px",
    padding: isPrimary ? "12px 12px 2px" : "10px 12px 12px",
    border: isPrimary ? "1px solid #bfdbfe" : "1px solid #e5e7eb",
    borderRadius: "12px",
    background: isPrimary ? "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)" : "#fafafa",
    boxShadow: isPrimary ? "0 1px 0 rgba(37, 99, 235, 0.08)" : "none",
  };
}

function sectionHeadingStyle(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    marginBottom: "8px",
  };
}

function sectionLabelStyle(): React.CSSProperties {
  return {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "#374151",
  };
}

function sectionCountStyle(): React.CSSProperties {
  return {
    fontSize: "11px",
    color: "#6b7280",
  };
}

export default function ReviewThreadList({
  content,
  suggestions,
  onAccept,
  onReject,
  onEditApply,
  onDefer,
  onReopen,
}: ReviewThreadListProps) {
  const grouped = useMemo(() => groupReviewThreads(suggestions), [suggestions]);
  const getLineNumberForOffset = useMemo(() => createLineNumberLookup(content), [content]);
  const [deferredExpanded, setDeferredExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  if (suggestions.length === 0) {
    return (
      <div style={{ color: "#9ca3af", fontSize: "13px", padding: "12px", border: "1px dashed #e5e7eb", borderRadius: "6px" }}>
        Select any span in the full document to create inline-style review feedback.
      </div>
    );
  }

  return (
    <div>
      <section style={threadSectionStyle(true)} aria-label="Actionable now">
        <div style={sectionHeadingStyle()}>
          <div>
            <div style={sectionLabelStyle()}>Actionable now</div>
            <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
              Open threads ready for a decision
            </div>
          </div>
          <div style={sectionCountStyle()}>
            {grouped.actionable.length} active
          </div>
        </div>

        {grouped.actionable.length === 0 ? (
          <div style={{ color: "#64748b", fontSize: "12px", padding: "4px 0 12px" }}>
            No open review threads. Reopen a deferred thread when you want it back in this queue.
          </div>
        ) : (
          grouped.actionable.map((suggestion) => (
            <div key={suggestion.id} style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "4px" }}>
                {suggestion.blockId} · line {getLineNumberForOffset(content, suggestion.charStart)}
              </div>
              <SuggestionThread
                suggestion={suggestion}
                onAccept={onAccept}
                onReject={onReject}
                onEditApply={onEditApply}
                onDefer={onDefer}
                onReopen={onReopen}
              />
            </div>
          ))
        )}
      </section>

      {grouped.deferred.length > 0 && (
        <details
          open={deferredExpanded}
          onToggle={(event) => setDeferredExpanded(event.currentTarget.open)}
          style={threadSectionStyle()}
          aria-label="Deferred for later"
        >
          <summary
            style={{
              listStyle: "none",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <div>
              <div style={sectionLabelStyle()}>Deferred for later</div>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                Parked threads you can reopen when they matter again
              </div>
            </div>
            <div style={sectionCountStyle()}>
              {grouped.deferred.length} {deferredExpanded ? "shown" : "hidden"}
            </div>
          </summary>

          {deferredExpanded && (
            <div style={{ marginTop: "10px" }}>
              {grouped.deferred.map((suggestion) => (
                <div key={suggestion.id} style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "4px" }}>
                    {suggestion.blockId} · line {getLineNumberForOffset(content, suggestion.charStart)}
                  </div>
                  <SuggestionThread
                    suggestion={suggestion}
                    onAccept={onAccept}
                    onReject={onReject}
                    onEditApply={onEditApply}
                    onDefer={onDefer}
                    onReopen={onReopen}
                  />
                </div>
              ))}
            </div>
          )}
        </details>
      )}

      {grouped.history.length > 0 && (
        <details
          open={historyExpanded}
          onToggle={(event) => setHistoryExpanded(event.currentTarget.open)}
          style={threadSectionStyle()}
          aria-label="Past decisions"
        >
          <summary
            style={{
              listStyle: "none",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <div>
              <div style={sectionLabelStyle()}>Past decisions</div>
              <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                Settled threads folded away from the main flow
              </div>
            </div>
            <div style={sectionCountStyle()}>
              {grouped.history.length} {historyExpanded ? "shown" : "hidden"}
            </div>
          </summary>

          {historyExpanded && (
            <div style={{ marginTop: "10px" }}>
              {grouped.history.map((suggestion) => (
                <div key={suggestion.id} style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "4px" }}>
                    {suggestion.blockId} · line {getLineNumberForOffset(content, suggestion.charStart)}
                  </div>
                  <SuggestionThread
                    suggestion={suggestion}
                    onAccept={onAccept}
                    onReject={onReject}
                    onEditApply={onEditApply}
                    onDefer={onDefer}
                    onReopen={onReopen}
                  />
                </div>
              ))}
            </div>
          )}
        </details>
      )}
    </div>
  );
}
