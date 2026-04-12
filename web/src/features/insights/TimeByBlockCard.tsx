import React from "react";
import type { TimeMetric } from "./insights-models";

interface TimeByBlockCardProps {
  metrics: TimeMetric[];
  loading?: boolean;
  error?: string | null;
}

export default function TimeByBlockCard({ metrics, loading, error }: TimeByBlockCardProps) {
  const sorted = [...metrics].sort((a, b) => b.secondsSpent - a.secondsSpent);
  const maxSeconds = sorted[0]?.secondsSpent ?? 1;

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px", background: "#fff" }}>
      <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px", color: "#111827" }}>
        ⏱ Time by Block
      </h3>
      {loading && <div style={{ color: "#9ca3af", fontSize: "13px" }}>Loading…</div>}
      {error && <div style={{ color: "#dc2626", fontSize: "13px" }}>{error}</div>}
      {!loading && !error && sorted.length === 0 && (
        <div style={{ color: "#9ca3af", fontSize: "13px" }}>No time tracking data yet.</div>
      )}
      {!loading && !error && sorted.slice(0, 8).map((m) => {
        const pct = (m.secondsSpent / maxSeconds) * 100;
        const label = m.secondsSpent >= 60
          ? `${(m.secondsSpent / 60).toFixed(1)}m`
          : `${m.secondsSpent.toFixed(0)}s`;
        return (
          <div key={m.blockId} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
              <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#6b7280" }}>
                {m.blockId.slice(0, 12)}…
              </span>
              <span style={{ fontSize: "12px", color: "#374151", fontWeight: 500 }}>{label}</span>
            </div>
            <div style={{ background: "#f3f4f6", borderRadius: "4px", height: "4px" }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: "#06b6d4",
                  borderRadius: "4px",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
