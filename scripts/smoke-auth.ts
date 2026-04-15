import {
  isChatGptAccessExpired,
  loadChatGptAuth,
  resolveChatGptAuthPath,
} from "../src/adapters/ai/chatgpt-auth";

try {
  const auth = loadChatGptAuth();
  console.log(
    JSON.stringify(
      {
        ok: true,
        authPath: resolveChatGptAuthPath(),
        authType: auth.openai.type,
        accountId: auth.openai.accountId,
        hasAccessToken: Boolean(auth.openai.access),
        hasRefreshToken: Boolean(auth.openai.refresh),
        expires: auth.openai.expires,
        expired: isChatGptAccessExpired(auth),
        model: auth.model ?? "gpt-4o-mini",
        baseURL: auth.baseURL ?? "https://api.openai.com/v1",
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
