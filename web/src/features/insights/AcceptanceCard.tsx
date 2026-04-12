import React from "react";
import type { AcceptanceMetric } from "./insights-models";

interface AcceptanceCardProps {
  metrics: AcceptanceMetric[];
  loading?: boolean;
  error?: string | null;
}

const ACTION_COLORS: Record<string, string> = {
  rewrite: "#3b82f6",
  tighten: "#8b5cf6",
  clarify: "#06b6d4",
  ask: "#f59e0b",
  custom: "#6b7280",
};

export default function AcceptanceCard({ metrics, loading, error }: AcceptanceCardProps) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px", background: "#fff" }}>
      <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px", color: "#111827" }}>
        ✓ Acceptance by Type
      </h3>
      {loading && <div style={{ color: "#9ca3af", fontSize: "13px" }}>Loading…</div>}
      {error && <div style={{ color: "#dc2626", fontSize: "13px" }}>{error}</div>}
      {!loading && !error && metrics.length === 0 && (
        <div style={{ color: "#9ca3af", fontSize: "13px" }}>No suggestion data yet.</div>
      )}
      {!loading && !error && metrics.map((m) => (
        <div key={m.actionType} style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}>{m.actionType}</span>
            <span style={{ fontSize: "12px", color: "#6b7280" }}>
              {m.accepted}/{m.total} · {(m.acceptanceRate * 100).toFixed(0)}%
            </span>
          </div>
          <div style={{ background: "#f3f4f6", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
            <div
              style={{
                width: `${m.acceptanceRate * 100}%`,
                height: "100%",
                background: ACTION_COLORS[m.actionType] ?? "#6b7280",
                borderRadius: "4px",
                transition: "width 0.3s",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "2px", fontSize: "11px", color: "#9ca3af" }}>
            <span>{m.accepted} accepted</span>
            <span>{m.rejected} rejected</span>
            {m.editedApplied > 0 && <span>{m.editedApplied} edited</span>}
            {m.deferred > 0 && <span>{m.deferred} deferred</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
