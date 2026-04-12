import { describe, it, expect } from "bun:test";
import { computeDeltaMetric } from "../../src/domain/telemetry/rewrite-capture";

describe("Rewrite delta metric", () => {
  it("returns 0 for identical strings", () => {
    expect(computeDeltaMetric("hello world", "hello world")).toBe(0);
  });

  it("returns > 0 for different strings", () => {
    expect(computeDeltaMetric("hello world", "goodbye world")).toBeGreaterThan(0);
  });

  it("returns 1 for empty before", () => {
    expect(computeDeltaMetric("", "some new text")).toBe(1);
  });

  it("returns value in [0, 1] range", () => {
    const delta = computeDeltaMetric("This is a long sentence with many words.", "Completely different.");
    expect(delta).toBeGreaterThanOrEqual(0);
    expect(delta).toBeLessThanOrEqual(1);
  });
});
