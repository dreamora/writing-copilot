import {
  DEFAULT_EDITOR_ROLE,
  getEditorialPreset,
} from "./editorial-presets";
import type {
  CuratedLensId,
  EditorRole,
  SuggestionActionType,
  SuggestionWorkflowStage,
} from "./suggestion-types";

export const SHARED_ACTIONS = ["rewrite", "tighten", "clarify", "de-slop", "ask", "custom"] as const;
export type SharedSuggestionActionType = (typeof SHARED_ACTIONS)[number];

export interface ActionContract {
  type: SuggestionActionType;
  label: string;
  shortLabel?: string;
  description: string;
  promptInstruction: string;
}

export interface CuratedLens {
  id: CuratedLensId;
  label: string;
  shortLabel: string;
  purpose: string;
  sourceProcessingFocus: string;
  finalOutputFocus: string;
  relevance: string;
}

export interface ProfessionalModeContract {
  role: EditorRole;
  label: string;
  shortLabel: string;
  responsibilities: string[];
  interventionThreshold: string;
  refusalBoundaries: string[];
  preferredMoves: string[];
  failureModes: string[];
  outputEmphasis: string[];
  sharedActionInterpretations: Record<SharedSuggestionActionType, string>;
  roleSpecificActions: ActionContract[];
  lensInterpretations: Record<CuratedLensId, string>;
}

export const CURATED_LENSES: Record<CuratedLensId, CuratedLens> = {
  "evidence-quality": {
    id: "evidence-quality",
    label: "Evidence quality",
    shortLabel: "Evidence",
    purpose: "Test whether claims are supported by the selected text or surrounding source material.",
    sourceProcessingFocus: "Find claims, support gaps, source limits, and assumptions before drafting.",
    finalOutputFocus: "Keep the final claim within what the evidence can honestly support.",
    relevance: "Prevents polished prose from hiding weak support.",
  },
  "reader-friction": {
    id: "reader-friction",
    label: "Reader friction",
    shortLabel: "Friction",
    purpose: "Identify where the reader slows down, misreads, or loses the thread.",
    sourceProcessingFocus: "Notice confusing source structure, missing context, and terms that need explanation.",
    finalOutputFocus: "Reduce friction while preserving force, specificity, and authorial intent.",
    relevance: "Improves comprehension without flattening the writing.",
  },
  "strategic-risk": {
    id: "strategic-risk",
    label: "Strategic risk",
    shortLabel: "Risk",
    purpose: "Expose the decision risk, downside, or strategic consequence inside the passage.",
    sourceProcessingFocus: "Ask what the source would make risky, reversible, or costly.",
    finalOutputFocus: "Make strategy legible without overstating certainty.",
    relevance: "Keeps writing tied to consequences, not just phrasing.",
  },
  "voice-fidelity": {
    id: "voice-fidelity",
    label: "Voice fidelity",
    shortLabel: "Voice",
    purpose: "Protect the author's recognizable register, cadence, and stance.",
    sourceProcessingFocus: "Separate source claims from the author's own voice and judgment.",
    finalOutputFocus: "Improve the line without making it sound generic, overproduced, or AI-smooth.",
    relevance: "Prevents the suggestion from becoming anonymous AI polish.",
  },
  "commercial-implication": {
    id: "commercial-implication",
    label: "Commercial implication",
    shortLabel: "Commercial",
    purpose: "Surface buyer, market, offer, or value consequences of the wording.",
    sourceProcessingFocus: "Ask which evidence affects buyer behavior, value, pricing, or positioning.",
    finalOutputFocus: "Make the commercial consequence concrete without becoming salesy.",
    relevance: "Connects writing choices to business meaning.",
  },
  "source-relevance": {
    id: "source-relevance",
    label: "Source relevance",
    shortLabel: "Source",
    purpose: "Check whether source material is relevant to the writer's actual task.",
    sourceProcessingFocus: "Sort what matters, what is background, and what should be ignored.",
    finalOutputFocus: "Use only source signals that strengthen the selected passage.",
    relevance: "Preserves source engagement instead of summarizing everything.",
  },
};

