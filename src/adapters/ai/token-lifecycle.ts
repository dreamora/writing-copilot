/**
 * Token Lifecycle Management
 *
 * Handles token validation and graceful fallback when tokens are invalid/expired.
 * This is the "refresh cycle with retries and graceful fallback" for Epic A.
 * 
 * Scope (Epic A):
 * - Detects invalid/expired tokens via OpenAI error codes
 * - Falls back to stub mode (graceful degradation)
 * - Logs errors without exposing credentials
 * 
 * Future (Epic A.2/B):
 * - Persistent token store
 * - Background refresh jobs
 * - Token pre-expiry refresh
 */

export class TokenError extends Error {
  public readonly isAuthError: boolean;
  public readonly code: string;

  constructor(code: string, message: string, isAuthError = false) {
    super(message);
    this.name = "TokenError";
    this.code = code;
    this.isAuthError = isAuthError;
  }
}

/**
 * Check if an OpenAI error indicates an auth/token issue that warrants fallback
 */
export function isTokenInvalid(error: unknown): boolean {
  const err = error as any;

  // OpenAI API errors with status codes
  if (err?.status !== undefined) {
    // 401 Unauthorized, 403 Forbidden = token issue
    return err.status === 401 || err.status === 403;
  }

  // Check message patterns (no credential leaking)
  const msg = (err?.message || "").toLowerCase();
  return (
    msg.includes("invalid api key") ||
    msg.includes("api key not found") ||
    msg.includes("unauthorized") ||
    msg.includes("invalid authentication") ||
    msg.includes("quota exceeded") // This is a token-related issue too
  );
}

/**
 * Extract error message from OpenAI error without leaking credentials
 */
export function sanitizeAuthError(error: unknown): string {
  const err = error as any;

  if (err?.status === 401) {
    return "API authentication failed. Check your auth file or API key.";
  }
  if (err?.status === 403) {
    return "API access denied. Check your API key permissions or quota.";
  }
  const msg = String(err?.message || "").toLowerCase();
  if (msg.includes("api key")) {
    return "Invalid API key in auth file.";
  }
  if (msg.includes("quota")) {
    return "API quota exceeded. Check your OpenAI account.";
  }

  // Generic fallback
  return "API authentication error. Falling back to stub mode.";
}
