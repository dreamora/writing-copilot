import React from "react";
import type { HotspotMetric } from "./insights-models";

interface HotspotCardProps {
  hotspots: HotspotMetric[];
  loading?: boolean;
  error?: string | null;
}

const SEVERITY_STYLE: Record<string, { bg: string; color: string }> = {
  high: { bg: "#fee2e2", color: "#991b1b" },
  medium: { bg: "#fef3c7", color: "#92400e" },
  low: { bg: "#f0fdf4", color: "#166534" },
};

export default function HotspotCard({ hotspots, loading, error }: HotspotCardProps) {
  const sorted = [...hotspots].sort((a, b) => b.rewriteCount - a.rewriteCount);

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px", background: "#fff" }}>
      <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px", color: "#111827" }}>
        🔥 Rewrite Hotspots
      </h3>
      {loading && <div style={{ color: "#9ca3af", fontSize: "13px" }}>Loading…</div>}
      {error && <div style={{ color: "#dc2626", fontSize: "13px" }}>{error}</div>}
      {!loading && !error && sorted.length === 0 && (
        <div style={{ color: "#9ca3af", fontSize: "13px" }}>No rewrite hotspots detected.</div>
      )}
      {!loading && !error && sorted.slice(0, 6).map((h) => {
        const style = SEVERITY_STYLE[h.severity] ?? SEVERITY_STYLE.low!;
        return (
          <div key={h.blockId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", padding: "6px 8px", background: "#f9fafb", borderRadius: "4px" }}>
            <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#6b7280" }}>
              {h.blockId.slice(0, 12)}…
            </span>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#6b7280" }}>{h.rewriteCount}× · Δ{(h.avgDeltaMetric * 100).toFixed(0)}%</span>
              <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "10px", fontWeight: 600, background: style.bg, color: style.color }}>
                {h.severity}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
