import { loadChatGptAuth, resolveChatGptAuthPath } from "../src/adapters/ai/chatgpt-auth";

try {
  const auth = loadChatGptAuth();
  console.log(
    JSON.stringify(
      {
        ok: true,
        authPath: resolveChatGptAuthPath(),
        model: auth.model ?? "gpt-4o-mini",
        baseURL: auth.baseURL ?? "https://api.openai.com/v1",
        hasApiKey: Boolean(auth.apiKey),
      },
      null,
      2
    )
  );
} catch (error) {
  const err = error as Error & { code?: string; authPath?: string };
  console.error(
    JSON.stringify(
      {
        ok: false,
        code: err.code ?? "unknown",
        authPath: err.authPath ?? resolveChatGptAuthPath(),
        message: err.message,
      },
      null,
      2
    )
  );
  process.exit(1);
}
