import React, { useState, useCallback } from "react";
import SessionSelector from "./SessionSelector";
import AcceptanceCard from "./AcceptanceCard";
import TimeByBlockCard from "./TimeByBlockCard";
import HotspotCard from "./HotspotCard";
import HelpedVsSlowedCard from "./HelpedVsSlowedCard";
import ExportSummaryButton from "./ExportSummaryButton";
import SummaryOverviewCard from "./SummaryOverviewCard";
import RecentActivityCard from "./RecentActivityCard";
import {
  fetchAcceptanceByType,
  fetchTimeByBlock,
  fetchRewritePatterns,
  fetchInsightsSummary,
} from "./insights-api";
import {
  computeHelpedVsSlowed,
  type InsightsData,
  type AcceptanceMetric,
  type TimeMetric,
  type HotspotMetric,
  type InsightsSummary,
} from "./insights-models";

export default function InsightsPage() {
  const [sessionId, setSessionId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [acceptance, setAcceptance] = useState<AcceptanceMetric[]>([]);
  const [time, setTime] = useState<TimeMetric[]>([]);
  const [hotspots, setHotspots] = useState<HotspotMetric[]>([]);
  const [summary, setSummary] = useState<InsightsSummary | null>(null);

  const helpedVsSlowed = computeHelpedVsSlowed(acceptance, hotspots);
  const insightsData: InsightsData = { acceptance, time, hotspots, helpedVsSlowed };

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const docId = documentId.trim() || undefined;
      const sessId = sessionId.trim() || undefined;

      const [acc, tim, hot, compactSummary] = await Promise.all([
        fetchAcceptanceByType(docId),
        fetchTimeByBlock(sessId, docId),
        fetchRewritePatterns(docId),
        fetchInsightsSummary(sessId, docId),
      ]);
      setAcceptance(acc);
      setTime(tim);
      setHotspots(hot);
      setSummary(compactSummary);
      setHasLoaded(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [sessionId, documentId]);

  const hasData =
    acceptance.length > 0 || time.length > 0 || hotspots.length > 0 || Boolean(summary && summary.totals.suggestions > 0);

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "24px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>📊 Insight Cockpit</h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
            Writing session analytics, AI effectiveness signals, and recent activity.
          </p>
        </div>
        {hasData && (
          <ExportSummaryButton sessionId={sessionId || "default"} documentId={documentId || "all"} data={insightsData} />
        )}
      </div>

      <SessionSelector
        sessionId={sessionId}
        documentId={documentId}
        onSessionChange={setSessionId}
        onDocumentChange={setDocumentId}
        onRefresh={handleRefresh}
        loading={loading}
      />

      {error && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: "10px 14px", borderRadius: "6px", fontSize: "13px", marginBottom: "16px" }}>
          ⚠ Error loading metrics: {error}
        </div>
      )}

      {!loading && !error && hasLoaded && !hasData && (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "#9ca3af", border: "1px dashed #e5e7eb", borderRadius: "8px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📭</div>
          <div style={{ fontSize: "14px" }}>No data for these filters yet.</div>
          <div style={{ fontSize: "12px", marginTop: "4px" }}>Start writing with the editor, then refresh.</div>
        </div>
      )}

      {!loading && !hasLoaded && (
        <div style={{ textAlign: "center", padding: "48px 24px", color: "#9ca3af", border: "1px dashed #e5e7eb", borderRadius: "8px" }}>
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📈</div>
          <div style={{ fontSize: "14px" }}>Click Refresh to load your writing metrics.</div>
        </div>
      )}

      {hasLoaded && hasData && (
        <>
          <div style={{ marginBottom: "16px" }}>
            <HelpedVsSlowedCard result={helpedVsSlowed} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <SummaryOverviewCard summary={summary} loading={loading} error={error} />
            <RecentActivityCard summary={summary} loading={loading} error={error} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <AcceptanceCard metrics={acceptance} loading={loading} error={error} />
            <TimeByBlockCard metrics={time} loading={loading} error={error} />
          </div>

          <HotspotCard hotspots={hotspots} loading={loading} error={error} />
        </>
      )}
    </div>
  );
}