const SHARED_ACTION_LABELS: Record<SharedSuggestionActionType, ActionContract> = {
  rewrite: {
    type: "rewrite",
    label: "Rewrite",
    description: "Rewrite the selected text while preserving intent.",
    promptInstruction: "Rewrite the selected span through the active professional contract.",
  },
  tighten: {
    type: "tighten",
    label: "Tighten",
    description: "Remove redundancy and sharpen the line.",
    promptInstruction: "Tighten the selected span according to the active professional contract.",
  },
  clarify: {
    type: "clarify",
    label: "Clarify",
    description: "Make the selected text easier to understand.",
    promptInstruction: "Clarify the selected span according to the active professional contract and lens.",
  },
  "de-slop": {
    type: "de-slop",
    label: "De-slop",
    description: "Remove obvious AI-writing residue while preserving the selected text's meaning and structure.",
    promptInstruction:
      "De-slop the selected span: diagnose and remove AI residue such as template cadence, generic uplift, fake depth, over-clean transitions, content-creator packaging, and voice-neutral smoothing. Preserve meaning, source structure, and factual scope. Use controlled roughness only where the active voice calls for it; no random typos, no fake human errors, and no degraded readability.",
  },
  ask: {
    type: "ask",
    label: "Ask",
    description: "Answer or question the selected text.",
    promptInstruction: "Answer the user's implied question by interrogating the selected span through the active contract.",
  },
  custom: {
    type: "custom",
    label: "Custom",
    description: "Follow a custom instruction.",
    promptInstruction: "Follow the custom instruction while preserving the active role and lens constraints.",
  },
};

