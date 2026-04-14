/**
 * Tests for auth config layer.
 * Verifies validation, error messages (sanitized), and fallback chain.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  ChatGptAuthSchema,
  validateAuthConfig,
  loadFromEnv,
  bootstrapAuthConfig,
} from "../src/adapters/auth/auth-config";
import type { ChatGptAuth } from "../src/adapters/auth/auth-config";

describe("ChatGptAuthSchema", () => {
  it("accepts valid minimal config", () => {
    const config = { apiKey: "sk-test-123" };
    const result = ChatGptAuthSchema.parse(config);
    expect(result.apiKey).toBe("sk-test-123");
    expect(result.model).toBe("gpt-4o-mini"); // default
    expect(result.timeout).toBe(30000); // default
  });

  it("accepts full config", () => {
    const config: ChatGptAuth = {
      apiKey: "sk-test-123",
      model: "gpt-4o",
      baseUrl: "https://api.custom.com/v1",
      timeout: 60000,
      maxRetries: 3,
    };
    const result = ChatGptAuthSchema.parse(config);
    expect(result.model).toBe("gpt-4o");
    expect(result.timeout).toBe(60000);
  });

  it("rejects missing apiKey", () => {
    expect(() => ChatGptAuthSchema.parse({})).toThrow();
  });

  it("rejects invalid baseUrl", () => {
    expect(() =>
      ChatGptAuthSchema.parse({
        apiKey: "sk-test",
        baseUrl: "not-a-url",
      })
    ).toThrow();
  });

  it("rejects invalid timeout (negative)", () => {
    expect(() =>
      ChatGptAuthSchema.parse({
        apiKey: "sk-test",
        timeout: -1,
      })
    ).toThrow();
  });
});

describe("validateAuthConfig", () => {
  it("validates and returns config", () => {
    const result = validateAuthConfig({ apiKey: "sk-test-123" });
    expect(result.apiKey).toBe("sk-test-123");
  });

  it("throws sanitized error on validation failure", () => {
    try {
      validateAuthConfig({ apiKey: "" });
      expect(true).toBe(false); // should not reach
    } catch (error) {
      const msg = (error as Error).message;
      // Error message should be sanitized, not include raw data
      expect(msg).toContain("Auth config validation failed");
      expect(msg).not.toContain("sk-");
    }
  });
});

describe("loadFromEnv", () => {
  const originalEnv = process.env.OPENAI_AUTH;

  afterEach(() => {
    if (originalEnv) {
      process.env.OPENAI_AUTH = originalEnv;
    } else {
      delete process.env.OPENAI_AUTH;
    }
  });

  it("returns null if env var not set", () => {
    delete process.env.OPENAI_AUTH;
    const result = loadFromEnv();
    expect(result).toBeNull();
  });

  it("parses valid JSON from env var", () => {
    process.env.OPENAI_AUTH = JSON.stringify({ apiKey: "sk-env-test" });
    const result = loadFromEnv();
    expect(result).not.toBeNull();
    expect(result!.apiKey).toBe("sk-env-test");
  });

  it("throws sanitized error on malformed JSON", () => {
    process.env.OPENAI_AUTH = "not-valid-json";
    try {
      loadFromEnv();
      expect(true).toBe(false); // should not reach
    } catch (error) {
      const msg = (error as Error).message;
      expect(msg).toContain("Failed to parse OPENAI_AUTH environment variable");
      expect(msg).not.toContain("not-valid-json");
    }
  });
});

describe("bootstrapAuthConfig", () => {
  const originalAuthPath = process.env.OPENAI_AUTH_PATH;
  const originalAuth = process.env.OPENAI_AUTH;
  const originalKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    // Restore original env
    if (originalAuthPath) process.env.OPENAI_AUTH_PATH = originalAuthPath;
    else delete process.env.OPENAI_AUTH_PATH;
    
    if (originalAuth) process.env.OPENAI_AUTH = originalAuth;
    else delete process.env.OPENAI_AUTH;
    
    if (originalKey) process.env.OPENAI_API_KEY = originalKey;
    else delete process.env.OPENAI_API_KEY;
  });

  it("returns null if all fallbacks missing", async () => {
    // Point to non-existent file
    process.env.OPENAI_AUTH_PATH = "./non-existent-file.json";
    delete process.env.OPENAI_AUTH;
    delete process.env.OPENAI_API_KEY;
    
    const result = await bootstrapAuthConfig();
    expect(result).toBeNull();
  });

  it("uses OPENAI_AUTH env var if file not found", async () => {
    process.env.OPENAI_AUTH_PATH = "./non-existent-file.json";
    process.env.OPENAI_AUTH = JSON.stringify({ apiKey: "sk-from-env" });
    
    const result = await bootstrapAuthConfig();
    expect(result).not.toBeNull();
    expect(result!.apiKey).toBe("sk-from-env");
  });

  it("falls back to OPENAI_API_KEY if neither file nor OPENAI_AUTH", async () => {
    process.env.OPENAI_AUTH_PATH = "./non-existent-file.json";
    delete process.env.OPENAI_AUTH;
    process.env.OPENAI_API_KEY = "sk-legacy-key";
    
    const result = await bootstrapAuthConfig();
    expect(result).not.toBeNull();
    expect(result!.apiKey).toBe("sk-legacy-key");
  });

  it("throws if JSON file exists but is malformed", async () => {
    // Write a malformed file
    const fs = await import("fs/promises");
    const testFile = "./test-malformed-auth.json";
    await fs.writeFile(testFile, "not valid json", "utf-8");
    
    process.env.OPENAI_AUTH_PATH = testFile;
    delete process.env.OPENAI_AUTH;
    delete process.env.OPENAI_API_KEY;
    
    try {
      await bootstrapAuthConfig();
      expect(true).toBe(false); // should not reach
    } catch (error) {
      const msg = (error as Error).message;
      expect(msg).toContain("Invalid JSON");
    } finally {
      // Cleanup
      await fs.unlink(testFile);
    }
  });
});
