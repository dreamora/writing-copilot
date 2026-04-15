import { describe, expect, it } from "bun:test";
import {
  createProofOfWorkConfig,
  createSentinelExchangePayload,
  generateProofOfWorkToken,
} from "../../src/adapters/ai/chatgpt-sentinel";

describe("chatgpt-sentinel helpers", () => {
  it("creates a stable-looking proof-of-work config", () => {
    const config = createProofOfWorkConfig();
    expect(Array.isArray(config)).toBe(true);
    expect(config.length).toBeGreaterThan(10);
    expect(String(config[4])).toContain("Mozilla/5.0");
  });

  it("generates a proof-of-work token for an easy challenge", () => {
    const result = generateProofOfWorkToken(
      { seed: "seed", difficulty: "ff" },
      createProofOfWorkConfig("test-agent"),
      1000
    );

    expect(result.solved).toBe(true);
    expect(result.token?.startsWith("gAAAAAC")).toBe(true);
  });

  it("creates the sentinel exchange payload", () => {
    const payload = createSentinelExchangePayload({
      proofToken: "proof-token",
      turnstileToken: "turnstile-token",
      requirementsToken: "requirements-token",
      flow: "chatgpt-paid",
    });

    expect(payload.p).toBe("proof-token");
    expect(payload.t).toBe("turnstile-token");
    expect(payload.c).toBe("requirements-token");
    expect(payload.flow).toBe("chatgpt-paid");
    expect(payload.id.length).toBeGreaterThan(10);
  });
});