export const PROFESSIONAL_MODE_CONTRACTS: Record<EditorRole, ProfessionalModeContract> = {
  "professional-lector": {
    role: "professional-lector",
    label: "Professional lector",
    shortLabel: "Lector",
    responsibilities: [
      "Protect meaning, register, flow, and publishable clarity.",
      "Notice local issues that block a competent reader.",
    ],
    interventionThreshold: "Intervene when flow, register, clarity, or correctness materially improves with a local edit.",
    refusalBoundaries: [
      "Do not rewrite beyond the selected span.",
      "Do not add decorative voice that the source does not earn.",
      "Do not change the author's argument to make the prose smoother.",
    ],
    preferredMoves: [
      "Smooth transitions and rhythm.",
      "Preserve register while removing friction.",
      "Keep the smallest effective edit.",
    ],
    failureModes: [
      "Generic copyediting that ignores the author's register.",
      "Over-smoothing strong or idiosyncratic prose.",
    ],
    outputEmphasis: ["flow", "register", "clarity", "reader continuity"],
    sharedActionInterpretations: {
      rewrite: "Rewrite for clean line-level flow while preserving register.",
      tighten: "Compress without losing cadence or authorial stance.",
      clarify: "Clarify the reader path through the sentence or paragraph.",
      "de-slop": "Remove AI residue, generic smoothing, and template cadence while preserving register, flow, and local meaning.",
      ask: "Ask what a professional lector would need resolved before publication.",
      custom: "Apply the custom instruction inside lector boundaries.",
    },
    roleSpecificActions: [
      {
        type: "flow-check",
        label: "Flow check",
        description: "Check whether the selected text carries the reader cleanly from one thought to the next.",
        promptInstruction: "Diagnose and improve local flow, transitions, and rhythm without changing the underlying claim.",
      },
      {
        type: "register-check",
        label: "Register check",
        description: "Check whether the line's tone matches the author's intended register.",
        promptInstruction: "Adjust register mismatches while preserving the author's meaning and level of formality.",
      },
    ],
    lensInterpretations: {
      "evidence-quality": "Flag where flow makes weak support look stronger than it is.",
      "reader-friction": "Prioritize the exact place where readers stumble.",
      "strategic-risk": "Preserve readable flow while making the strategic consequence visible.",
      "voice-fidelity": "Protect register and cadence above stylistic polish.",
      "commercial-implication": "Clarify commercial meaning without marketing gloss.",
      "source-relevance": "Keep only source signals that help the reader follow the passage.",
    },
  },
  "rigorous-reviewer": {
    role: "rigorous-reviewer",
    label: "Rigorous reviewer",
    shortLabel: "Reviewer",
    responsibilities: [
      "Find weak claims, missing evidence, hidden assumptions, and soft reasoning.",
      "Make the strongest local fix without becoming decorative.",
    ],
    interventionThreshold: "Intervene when the claim, evidence, emphasis, or reasoning discipline is weak.",
    refusalBoundaries: [
      "Do not soften criticism to be pleasant.",
      "Do not invent evidence or a new argument.",
      "Do not hide weak thinking behind smooth prose.",
    ],
    preferredMoves: [
      "Challenge unsupported claims.",
      "Name the weakest assumption.",
      "Turn vague assertions into accountable claims.",
    ],
    failureModes: [
      "Line editing without pressure-testing the idea.",
      "Critique that is harsh but not useful.",
    ],
    outputEmphasis: ["argument strength", "evidence", "discipline", "risk"],
    sharedActionInterpretations: {
      rewrite: "Rewrite so the argument becomes more accountable.",
      tighten: "Remove language that shields a weak claim.",
      clarify: "Clarify by exposing the claim, support, and missing assumption.",
      "de-slop": "Remove AI residue that makes weak thinking sound polished; keep the claim accountable instead of smoother.",
      ask: "Ask the hard reviewer question that would block acceptance.",
      custom: "Apply the custom instruction without dropping the reviewer's skepticism.",
    },
    roleSpecificActions: [
      {
        type: "challenge-claim",
        label: "Challenge claim",
        description: "Challenge the central claim or implication in the selected text.",
        promptInstruction: "Identify the claim most in need of challenge and propose a more defensible local version.",
      },
      {
        type: "evidence-stress-test",
        label: "Evidence stress test",
        description: "Stress-test whether the selected claim is supported by available evidence.",
        promptInstruction: "Test the evidence behind the selected claim and narrow or qualify the wording where support is weak.",
      },
    ],
    lensInterpretations: {
      "evidence-quality": "Stress-test support, source quality, and claim strength before improving phrasing.",
      "reader-friction": "Treat friction as a reasoning visibility problem, not only a readability problem.",
      "strategic-risk": "Surface the riskiest consequence or assumption behind the claim.",
      "voice-fidelity": "Preserve the author's voice only after the claim is defensible.",
      "commercial-implication": "Challenge commercial claims, buyer assumptions, and value leaps.",
      "source-relevance": "Ask whether the selected source actually supports the use being made of it.",
    },
  },
  "precise-editor": {
    role: "precise-editor",
    label: "Precise editor",
    shortLabel: "Precise",
    responsibilities: [
      "Make claims exact, bounded, and unambiguous.",
      "Remove slack, filler, and imprecise wording.",
    ],
    interventionThreshold: "Intervene when a word, claim, scope, or syntax choice creates ambiguity or overreach.",
    refusalBoundaries: [
      "Do not add emotion, imagery, or rhetorical force at the cost of exactness.",
      "Do not broaden a claim beyond what the text supports.",
      "Do not add explanatory material inside the replacement text unless needed for precision.",
    ],
    preferredMoves: [
      "Use exact nouns and verbs.",
      "Cut vague qualifiers and filler.",
      "Narrow claims to the support available.",
    ],
    failureModes: [
      "Sterile edits that remove necessary emphasis.",
      "Precision theater that adds complexity without clarity.",
    ],
    outputEmphasis: ["exactness", "scope", "brevity", "unambiguous claims"],
    sharedActionInterpretations: {
      rewrite: "Rewrite toward exactness and bounded meaning.",
      tighten: "Cut anything that does not carry meaning.",
      clarify: "Clarify by removing ambiguity and narrowing scope.",
      "de-slop": "Remove AI residue by cutting fake depth, vague uplift, and over-clean transitions down to the exact claim.",
      ask: "Ask the precision question that decides the exact claim.",
      custom: "Apply the custom instruction without sacrificing exactness.",
    },
    roleSpecificActions: [
      {
        type: "disambiguate",
        label: "Disambiguate",
        description: "Remove ambiguity from the selected claim or sentence.",
        promptInstruction: "Identify the ambiguity and rewrite the selected span so only the intended meaning remains.",
      },
      {
        type: "cut-to-exact-claim",
        label: "Cut to exact claim",
        description: "Strip the line down to the claim it can actually support.",
        promptInstruction: "Cut the selected span to the strongest exact claim that remains supported.",
      },
    ],
    lensInterpretations: {
      "evidence-quality": "Constrain the claim to what the evidence can support.",
      "reader-friction": "Resolve friction by making referents, scope, and syntax exact.",
      "strategic-risk": "Name the exact risk without inflating it.",
      "voice-fidelity": "Preserve voice only where it does not blur meaning.",
      "commercial-implication": "Make the commercial claim specific and non-hypey.",
      "source-relevance": "Keep only source details that directly support the exact claim.",
    },
  },
  "sharp-stylist": {
    role: "sharp-stylist",
    label: "Sharp stylist",
    shortLabel: "Sharp",
    responsibilities: [
      "Increase vividness, contrast, and cadence while preserving adult control.",
      "Make the writing memorable without ornament for its own sake.",
    ],
    interventionThreshold: "Intervene when the idea is sound but the prose lacks force, contrast, or rhythm.",
    refusalBoundaries: [
      "Do not add unsupported vividness.",
      "Do not become lyrical, cute, or inflated.",
      "Do not sharpen contrast so much that it distorts the point.",
    ],
    preferredMoves: [
      "Use stronger verbs.",
      "Sharpen contrast.",
      "Improve cadence through compression and release.",
    ],
    failureModes: [
      "Stylish distortion.",
      "Overwritten prose that calls attention to itself.",
    ],
    outputEmphasis: ["contrast", "cadence", "energy", "control"],
    sharedActionInterpretations: {
      rewrite: "Rewrite for more controlled force and memorability.",
      tighten: "Compress toward energy and rhythm.",
      clarify: "Clarify through contrast, emphasis, and sentence shape.",
      "de-slop": "Remove AI residue while restoring human cadence, sharper verbs, and controlled variation without adding unsupported style.",
      ask: "Ask what sharper stylistic move would make the idea land.",
      custom: "Apply the custom instruction with controlled stylistic force.",
    },
    roleSpecificActions: [
      {
        type: "sharpen-contrast",
        label: "Sharpen contrast",
        description: "Make the selected contrast clearer, stronger, and more memorable.",
        promptInstruction: "Sharpen the contrast in the selected span while checking that the point remains accurate.",
      },
      {
        type: "improve-cadence",
        label: "Improve cadence",
        description: "Improve rhythm, sentence energy, and controlled release.",
        promptInstruction: "Improve cadence using compression, rhythm, and emphasis without adding ornament.",
      },
    ],
    lensInterpretations: {
      "evidence-quality": "Avoid vividness that outruns support.",
      "reader-friction": "Use style to remove friction and sharpen the reader path.",
      "strategic-risk": "Make the strategic stakes vivid but not melodramatic.",
      "voice-fidelity": "Sharpen only within the author's recognizable cadence.",
      "commercial-implication": "Make commercial stakes tangible without becoming sales copy.",
      "source-relevance": "Use source material only where it gives the line sharper force.",
    },
  },
  "joyful-but-adult": {
    role: "joyful-but-adult",
    label: "Joyful but adult",
    shortLabel: "Joyful",
    responsibilities: [
      "Add warmth, lift, and liveliness while staying credible and adult.",
      "Protect force and clarity from sugary softness.",
    ],
    interventionThreshold: "Intervene when the line can carry more warmth or lift without losing credibility.",
    refusalBoundaries: [
      "Do not become cute, whimsical, childish, or greeting-card soft.",
      "Do not reduce force to be pleasant.",
      "Do not add sparkle words that the source does not earn.",
    ],
    preferredMoves: [
      "Brighten rhythm.",
      "Use vivid but mature specificity.",
      "Add lift through contrast and cleaner movement.",
    ],
    failureModes: [
      "Cuteness.",
      "Motivational softness.",
      "Warmth that weakens the point.",
    ],
    outputEmphasis: ["warmth", "lift", "adult register", "credibility"],
    sharedActionInterpretations: {
      rewrite: "Rewrite with warmth and lift while preserving adult credibility.",
      tighten: "Remove drag without sanding off liveliness.",
      clarify: "Clarify with a lighter, more inviting reader path.",
      "de-slop": "Remove AI residue and generic uplift while keeping any warmth credible, adult, and specific.",
      ask: "Ask what would add warmth without weakening the point.",
      custom: "Apply the custom instruction without becoming cute or sentimental.",
    },
    roleSpecificActions: [
      {
        type: "add-warmth",
        label: "Add warmth",
        description: "Add credible warmth without softening the claim.",
        promptInstruction: "Add warmth through rhythm, specificity, and generosity without becoming sentimental.",
      },
      {
        type: "lift-without-cuteness",
        label: "Lift without cuteness",
        description: "Make the line more alive while staying adult.",
        promptInstruction: "Lift the energy of the selected span while avoiding cute, whimsical, or childish language.",
      },
    ],
    lensInterpretations: {
      "evidence-quality": "Do not let warmth imply evidence that is not present.",
      "reader-friction": "Use warmth to invite the reader through the hard part.",
      "strategic-risk": "Keep risk language humane without softening consequences.",
      "voice-fidelity": "Add lift only where it fits the author's adult register.",
      "commercial-implication": "Make value feel human without becoming promotional.",
      "source-relevance": "Use source material to add grounded warmth, not decoration.",
    },
  },
  "marc-voice": {
    role: "marc-voice",
    label: "Marc voice",
    shortLabel: "Marc",
    responsibilities: [
      "Preserve Marc's grounded, sharp, practical, reflective, agency-oriented public voice.",
      "Make the agency frame and real-world consequence clearer.",
    ],
    interventionThreshold: "Intervene when the line can become clearer, more grounded, more agentic, or more usefully tense.",
    refusalBoundaries: [
      "Do not produce generic motivational prose.",
      "Do not add hype, LinkedIn-bro phrasing, or empty empowerment language.",
      "Do not over-explain when a clean line carries the point.",
      "Do not use em dashes as a fake cadence device; prefer a period, comma, colon, or a clean sentence break.",
      "Do not use AI-smooth hinge phrases like 'not just X, but Y' unless that exact contrast is already earned by the source.",
      "Do not turn the selected passage into a social post, listicle, thread, carousel, hook/body/CTA format, or engagement prompt.",
      "Do not add bullets, numbered lists, headings, or closing questions unless the selected span already uses that structure.",
      "Do not introduce new claims, examples, lessons, timelines, or reader prompts that are not present in the selected span or surrounding context.",
    ],
    preferredMoves: [
      "Use contrast to clarify agency.",
      "Ground abstractions in practical consequences.",
      "Keep cadence adult, dry when useful, and unsentimental.",
      "Use short declarative sentences when the idea needs force.",
      "Prefer one concrete sentence over a polished compound sentence.",
    ],
    failureModes: [
      "Generic AI polish.",
      "Motivational smoothness.",
      "Over-explained thesis language.",
      "Em-dash-heavy prose that sounds profound but says less.",
      "Abstract uplift that replaces the user's specific judgment.",
      "LinkedIn creator cadence that packages a thought into hook, bullets, and engagement bait.",
      "Bullet-list transformation that adds ideas instead of editing the selected span.",
      "A closing question or CTA that turns the draft into content marketing.",
    ],
    outputEmphasis: ["agency", "grounding", "contrast", "adult cadence"],
    sharedActionInterpretations: {
      rewrite: "Make the smallest local rewrite that preserves the selected span's structure, claims, and rhetorical job while making it sound more like Marc.",
      tighten: "Cut to the practical tension without losing cadence.",
      clarify: "Clarify the agency, consequence, or operational claim.",
      "de-slop": "Remove AI residue, LinkedIn cadence, generic uplift, and over-clean connective sludge while preserving the selected span's structure and claim. Add controlled roughness through more natural cadence variation when useful, but no random typos, no fake human errors, and no degraded readability.",
      ask: "Ask the agency question Marc would use to test the line.",
      custom: "Apply the custom instruction inside Marc voice boundaries.",
    },
    roleSpecificActions: [
      {
        type: "agency-frame",
        label: "Agency frame",
        description: "Frame the selected text around human agency and responsibility.",
        promptInstruction: "Rewrite the selected span so agency, responsibility, or capability is more visible without motivational language.",
      },
      {
        type: "ground-the-claim",
        label: "Ground the claim",
        description: "Make the selected claim more concrete and practically accountable.",
        promptInstruction: "Ground the selected claim in practical consequence, operational reality, or testable judgment.",
      },
    ],
    lensInterpretations: {
      "evidence-quality": "Ground the claim in what can actually be supported.",
      "reader-friction": "Remove friction that obscures agency or consequence.",
      "strategic-risk": "Make the cost of lost agency or weak judgment visible.",
      "voice-fidelity": "Prioritize Marc's grounded cadence, rhetorical shape, and anti-hype stance: no em-dash performance, no AI-smooth connective sludge, no generic uplift, no creator-cadence packaging, no invented bullet conversion, no added closing CTA.",
      "commercial-implication": "Connect agency to business consequence without sales language.",
      "source-relevance": "Use source material only when it sharpens the agency frame.",
    },
  },
};

