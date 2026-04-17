import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ChatGptAuthError,
  DEFAULT_CHATGPT_AUTH_PATH,
  isChatGptAccessExpired,
  loadChatGptAuth,
  resolveChatGptAuthPath,
} from "../../src/adapters/ai/chatgpt-auth";

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "writing-copilot-auth-"));
  tempDirs.push(dir);
  return dir;
}

function writeOauthAuth(cwd: string, overrides: Record<string, unknown> = {}) {
  const authPath = join(cwd, DEFAULT_CHATGPT_AUTH_PATH);
  mkdirSync(join(cwd, ".secrets"), { recursive: true });
  writeFileSync(
    authPath,
    JSON.stringify({
      openai: {
        type: "oauth",
        refresh: "refresh-token",
        access: "access-token",
        expires: 1776691031314,
        accountId: "user-123",
        ...overrides,
      },
    }),
    "utf8"
  );
}

afterEach(() => {
  while (tempDirs.length) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("chatgpt-auth", () => {
  it("loads oauth auth from the default path", () => {
    const cwd = createTempDir();
    writeOauthAuth(cwd);

    const auth = loadChatGptAuth({}, cwd);

    expect(auth.openai.type).toBe("oauth");
    expect(auth.openai.access).toBe("access-token");
    expect(auth.openai.accountId).toBe("user-123");
  });

  it("resolves an env override path", () => {
    const cwd = createTempDir();
    const resolved = resolveChatGptAuthPath({ CHATGPT_AUTH_PATH: "config/custom-auth.json" } as NodeJS.ProcessEnv, cwd);
    expect(resolved).toBe(join(cwd, "config/custom-auth.json"));
  });

  it("raises a helpful error when the auth file is missing", () => {
    const cwd = createTempDir();

    try {
      loadChatGptAuth({}, cwd);
      throw new Error("expected loadChatGptAuth to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ChatGptAuthError);
      expect((error as ChatGptAuthError).code).toBe("missing");
      expect((error as Error).message).toContain("Missing ChatGPT auth file");
    }
  });

  it("raises a helpful error when the auth JSON is invalid", () => {
    const cwd = createTempDir();
    const authPath = join(cwd, DEFAULT_CHATGPT_AUTH_PATH);
    mkdirSync(join(cwd, ".secrets"), { recursive: true });
    writeFileSync(authPath, "{not-json}", "utf8");

    try {
      loadChatGptAuth({}, cwd);
      throw new Error("expected loadChatGptAuth to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ChatGptAuthError);
      expect((error as ChatGptAuthError).code).toBe("invalid-json");
      expect((error as Error).message).toContain("not valid JSON");
    }
  });

  it("raises a helpful error when the oauth fields are missing", () => {
    const cwd = createTempDir();
    const authPath = join(cwd, DEFAULT_CHATGPT_AUTH_PATH);
    mkdirSync(join(cwd, ".secrets"), { recursive: true });
    writeFileSync(authPath, JSON.stringify({ openai: { type: "oauth", access: "token" } }), "utf8");

    try {
      loadChatGptAuth({}, cwd);
      throw new Error("expected loadChatGptAuth to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ChatGptAuthError);
      expect((error as ChatGptAuthError).code).toBe("invalid-schema");
      expect((error as Error).message).toContain("OAuth login object under openai");
      expect((error as Error).message).toContain("openai.refresh");
    }
  });

  it("detects expired oauth access tokens", () => {
    const cwd = createTempDir();
    writeOauthAuth(cwd, { expires: 1000 });

    const auth = loadChatGptAuth({}, cwd);
    expect(isChatGptAccessExpired(auth, 1001)).toBe(true);
    expect(isChatGptAccessExpired(auth, 999)).toBe(false);
  });

  it("normalizes oauth expiry supplied in seconds", () => {
    const cwd = createTempDir();
    writeOauthAuth(cwd, { expires: Math.floor(Date.now() / 1000) + 3600 });

    const auth = loadChatGptAuth({}, cwd);
    expect(auth.openai.expires).toBeGreaterThan(1_700_000_000_000);
  });
  it("uses OPENAI_API_KEY env var when auth file is missing", () => {
    const cwd = createTempDir();
    const original = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "sk-test-key-123";

    try {
      const auth = loadChatGptAuth({}, cwd);
      expect(auth.openai.type).toBe("api-key");
      expect(auth.openai.apiKey).toBe("sk-test-key-123");
    } finally {
      if (original === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = original;
    }
  });
});
