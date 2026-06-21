import { describe, expect, it } from "bun:test";
import { detectSecretWarnings } from "../../web/src/features/workspace/secretWarnings";

describe("secret warnings", () => {
  it("detects obvious API keys, private keys, and token assignments", () => {
    const warnings = detectSecretWarnings(`
      api_key = "abcdef1234567890"
      -----BEGIN PRIVATE KEY-----
      sk-abcdefghijklmnopqrstuvwxyz123456
    `);

    expect(warnings.map((warning) => warning.kind)).toContain("api-key");
    expect(warnings.map((warning) => warning.kind)).toContain("private-key");
    expect(warnings.map((warning) => warning.kind)).toContain("token");
  });

  it("does not flag ordinary prose", () => {
    expect(detectSecretWarnings("This draft mentions a secret but has no credential.")).toEqual([]);
  });
});
