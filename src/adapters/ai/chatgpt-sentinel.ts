import { createHash, randomUUID } from "node:crypto";

const POW_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";
const POW_SCRIPT_URL =
  "https://cdn.oaistatic.com/_next/static/cXh69klOLzS0Gy2joLDRS/_ssgManifest.js?dpl=453ebaec0d44c2decab71692e1bfe39be35a24b3";
const POW_DPL = "prod-f501fe933b3edf57aea882da888e1a544df99840";

export interface ProofOfWorkChallenge {
  seed: string;
  difficulty: string;
}

export interface ProofOfWorkResult {
  token: string | null;
  iterations: number;
  solved: boolean;
}

export function createProofOfWorkConfig(userAgent = POW_USER_AGENT): unknown[] {
  return [
    3120,
    "Tue Apr 15 2026 11:11:11 GMT-0500 (Eastern Standard Time)",
    4294705152,
    0,
    userAgent,
    POW_SCRIPT_URL,
    POW_DPL,
    "en-US",
    "en-US,en;q=0.9",
    0,
    "webdriver−false",
    "location",
    "window",
    12345.67,
    randomUUID(),
    "",
    32,
    67890.12,
  ];
}

export function generateProofOfWorkToken(
  challenge: ProofOfWorkChallenge,
  config = createProofOfWorkConfig(),
  maxIterations = 500_000
): ProofOfWorkResult {
  const diffLength = Math.floor(challenge.difficulty.length / 2);
  const target = Buffer.from(challenge.difficulty, "hex");
  const seed = Buffer.from(challenge.seed, "utf8");

  const static1 = Buffer.from(
    `${JSON.stringify(config.slice(0, 3)).slice(0, -1)},`,
    "utf8"
  );
  const static2 = Buffer.from(
    `,${JSON.stringify(config.slice(4, 9)).slice(1, -1)},`,
    "utf8"
  );
  const static3 = Buffer.from(
    `,${JSON.stringify(config.slice(10)).slice(1)}`,
    "utf8"
  );

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const finalBuffer = Buffer.concat([
      static1,
      Buffer.from(String(iteration), "utf8"),
      static2,
      Buffer.from(String(iteration >> 1), "utf8"),
      static3,
    ]);

    const encoded = finalBuffer.toString("base64");
    const digest = createHash("sha3-512")
      .update(seed)
      .update(Buffer.from(encoded, "utf8"))
      .digest();

    if (digest.subarray(0, diffLength).compare(target) <= 0) {
      return {
        token: `gAAAAAC${encoded}`,
        iterations: iteration,
        solved: true,
      };
    }
  }

  return { token: null, iterations: maxIterations, solved: false };
}

export function createSentinelExchangePayload(options: {
  proofToken: string;
  turnstileToken: string;
  requirementsToken: string;
  flow?: string;
}): Record<string, string> {
  return {
    p: options.proofToken,
    t: options.turnstileToken,
    c: options.requirementsToken,
    id: randomUUID(),
    flow: options.flow ?? "chatgpt-paid",
  };
}
