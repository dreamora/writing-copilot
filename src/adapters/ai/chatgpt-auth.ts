import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

export const DEFAULT_CHATGPT_AUTH_PATH = ".secrets/chatgpt-auth.json";
export const CHATGPT_AUTH_ENV_VAR = "CHATGPT_AUTH_PATH";

const ChatGptAuthSchema = z.object({
  apiKey: z.string().min(1, "apiKey is required"),
  model: z.string().min(1).optional(),
  baseURL: z.string().url().optional(),
  organization: z.string().min(1).optional(),
  project: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

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

export function loadChatGptAuth(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd()
): ChatGptAuthConfig {
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
      `ChatGPT auth file at ${authPath} is missing required fields or has invalid values (${issues}). Update the file to match .secrets/chatgpt-auth.json.example.`,
      authPath
    );
  }

  return result.data;
}
