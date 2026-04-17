import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

export const DEFAULT_CHATGPT_AUTH_PATH = ".secrets/chatgpt-auth.json";
export const CHATGPT_AUTH_ENV_VAR = "CHATGPT_AUTH_PATH";

const OAUTH_EXPIRES_MS_THRESHOLD = 1_000_000_000_000;

const OpenAiOauthSchema = z.object({
  type: z.literal("oauth"),
  refresh: z.string().min(1, "openai.refresh is required"),
  access: z.string().min(1, "openai.access is required"),
  expires: z.number().positive("openai.expires must be a unix timestamp"),
  accountId: z.string().min(1, "openai.accountId is required"),
});

const OpenAiApiKeySchema = z.object({
  type: z.literal("api-key"),
  apiKey: z.string().min(1, "openai.apiKey is required"),
});

const ChatGptAuthSchema = z.object({
  openai: z.union([
    OpenAiOauthSchema.transform((auth) => ({
      ...auth,
      expires: auth.expires < OAUTH_EXPIRES_MS_THRESHOLD ? auth.expires * 1000 : auth.expires,
    })),
    OpenAiApiKeySchema,
  ]),
  model: z.string().min(1).optional(),
  baseURL: z.string().url().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type OpenAiOauthAuth = z.infer<typeof OpenAiOauthSchema>;
export type OpenAiApiKeyAuth = z.infer<typeof OpenAiApiKeySchema>;
export type ChatGptAuthConfig = z.infer<typeof ChatGptAuthSchema>;
export type ChatGptAuth = ChatGptAuthConfig;

export class ChatGptAuthError extends Error {
  public readonly code: "missing" | "invalid-json" | "invalid-schema";
  public readonly authPath: string;

  constructor(
    code: "missing" | "invalid-json" | "invalid-schema",
    message: string,
    authPath: string
  ) {
    super(message);
    this.name = "ChatGptAuthError";
    this.code = code;
    this.authPath = authPath;
  }
}

export function resolveChatGptAuthPath(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd()
): string {
  const configured = env[CHATGPT_AUTH_ENV_VAR]?.trim() || DEFAULT_CHATGPT_AUTH_PATH;
  return resolve(cwd, configured);
}

export function getOpenAiAccessToken(auth: ChatGptAuthConfig): string {
  if (auth.openai.type === "api-key") {
    return auth.openai.apiKey;
  }
  return auth.openai.access;
}

export function isChatGptAccessExpired(auth: ChatGptAuthConfig, now = Date.now()): boolean {
  if (auth.openai.type === "api-key") {
    return false;
  }
  return auth.openai.expires <= now;
}

function loadFromEnv(env: NodeJS.ProcessEnv): ChatGptAuthConfig | null {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const parsed: ChatGptAuthConfig = {
    openai: {
      type: "api-key",
      apiKey,
    },
    model: env.OPENAI_MODEL || undefined,
    baseURL: env.OPENAI_BASE_URL || undefined,
    temperature: env.OPENAI_TEMPERATURE
      ? Number(env.OPENAI_TEMPERATURE)
      : undefined,
  };

  const result = ChatGptAuthSchema.safeParse(parsed);
  if (!result.success) {
    throw new ChatGptAuthError(
      "invalid-schema",
      `Environment OpenAI API credentials are invalid: ${result.error.message}.`,
      process.cwd()
    );
  }

  return result.data;
}

export function loadChatGptAuth(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd()
): ChatGptAuthConfig {
  const envAuth = loadFromEnv(env);
  if (envAuth) {
    return envAuth;
  }

  const authPath = resolveChatGptAuthPath(env, cwd);

  if (!existsSync(authPath)) {
    throw new ChatGptAuthError(
      "missing",
      `Missing ChatGPT auth file at ${authPath}. Copy .secrets/chatgpt-auth.json.example to ${DEFAULT_CHATGPT_AUTH_PATH} or set ${CHATGPT_AUTH_ENV_VAR}.`,
      authPath
    );
  }

  let raw: string;
  try {
    raw = readFileSync(authPath, "utf8");
  } catch {
    throw new ChatGptAuthError(
      "missing",
      `Could not read ChatGPT auth file at ${authPath}. Check file permissions or set ${CHATGPT_AUTH_ENV_VAR}.`,
      authPath
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ChatGptAuthError(
      "invalid-json",
      `ChatGPT auth file at ${authPath} is not valid JSON. Fix the JSON syntax or replace it from .secrets/chatgpt-auth.json.example.`,
      authPath
    );
  }

  const result = ChatGptAuthSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => issue.path.join(".") || issue.message)
      .join(", ");
    throw new ChatGptAuthError(
      "invalid-schema",
      `ChatGPT auth file at ${authPath} must contain either OAuth under openai or api-key style config (${issues}). Update the file to match .secrets/chatgpt-auth.json.example.`,
      authPath
    );
  }

  return result.data;
}
