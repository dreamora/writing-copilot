import React from "react";
import type { InsightsSummary } from "./insights-models";

interface RecentActivityCardProps {
  summary: InsightsSummary | null;
  loading?: boolean;
  error?: string | null;
}

export default function RecentActivityCard({ summary, loading, error }: RecentActivityCardProps) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px", background: "#fff" }}>
      <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px", color: "#111827" }}>
        🕘 Recent Activity
      </h3>
      {loading && <div style={{ color: "#9ca3af", fontSize: "13px" }}>Loading…</div>}
      {error && <div style={{ color: "#dc2626", fontSize: "13px" }}>{error}</div>}
      {!loading && !error && !summary && (
        <div style={{ color: "#9ca3af", fontSize: "13px" }}>Refresh to load recent suggestions and rewrites.</div>
      )}
      {!loading && !error && summary && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>Suggestions</div>
            {summary.recentSuggestions.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: "12px" }}>No recent suggestions.</div>
            ) : summary.recentSuggestions.map((item) => (
              <div key={item.id} style={{ padding: "8px 0", borderTop: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#111827" }}>{item.actionType} · {item.status}</div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>{item.issueSummary}</div>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>Rewrites</div>
            {summary.recentRewrites.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: "12px" }}>No recent rewrites.</div>
            ) : summary.recentRewrites.map((item) => (
              <div key={item.id} style={{ padding: "8px 0", borderTop: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#111827" }}>Block {item.blockId}</div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                  Δ {Math.round(item.deltaMetric * 100)}% · {item.afterText.slice(0, 48)}{item.afterText.length > 48 ? "…" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
