/**
 * Auth Config Layer
 * 
 * Defines the schema for authentication configuration.
 * Supports loading from:
 * 1. JSON file (production-safe, git-ignored)
 * 2. Environment variables (CI/CD-friendly)
 * 
 * No credentials are logged or exposed in error messages.
 */

import { z } from "zod";

/**
 * Zod schema for ChatGPT auth credentials.
 * Validates shape and required fields at parse time.
 */
export const ChatGptAuthSchema = z.object({
  apiKey: z.string().min(1, "API key is required").describe("OpenAI API key"),
  model: z.string().default("gpt-4o-mini").describe("Model to use (default: gpt-4o-mini)"),
  baseUrl: z.string().url().optional().describe("Custom API base URL (optional)"),
  timeout: z.number().int().positive().default(30000).describe("Request timeout in ms"),
  maxRetries: z.number().int().min(0).default(1).describe("Max retries on parse failure"),
});

export type ChatGptAuth = z.infer<typeof ChatGptAuthSchema>;

/**
 * Validates auth config without logging credentials.
 * @throws Error with sanitized message if validation fails.
 */
export function validateAuthConfig(data: unknown): ChatGptAuth {
  try {
    return ChatGptAuthSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
      throw new Error(`Auth config validation failed: ${issues}`);
    }
    throw error;
  }
}

/**
 * Resolves auth from environment variable (CI/CD path).
 * Expects JSON-encoded config in OPENAI_AUTH env var.
 */
export function loadFromEnv(): ChatGptAuth | null {
  const authJson = process.env.OPENAI_AUTH;
  if (!authJson) {
    return null;
  }
  try {
    const data = JSON.parse(authJson);
    return validateAuthConfig(data);
  } catch (error) {
    // Do not log the env var content
    throw new Error(`Failed to parse OPENAI_AUTH environment variable: ${(error as Error).message}`);
  }
}

/**
 * Resolves auth from JSON file (development path).
 * File path defaults to .secrets/chatgpt-auth.json (relative to cwd).
 * Can be overridden via OPENAI_AUTH_PATH env var.
 */
export async function loadFromFile(): Promise<ChatGptAuth | null> {
  const fs = await import("fs/promises");
  const path = await import("path");
  
  const authPath = process.env.OPENAI_AUTH_PATH ?? "./.secrets/chatgpt-auth.json";
  const fullPath = path.resolve(authPath);
  
  try {
    const content = await fs.readFile(fullPath, "utf-8");
    const data = JSON.parse(content);
    return validateAuthConfig(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // File not found is not an error here; signals fallback to env/stub
      return null;
    }
    // Do not log the file path if it contains secrets
    if ((error as Error).message.includes("JSON")) {
      throw new Error(`Invalid JSON in auth config file: ${(error as Error).message}`);
    }
    throw new Error(`Error reading auth config: ${(error as Error).message}`);
  }
}

/**
 * Bootstrap auth config with fallback chain:
 * 1. Try .secrets/chatgpt-auth.json (production-safe)
 * 2. Try OPENAI_AUTH env var (CI/CD)
 * 3. Try OPENAI_API_KEY env var (legacy fallback)
 * 4. Return null if all fail (caller decides: stub or error)
 * 
 * Errors during load are thrown (e.g., malformed JSON).
 * Missing files/vars return null (caller handles gracefully).
 */
export async function bootstrapAuthConfig(): Promise<ChatGptAuth | null> {
  // Try JSON file first (most explicit, production-safe)
  try {
    const fromFile = await loadFromFile();
    if (fromFile) {
      return fromFile;
    }
  } catch (error) {
    // File exists but is invalid (malformed JSON, validation error)
    // This is a hard error — don't fall through to env
    throw error;
  }

  // Try OPENAI_AUTH env var (full config as JSON string)
  const fromEnv = loadFromEnv();
  if (fromEnv) {
    return fromEnv;
  }

  // Try legacy OPENAI_API_KEY for quick bootstrap
  const legacyKey = process.env.OPENAI_API_KEY;
  if (legacyKey) {
    return validateAuthConfig({ apiKey: legacyKey });
  }

  // All fallbacks exhausted
  return null;
}
