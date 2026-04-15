import React from "react";
import type { InsightsSummary } from "./insights-models";

interface SummaryOverviewCardProps {
  summary: InsightsSummary | null;
  loading?: boolean;
  error?: string | null;
}

const TOTAL_LABELS: Array<{ key: keyof InsightsSummary["totals"]; label: string }> = [
  { key: "suggestions", label: "Suggestions" },
  { key: "accepted", label: "Accepted" },
  { key: "editedApplied", label: "Edited" },
  { key: "rejected", label: "Rejected" },
  { key: "deferred", label: "Deferred" },
  { key: "rewrites", label: "Rewrites" },
];

export default function SummaryOverviewCard({ summary, loading, error }: SummaryOverviewCardProps) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px", background: "#fff" }}>
      <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px", color: "#111827" }}>
        🧭 Summary Overview
      </h3>
      {loading && <div style={{ color: "#9ca3af", fontSize: "13px" }}>Loading…</div>}
      {error && <div style={{ color: "#dc2626", fontSize: "13px" }}>{error}</div>}
      {!loading && !error && !summary && (
        <div style={{ color: "#9ca3af", fontSize: "13px" }}>Refresh to load the compact summary.</div>
      )}
      {!loading && !error && summary && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px", marginBottom: "12px" }}>
            {TOTAL_LABELS.map(({ key, label }) => (
              <div key={key} style={{ background: "#f9fafb", borderRadius: "6px", padding: "10px" }}>
                <div style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#111827" }}>{summary.totals[key]}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "12px", color: "#6b7280", flexWrap: "wrap" }}>
            <span>Filter document: {summary.filters.documentId ?? "all"}</span>
            <span>Filter session: {summary.filters.sessionId ?? "all"}</span>
            <span>Window: {summary.filters.limit} items</span>
          </div>
        </>
      )}
    </div>
  );
}
