/**
 * Token Lifecycle Management
 *
 * Handles token validation and graceful fallback when OAuth access tokens are invalid/expired.
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

export function isTokenInvalid(error: unknown): boolean {
  const err = error as any;

  if (err?.status !== undefined) {
    return err.status === 401 || err.status === 403;
  }

  const msg = String(err?.message || "").toLowerCase();
  return (
    msg.includes("invalid api key") ||
    msg.includes("api key not found") ||
    msg.includes("invalid token") ||
    msg.includes("expired token") ||
    msg.includes("unauthorized") ||
    msg.includes("invalid authentication") ||
    msg.includes("quota exceeded")
  );
}

export function sanitizeAuthError(error: unknown): string {
  const err = error as any;

  if (err?.status === 401) {
    return "API authentication failed. Check your OAuth auth file or access token.";
  }
  if (err?.status === 403) {
    return "API access denied. Check your OAuth access token permissions or quota.";
  }
  const msg = String(err?.message || "").toLowerCase();
  if (msg.includes("api key") || msg.includes("token")) {
    return "Invalid OAuth access token in auth file.";
  }
  if (msg.includes("quota")) {
    return "API quota exceeded. Check your OpenAI account.";
  }

  return "API authentication error. Falling back to stub mode.";
}
