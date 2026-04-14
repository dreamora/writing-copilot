/**
 * Tests for token lifecycle and AC2 (Token refresh cycle with fallback)
 * Verifies that invalid/expired tokens gracefully fall back to stub mode
 */

import { describe, it, expect } from "bun:test";
import { isTokenInvalid, sanitizeAuthError } from "../src/adapters/ai/token-lifecycle";

describe("token-lifecycle: AC2 Validation", () => {
  describe("isTokenInvalid", () => {
    it("detects 401 Unauthorized as token error", () => {
      const error = { status: 401, message: "Unauthorized" };
      expect(isTokenInvalid(error)).toBe(true);
    });

    it("detects 403 Forbidden as token error", () => {
      const error = { status: 403, message: "Forbidden" };
      expect(isTokenInvalid(error)).toBe(true);
    });

    it("detects invalid api key message", () => {
      const error = { message: "Invalid API key provided" };
      expect(isTokenInvalid(error)).toBe(true);
    });

    it("detects quota exceeded as token-related", () => {
      const error = { message: "Quota exceeded for model gpt-4o-mini" };
      expect(isTokenInvalid(error)).toBe(true);
    });

    it("returns false for non-auth errors", () => {
      const error = { message: "Connection timeout", status: 504 };
      expect(isTokenInvalid(error)).toBe(false);
    });

    it("handles null/undefined gracefully", () => {
      expect(isTokenInvalid(null)).toBe(false);
      expect(isTokenInvalid(undefined)).toBe(false);
      expect(isTokenInvalid({})).toBe(false);
    });
  });

  describe("sanitizeAuthError", () => {
    it("sanitizes 401 without leaking credentials", () => {
      const error = { status: 401, message: "Unauthorized with key sk-..." };
      const sanitized = sanitizeAuthError(error);
      expect(sanitized).not.toContain("sk-");
      expect(sanitized).toContain("authentication failed");
    });

    it("sanitizes 403 without leaking credentials", () => {
      const error = { status: 403, message: "Forbidden - check your API key sk-..." };
      const sanitized = sanitizeAuthError(error);
      expect(sanitized).not.toContain("sk-");
      expect(sanitized).toContain("access denied");
    });

    it("provides actionable message for invalid API key", () => {
      const error = { message: "Invalid API key provided" };
      const sanitized = sanitizeAuthError(error);
      expect(sanitized).toContain("Invalid API key in auth file");
      expect(sanitized).not.toContain("sk-");
    });

    it("provides actionable message for quota exceeded", () => {
      const error = { message: "Quota exceeded for model gpt-4o-mini" };
      const sanitized = sanitizeAuthError(error);
      expect(sanitized).toContain("quota exceeded");
      expect(sanitized).toContain("OpenAI account");
    });

    it("provides generic fallback for unknown errors", () => {
      const error = { message: "Some random error" };
      const sanitized = sanitizeAuthError(error);
      expect(sanitized).toContain("authentication error");
      expect(sanitized).toContain("stub mode");
    });
  });
});
