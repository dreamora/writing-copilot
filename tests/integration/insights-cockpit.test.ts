// Bead 4.6 — Insight cockpit model tests
import { describe, it, expect } from "bun:test";
import {
  computeHelpedVsSlowed,
  generateSessionSummaryMarkdown,
  type AcceptanceMetric,
  type HotspotMetric,
  type InsightsData,
} from "../../web/src/features/insights/insights-models";

// Fixture helpers
const makeAcceptance = (
  actionType: string,
  accepted: number,
  rejected: number,
  total: number
): AcceptanceMetric => ({
  actionType,
  accepted,
  rejected,
  editedApplied: 0,
  deferred: total - accepted - rejected,
  total,
  acceptanceRate: total > 0 ? accepted / total : 0,
});

const makeHotspot = (
  blockId: string,
  rewriteCount: number,
  avgDelta: number,
  severity: HotspotMetric["severity"]
): HotspotMetric => ({ blockId, rewriteCount, avgDeltaMetric: avgDelta, severity });

describe("computeHelpedVsSlowed heuristic", () => {
  it("returns neutral with no data", () => {
    const result = computeHelpedVsSlowed([], []);
    expect(result.netSignal).toBe("neutral");
    expect(result.reasoning).toContain("No suggestion data");
  });

  it("returns helped with high acceptance and no high hotspots", () => {
    const acceptance = [makeAcceptance("rewrite", 8, 2, 10)]; // 80% acceptance
    const hotspots: HotspotMetric[] = [];
    const result = computeHelpedVsSlowed(acceptance, hotspots);
    expect(result.netSignal).toBe("helped");
    expect(result.acceptanceRate).toBeCloseTo(0.8);
  });

  it("returns slowed with low acceptance rate", () => {
    const acceptance = [makeAcceptance("rewrite", 2, 8, 10)]; // 20% acceptance
    const result = computeHelpedVsSlowed(acceptance, []);
    expect(result.netSignal).toBe("slowed");
  });

  it("returns slowed with many high-severity hotspots", () => {
    const acceptance = [makeAcceptance("rewrite", 5, 5, 10)]; // 50% — borderline
    const hotspots = [
      makeHotspot("b1", 6, 0.7, "high"),
      makeHotspot("b2", 5, 0.6, "high"),
      makeHotspot("b3", 4, 0.5, "high"),
      makeHotspot("b4", 3, 0.4, "high"),
    ]; // 4 high hotspots → slowed
    const result = computeHelpedVsSlowed(acceptance, hotspots);
    expect(result.netSignal).toBe("slowed");
  });

  it("returns neutral with medium acceptance and some hotspots", () => {
    const acceptance = [makeAcceptance("tighten", 4, 6, 10)]; // 40%
    const hotspots = [makeHotspot("b1", 2, 0.3, "medium")];
    const result = computeHelpedVsSlowed(acceptance, hotspots);
    expect(result.netSignal).toBe("neutral");
  });

  it("exposes acceptanceRate and hotspotCount in result", () => {
    const acceptance = [makeAcceptance("rewrite", 6, 4, 10)];
    const hotspots = [makeHotspot("b1", 3, 0.5, "medium")];
    const result = computeHelpedVsSlowed(acceptance, hotspots);
    expect(result.acceptanceRate).toBeCloseTo(0.6);
    expect(result.hotspotCount).toBe(1);
  });
});

describe("generateSessionSummaryMarkdown", () => {
  const mockData: InsightsData = {
    acceptance: [makeAcceptance("rewrite", 4, 1, 6), makeAcceptance("tighten", 2, 1, 3)],
    time: [
      { blockId: "block-abc123", documentId: "doc-1", secondsSpent: 120, sessionCount: 1 },
      { blockId: "block-def456", documentId: "doc-1", secondsSpent: 60, sessionCount: 1 },
    ],
    hotspots: [makeHotspot("block-abc123", 3, 0.4, "medium")],
    helpedVsSlowed: {
      netSignal: "helped",
      acceptanceRate: 0.67,
      avgTimePerBlock: 90,
      hotspotCount: 1,
      reasoning: "High acceptance rate.",
    },
  };

  it("generates valid markdown with session header", () => {
    const md = generateSessionSummaryMarkdown("session-1", "doc-1", mockData);
    expect(md).toContain("# Writing Session Summary");
    expect(md).toContain("session-1");
    expect(md).toContain("doc-1");
  });

  it("includes net signal", () => {
    const md = generateSessionSummaryMarkdown("s1", "d1", mockData);
    expect(md).toContain("HELPED");
  });

  it("includes acceptance metrics", () => {
    const md = generateSessionSummaryMarkdown("s1", "d1", mockData);
    expect(md).toContain("rewrite");
    expect(md).toContain("tighten");
  });

  it("includes time metrics", () => {
    const md = generateSessionSummaryMarkdown("s1", "d1", mockData);
    expect(md).toContain("block-abc123".slice(0, 8));
  });

  it("includes hotspot data", () => {
    const md = generateSessionSummaryMarkdown("s1", "d1", mockData);
    expect(md).toContain("Hotspots");
    expect(md).toContain("medium");
  });

  it("produces non-empty markdown", () => {
    const md = generateSessionSummaryMarkdown("s1", "d1", mockData);
    expect(md.length).toBeGreaterThan(200);
  });

  it("handles empty data gracefully", () => {
    const emptyData: InsightsData = {
      acceptance: [],
      time: [],
      hotspots: [],
      helpedVsSlowed: {
        netSignal: "neutral",
        acceptanceRate: 0,
        avgTimePerBlock: 0,
        hotspotCount: 0,
        reasoning: "No data.",
      },
    };
    const md = generateSessionSummaryMarkdown("s1", "d1", emptyData);
    expect(md).toContain("No suggestion data");
    expect(md).toContain("No time data");
  });
});
