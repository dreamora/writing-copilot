import React from "react";
import type { HelpedVsSlowedResult } from "./insights-models";

interface HelpedVsSlowedCardProps {
  result: HelpedVsSlowedResult;
}

const SIGNAL_STYLE: Record<string, { bg: string; color: string; emoji: string; label: string }> = {
  helped: { bg: "#dcfce7", color: "#166534", emoji: "✅", label: "AI Helped" },
  neutral: { bg: "#f3f4f6", color: "#374151", emoji: "➡️", label: "Neutral" },
  slowed: { bg: "#fee2e2", color: "#991b1b", emoji: "⚠️", label: "AI Slowed" },
};

export default function HelpedVsSlowedCard({ result }: HelpedVsSlowedCardProps) {
  const style = SIGNAL_STYLE[result.netSignal] ?? SIGNAL_STYLE.neutral!;

  return (
    <div
      style={{
        border: `1px solid ${style.color}30`,
        borderRadius: "8px",
        padding: "16px",
        background: style.bg,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "20px" }}>{style.emoji}</span>
        <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: style.color }}>
          {style.label}
        </h3>
      </div>
      <p style={{ fontSize: "13px", color: style.color, margin: "0 0 8px", lineHeight: 1.4 }}>
        {result.reasoning}
      </p>
      <div style={{ display: "flex", gap: "16px", fontSize: "11px", color: style.color + "cc" }}>
        <span>Acceptance: {(result.acceptanceRate * 100).toFixed(0)}%</span>
        <span>Hotspots: {result.hotspotCount}</span>
      </div>
      <div style={{ marginTop: "10px", fontSize: "11px", color: "#6b7280" }}>
        <em>Heuristic: helped ≥ 50% acceptance + no high-friction blocks; slowed &lt; 25% or &gt;3 high-friction blocks.</em>
      </div>
    </div>
  );
}
