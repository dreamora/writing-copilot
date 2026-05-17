import type { EditorRole } from "./suggestion-types";

export interface FewShotExample {
  title: string;
  appliesTo: EditorRole[] | "all";
  selectedText: string;
  instruction: string;
  badRewrite: string;
  goodRewrite: string;
  whyItMatters: string;
}

const EXAMPLES: FewShotExample[] = [
  {
    title: "Adult joy, not cuteness",
    appliesTo: ["joyful-but-adult", "marc-voice", "sharp-stylist"],
    selectedText: "This is a magic unicorn, isn't it?",
    instruction: "Make it more joyful.",
    badRewrite: "This is a sparkling little unicorn, isn't it?",
    goodRewrite: "This does feel like a unicorn moment, doesn't it?",
    whyItMatters:
      "The bad version adds childish sparkle. The good version lifts the line without infantilizing it.",
  },
  {
    title: "Stronger through verbs, not adjectives",
    appliesTo: "all",
    selectedText: "The idea was really very interesting and quite exciting.",
    instruction: "Make it sharper.",
    badRewrite: "The idea was absolutely fascinating and incredibly exciting.",
    goodRewrite: "The idea immediately pulled me in.",
    whyItMatters:
      "The bad version stacks intensifiers. The good version gets its force from movement and specificity.",
  },
  {
    title: "Minimal edit discipline",
    appliesTo: ["professional-lector", "precise-editor", "marc-voice"],
    selectedText: "The problem is not the fear. The problem is staying passive inside it.",
    instruction: "Tighten it.",
    badRewrite: "The true problem isn't fear itself, but rather the passive emotional state that fear creates inside us.",
    goodRewrite: "The problem is not fear. The problem is staying passive inside it.",
    whyItMatters:
      "The bad version explains what was already working. The good version keeps the force and trims only what helps.",
  },
  {
    title: "Reviewer mode should diagnose, not flatter",
    appliesTo: ["rigorous-reviewer"],
    selectedText: "AI might maybe help here if used correctly.",
    instruction: "Review and improve.",
    badRewrite: "AI can beautifully help here if used in the right way.",
    goodRewrite: "AI can help here, but only if you know what judgment still has to stay yours.",
    whyItMatters:
      "The bad version smooths over the weakness. The good version names the missing condition and strengthens the claim.",
  },
  {
    title: "Marc voice stays grounded",
    appliesTo: ["marc-voice"],
    selectedText: "The more you automate, the less you understand.",
    instruction: "Rewrite in Marc's voice without changing meaning.",
    badRewrite: "Automation can sometimes create a surprising disconnect from our lived human experience.",
    goodRewrite: "The more you automate, the less you actually understand.",
    whyItMatters:
      "The bad version turns a sharp line into abstract sludge. The good version stays grounded, direct, and adult.",
  },
  {
    title: "Marc voice preserves structure without creator sludge",
    appliesTo: ["marc-voice"],
    selectedText:
      "One of the biggest lessons I have learned from working with AI over the past two years is that it does not need to be perfect to be useful.\n\nIt needs to be useful in the right ways:\n\n- challenge my thinking and sharpen my reasoning\n- break down ideas so I understand them more deeply\n- give me a solid starting point so I can try, fail, and learn fast\n\nI do not need AI to outsource my judgment.\n\nI need it to raise the quality of my thinking.\n\nWhat has AI genuinely improved for you, and where does it still fall short?",
    instruction: "Rewrite in Marc's voice with voice fidelity.",
    badRewrite:
      "One of the biggest lessons I have learned from using AI is that it does not need to be perfect to be useful.\n\nIt needs to be useful in the right ways:\n\n- challenge my thinking\n- sharpen my reasoning\n- help me learn faster\n\nI do not need AI to make decisions for me. I need it to raise the quality of my thinking.\n\nWhat has AI actually improved for you, and where does it still fall short?",
    goodRewrite:
      "One of the biggest lessons I have learned from working with AI over the past two years is that it does not need to be perfect to be useful.\n\nIt needs to be useful in the right ways:\n\n- challenge my thinking and sharpen my reasoning\n- break down ideas until I understand them more deeply\n- give me a solid starting point so I can try, fail, and learn faster\n\nI do not need AI to outsource my judgment.\n\nI need it to raise the quality of my thinking.\n\nWhat has AI genuinely improved for you, and where does it still fall short?",
    whyItMatters:
      "The bad version keeps the broad format but sands away specificity, weakens the judgment line, and swaps in generic creator cadence. The good version preserves the list and question because they are in the source, then only sharpens local wording.",
  },
  {
    title: "De-slop removes fake depth",
    appliesTo: ["marc-voice", "professional-lector", "sharp-stylist"],
    selectedText:
      "This is not just about productivity, but about unlocking a deeper way of thinking that empowers us to move forward with clarity.",
    instruction: "De-slop the line without changing the claim.",
    badRewrite:
      "This is not only about productivity; it is about empowering a more meaningful way to move forward with clarity and purpose.",
    goodRewrite:
      "This is not really about productivity. It is about thinking better without pretending the tool can do the judgment for us.",
    whyItMatters:
      "The bad version keeps the fake-profound shape. The good version removes AI residue, keeps the claim local, and lets the cadence feel less manufactured without adding fake errors.",
  },
];

export function getFewShotExamples(role: EditorRole): FewShotExample[] {
  return EXAMPLES.filter((example) => example.appliesTo === "all" || example.appliesTo.includes(role)).slice(0, 6);
}

export function formatFewShotExamples(role: EditorRole): string {
  const examples = getFewShotExamples(role);
  if (examples.length === 0) return "";

  return examples
    .map(
      (example, index) => `Example ${index + 1} — ${example.title}\nInstruction: ${example.instruction}\nSelected text: ${example.selectedText}\nBad rewrite: ${example.badRewrite}\nGood rewrite: ${example.goodRewrite}\nWhy: ${example.whyItMatters}`
    )
    .join("\n\n");
}
