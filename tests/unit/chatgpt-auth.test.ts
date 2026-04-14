import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ChatGptAuthError,
  DEFAULT_CHATGPT_AUTH_PATH,
  loadChatGptAuth,
  resolveChatGptAuthPath,
} from "../../src/adapters/ai/chatgpt-auth";

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "writing-copilot-auth-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("chatgpt-auth", () => {
  it("loads auth from the default path", () => {
    const cwd = createTempDir();
    const authPath = join(cwd, DEFAULT_CHATGPT_AUTH_PATH);
    mkdirSync(join(cwd, ".secrets"), { recursive: true });
    writeFileSync(authPath, JSON.stringify({ apiKey: "sk-test", model: "gpt-4o-mini" }), "utf8");

    const auth = loadChatGptAuth({}, cwd);

    expect(auth.apiKey).toBe("sk-test");
    expect(auth.model).toBe("gpt-4o-mini");
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

  it("raises a helpful error when required fields are missing", () => {
    const cwd = createTempDir();
    const authPath = join(cwd, DEFAULT_CHATGPT_AUTH_PATH);
    mkdirSync(join(cwd, ".secrets"), { recursive: true });
    writeFileSync(authPath, JSON.stringify({ model: "gpt-4o-mini" }), "utf8");

    try {
      loadChatGptAuth({}, cwd);
      throw new Error("expected loadChatGptAuth to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ChatGptAuthError);
      expect((error as ChatGptAuthError).code).toBe("invalid-schema");
      expect((error as Error).message).toContain("missing required fields");
      expect((error as Error).message).toContain("apiKey");
    }
  });
});
