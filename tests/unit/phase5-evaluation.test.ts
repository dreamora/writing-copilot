// Phase 5 — Validation of evaluation artifacts
import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const EVAL_DIR = join(import.meta.dir, "../../docs/evaluation");

const REQUIRED_FILES = [
  "baseline-protocol.md",
  "short-form-trial.md",
  "essay-form-trial.md",
  "comparison-scorecard-template.md",
  "decision-memo-template.md",
  "kill-gate-checklist.md",
];

describe("Phase 5 evaluation artifacts", () => {
  it("all required evaluation documents exist", () => {
    for (const f of REQUIRED_FILES) {
      expect(existsSync(join(EVAL_DIR, f))).toBe(true);
    }
  });

  it("baseline protocol is non-empty and frozen", () => {
    const content = readFileSync(join(EVAL_DIR, "baseline-protocol.md"), "utf-8");
    expect(content).toContain("FROZEN");
    expect(content).toContain("Baseline Workflow");
    expect(content.length).toBeGreaterThan(500);
  });

  it("short-form trial has pass threshold defined", () => {
    const content = readFileSync(join(EVAL_DIR, "short-form-trial.md"), "utf-8");
    expect(content).toContain("60 min");
    expect(content).toContain("Pass/Fail");
  });

  it("essay-form trial has pass threshold defined", () => {
    const content = readFileSync(join(EVAL_DIR, "essay-form-trial.md"), "utf-8");
    expect(content).toContain("1.5");
    expect(content).toContain("Pass/Fail");
  });

  it("comparison scorecard has all required dimensions", () => {
    const content = readFileSync(join(EVAL_DIR, "comparison-scorecard-template.md"), "utf-8");
    expect(content).toContain("Speed");
    expect(content).toContain("Quality");
    expect(content).toContain("Continue");
    expect(content).toContain("Pivot");
    expect(content).toContain("Kill");
  });

  it("decision memo has continue/pivot/kill structure", () => {
    const content = readFileSync(join(EVAL_DIR, "decision-memo-template.md"), "utf-8");
    expect(content).toContain("CONTINUE");
    expect(content).toContain("PIVOT");
    expect(content).toContain("KILL");
    expect(content).toContain("Kill-Gate Check");
  });

  it("kill-gate checklist enforces 20h rule explicitly", () => {
    const content = readFileSync(join(EVAL_DIR, "kill-gate-checklist.md"), "utf-8");
    expect(content).toContain("20");
    expect(content).toContain("20-Hour Rule");
    expect(content).toContain("KILL");
  });

  it("action-oriented docs have checklists (contain [ ])", () => {
    // baseline-protocol is a frozen reference doc, not a checklist
    const checklistDocs = REQUIRED_FILES.filter((f) => f !== "baseline-protocol.md");
    for (const f of checklistDocs) {
      const content = readFileSync(join(EVAL_DIR, f), "utf-8");
      expect(content).toContain("[ ]");
    }
  });
});
