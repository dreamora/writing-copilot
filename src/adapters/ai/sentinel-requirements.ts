/**
 * Sentinel Requirements — ChatGPT's challenge requirements response shape
 * 
 * This is parsed from POST /backend-api/sentinel/chat-requirements
 * and contains information about what proof tokens we need to provide.
 */

export interface SentinelRequirementsResponse {
  token: string; // The sentinel token to use in conversation requests
  proofofwork?: {
    required: boolean;
    difficulty: string;
    seed: string;
  };
  turnstile?: {
    required: boolean;
    key?: string;
  };
}

export interface SentinelChallengePayload {
  proofOfWorkToken?: string;
  turnstileToken?: string;
  sentinelToken: string;
  requirementsToken?: string;
}

export function parseSentinelResponse(
  raw: unknown
): SentinelRequirementsResponse | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const obj = raw as Record<string, unknown>;
  const token = obj.token;

  if (typeof token !== "string") {
    return null;
  }

  return {
    token,
    proofofwork: parseProofOfWork(obj.proofofwork),
    turnstile: parseTurnstile(obj.turnstile),
  };
}

function parseProofOfWork(
  raw: unknown
): SentinelRequirementsResponse["proofofwork"] | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const obj = raw as Record<string, unknown>;
  const difficulty = obj.difficulty as string | undefined;
  const seed = obj.seed as string | undefined;
  const required = obj.required === true;

  if (!required || !difficulty || !seed) {
    return undefined;
  }

  return { required, difficulty, seed };
}

function parseTurnstile(
  raw: unknown
): SentinelRequirementsResponse["turnstile"] | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const obj = raw as Record<string, unknown>;
  const required = obj.required === true;
  const key = obj.key as string | undefined;

  if (!required) {
    return undefined;
  }

  return { required, key };
}