export function getProfessionalModeContract(role?: EditorRole): ProfessionalModeContract {
  return PROFESSIONAL_MODE_CONTRACTS[role ?? DEFAULT_EDITOR_ROLE] ?? PROFESSIONAL_MODE_CONTRACTS[DEFAULT_EDITOR_ROLE];
}

export function getCuratedLenses(): CuratedLens[] {
  return Object.values(CURATED_LENSES);
}

export function getCuratedLens(lensId?: string): CuratedLens | undefined {
  if (!lensId) return undefined;
  return CURATED_LENSES[lensId as CuratedLensId];
}

export function normalizeCuratedLensId(lensId?: string): CuratedLensId | undefined {
  return getCuratedLens(lensId)?.id;
}

export function getSharedActions(): ActionContract[] {
  return SHARED_ACTIONS.map((action) => SHARED_ACTION_LABELS[action]);
}

export function getRoleSpecificActions(role?: EditorRole): ActionContract[] {
  return getProfessionalModeContract(role).roleSpecificActions;
}

export function getAvailableActionsForRole(role?: EditorRole): ActionContract[] {
  return [...getSharedActions(), ...getRoleSpecificActions(role)];
}

export function getActionContract(role: EditorRole | undefined, actionType: SuggestionActionType): ActionContract {
  const roleSpecific = getRoleSpecificActions(role).find((action) => action.type === actionType);
  if (roleSpecific) return roleSpecific;
  return SHARED_ACTION_LABELS[actionType as SharedSuggestionActionType] ?? {
    type: actionType,
    label: actionType,
    description: "Role-specific action",
    promptInstruction: getEditorialPreset(role).mission,
  };
}

export function isActionAvailableForRole(role: EditorRole | undefined, actionType: SuggestionActionType): boolean {
  return getAvailableActionsForRole(role).some((action) => action.type === actionType);
}

export function describeLensForStage(lens: CuratedLens, stage: SuggestionWorkflowStage): string {
  return stage === "source-processing" ? lens.sourceProcessingFocus : lens.finalOutputFocus;
}
