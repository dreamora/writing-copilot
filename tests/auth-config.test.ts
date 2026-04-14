import { describe, expect, it } from "bun:test";
import {
  ChatGptAuthError,
  DEFAULT_CHATGPT_AUTH_PATH,
  loadChatGptAuth,
  resolveChatGptAuthPath,
} from "../src/adapters/auth/auth-config";

describe("auth-config compatibility exports", () => {
  it("re-exports the default auth path", () => {
    expect(DEFAULT_CHATGPT_AUTH_PATH).toBe(".secrets/chatgpt-auth.json");
  });

  it("resolves the auth path from env or default", () => {
    const cwd = "/tmp/writing-copilot-auth-config";
    expect(resolveChatGptAuthPath({ CHATGPT_AUTH_PATH: "custom/auth.json" } as NodeJS.ProcessEnv, cwd)).toBe(
      `${cwd}/custom/auth.json`
    );
    expect(resolveChatGptAuthPath({} as NodeJS.ProcessEnv, cwd)).toBe(
      `${cwd}/.secrets/chatgpt-auth.json`
    );
  });

  it("re-exports the auth loader and error class", () => {
    try {
      loadChatGptAuth({}, "/tmp/definitely-missing-auth-dir");
      throw new Error("expected loadChatGptAuth to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ChatGptAuthError);
      expect((error as ChatGptAuthError).code).toBe("missing");
    }
  });
});
