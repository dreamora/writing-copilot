import { describe, expect, it } from "bun:test";
import {
  CURATED_LENSES,
  getAvailableActionsForRole,
  getCuratedLenses,
  getProfessionalModeContract,
  isActionAvailableForRole,
  normalizeCuratedLensId,
  PROFESSIONAL_MODE_CONTRACTS,
} from "../../src/domain/suggestions/professional-mode-contracts";
import type { EditorRole } from "../../src/domain/suggestions/suggestion-types";

const ROLES: EditorRole[] = [
  "professional-lector",
  "rigorous-reviewer",
  "precise-editor",
  "sharp-stylist",
  "joyful-but-adult",
  "marc-voice",
];

describe("professional mode contracts", () => {
  it("defines a complete hard contract for every current role", () => {
    for (const role of ROLES) {
      const contract = PROFESSIONAL_MODE_CONTRACTS[role];

      expect(contract.role).toBe(role);
      expect(contract.responsibilities.length).toBeGreaterThan(0);
      expect(contract.interventionThreshold.length).toBeGreaterThan(0);
      expect(contract.refusalBoundaries.length).toBeGreaterThan(0);
      expect(contract.preferredMoves.length).toBeGreaterThan(0);
      expect(contract.failureModes.length).toBeGreaterThan(0);
      expect(contract.outputEmphasis.length).toBeGreaterThan(0);
      expect(contract.sharedActionInterpretations.rewrite).toBeTruthy();
      expect(contract.sharedActionInterpretations.tighten).toBeTruthy();
      expect(contract.sharedActionInterpretations.clarify).toBeTruthy();
      expect(contract.sharedActionInterpretations.ask).toBeTruthy();
      expect(contract.sharedActionInterpretations.custom).toBeTruthy();
      expect(contract.sharedActionInterpretations["de-slop"]).toBeTruthy();
      expect(contract.roleSpecificActions.length).toBe(2);
    }
  });

  it("exposes role-specific actions only for their owning role", () => {
    expect(isActionAvailableForRole("rigorous-reviewer", "challenge-claim")).toBe(true);
    expect(isActionAvailableForRole("rigorous-reviewer", "evidence-stress-test")).toBe(true);
    expect(isActionAvailableForRole("precise-editor", "challenge-claim")).toBe(false);
    expect(isActionAvailableForRole("marc-voice", "agency-frame")).toBe(true);
    expect(isActionAvailableForRole("sharp-stylist", "agency-frame")).toBe(false);
  });

  it("keeps shared actions available for every role", () => {
    for (const role of ROLES) {
      const actions = getAvailableActionsForRole(role).map((action) => action.type);
      expect(actions).toContain("rewrite");
      expect(actions).toContain("tighten");
      expect(actions).toContain("clarify");
      expect(actions).toContain("ask");
      expect(actions).toContain("custom");
      expect(actions).toContain("de-slop");
    }
  });

  it("defines de-slop as a shared anti-AI-residue action", () => {
    const action = getAvailableActionsForRole("professional-lector").find((item) => item.type === "de-slop");
    const marc = getProfessionalModeContract("marc-voice");

    expect(action?.label).toBe("De-slop");
    expect(action?.description).toContain("AI");
    expect(marc.sharedActionInterpretations["de-slop"]).toContain("controlled roughness");
    expect(marc.sharedActionInterpretations["de-slop"]).toContain("no random typos");
    expect(getAvailableActionsForRole(undefined).map((item) => item.type)).toContain("de-slop");
  });

  it("exposes only the curated lens set for the core lens selector", () => {
    const lensIds = getCuratedLenses().map((lens) => lens.id);

    expect(lensIds).toEqual([
      "evidence-quality",
      "reader-friction",
      "strategic-risk",
      "voice-fidelity",
      "commercial-implication",
      "source-relevance",
    ]);
    expect(getCuratedLenses().every((lens) => lens.label && lens.purpose && lens.relevance)).toBe(true);
    expect(normalizeCuratedLensId("consumer preference")).toBeUndefined();
    expect(normalizeCuratedLensId("evidence-quality")).toBe("evidence-quality");
  });

  it("gives the same lens role-specific behavioral meaning", () => {
    expect(
      getProfessionalModeContract("rigorous-reviewer").lensInterpretations["evidence-quality"]
    ).toContain("Stress-test");
    expect(
      getProfessionalModeContract("precise-editor").lensInterpretations["evidence-quality"]
    ).toContain("Constrain");
    expect(
      getProfessionalModeContract("sharp-stylist").lensInterpretations["evidence-quality"]
    ).toContain("Avoid vividness");
  });

  it("defaults unknown roles to Professional lector", () => {
    expect(getProfessionalModeContract(undefined).role).toBe("professional-lector");
    expect(getProfessionalModeContract("missing" as EditorRole).role).toBe("professional-lector");
  });

  it("defines all required curated lenses", () => {
    expect(CURATED_LENSES["voice-fidelity"].label).toBe("Voice fidelity");
    expect(CURATED_LENSES["commercial-implication"].purpose).toContain("buyer");
    expect(CURATED_LENSES["source-relevance"].sourceProcessingFocus).toContain("matters");
  });
});
