import { useState, useEffect, useCallback } from "react";
import { fetchInsightsSummary } from "./insights-api";
import type { InsightsSummary } from "./insights-models";

interface CompactSummaryProps {
  documentId: string;
  sessionId?: string;
  limit?: number;
}

export default function CompactSummary({ documentId, sessionId, limit = 5 }: CompactSummaryProps) {
  const [data, setData] = useState<InsightsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await fetchInsightsSummary(sessionId, documentId, limit);
      setData(summary);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [documentId, sessionId, limit]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (!data && !error) {
    return (
      <div style={{ fontSize: "12px", color: "#9ca3af", padding: "8px" }}>
        {loading ? "Loading metrics…" : "—"}
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          fontSize: "11px",
          color: "#dc2626",
          padding: "8px",
          background: "#fee2e2",
          borderRadius: "4px",
          marginBottom: "8px",
        }}
      >
        ⚠ {error}
      </div>
    );
  }

  if (!data) return null;

  const { totals } = data;
  const acceptRate =
    totals.suggestions > 0
      ? ((totals.accepted / totals.suggestions) * 100).toFixed(0)
      : "—";

  return (
    <div
      style={{
        fontSize: "12px",
        padding: "12px",
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          marginBottom: "8px",
          color: "#374151",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>📊 Session Summary</span>
        <button
          type="button"
          onClick={fetchSummary}
          disabled={loading}
          style={{
            fontSize: "10px",
            padding: "2px 6px",
            background: "transparent",
            border: "1px solid #d1d5db",
            borderRadius: "3px",
            color: "#6b7280",
            cursor: "pointer",
          }}
        >
          {loading ? "…" : "↻"}
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <MetricBox label="Suggestions" value={totals.suggestions} />
        <MetricBox label="Accepted" value={totals.accepted} />
        <MetricBox label="Accept Rate" value={acceptRate + "%"} />
        <MetricBox label="Rewrites" value={totals.rewrites} />
      </div>

      {totals.suggestions > 0 && (
        <div
          style={{
            fontSize: "11px",
            color: "#6b7280",
            paddingTop: "8px",
            borderTop: "1px solid #d1d5db",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px",
          }}
        >
          <div>Open: {totals.open}</div>
          <div>Deferred: {totals.deferred}</div>
          <div>Rejected: {totals.rejected}</div>
          <div>Edited+Applied: {totals.editedApplied}</div>
        </div>
      )}
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      <div style={{ fontSize: "10px", color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: "16px", fontWeight: 700, color: "#1f2937" }}>
        {value}
      </div>
    </div>
  );
}
