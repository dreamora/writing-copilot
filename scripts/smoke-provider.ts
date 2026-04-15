import { OpenAiSuggestionProvider } from "../src/adapters/ai/OpenAiSuggestionProvider";
import {
  isChatGptAccessExpired,
  loadChatGptAuth,
  resolveChatGptAuthPath,
} from "../src/adapters/ai/chatgpt-auth";
import {
  buildProviderSmokeRequest,
  summarizeSmokeResponse,
} from "../src/adapters/ai/provider-smoke";

const dryRun = process.env.SMOKE_PROVIDER_DRY_RUN === "1";

try {
  const auth = loadChatGptAuth();

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          dryRun: true,
          authPath: resolveChatGptAuthPath(),
          authType: auth.openai.type,
          accountId: auth.openai.accountId,
          expired: isChatGptAccessExpired(auth),
          request: buildProviderSmokeRequest(),
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  if (isChatGptAccessExpired(auth)) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          code: "expired-token",
          authPath: resolveChatGptAuthPath(),
          expires: auth.openai.expires,
          message: "OAuth access token is expired. Refresh the ChatGPT login before running a live provider smoke test.",
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  const provider = new OpenAiSuggestionProvider(auth);
  const response = await provider.suggest(buildProviderSmokeRequest());
  const result = summarizeSmokeResponse(response);

  const payload = {
    ok: result.ok,
    usedStub: result.usedStub,
    authPath: resolveChatGptAuthPath(),
    message: result.message,
    issueSummary: response.issueSummary,
    confidence: response.confidence ?? null,
  };

  if (!result.ok) {
    console.error(JSON.stringify(payload, null, 2));
    process.exit(2);
  }

  console.log(JSON.stringify(payload, null, 2));
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
