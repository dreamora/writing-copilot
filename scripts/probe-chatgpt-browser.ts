import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { buildPrompt } from "../src/domain/suggestions/prompt-builder";
import { buildProviderSmokeRequest } from "../src/adapters/ai/provider-smoke";
import { loadChatGptAuth, resolveChatGptAuthPath } from "../src/adapters/ai/chatgpt-auth";
import {
  buildChatGptBrowserHeaders,
  createBrowserConversationPayload,
  pickPreferredModelSlug,
} from "../src/adapters/ai/chatgpt-browser";

const auth = loadChatGptAuth();
const deviceId = randomUUID();
const headers = buildChatGptBrowserHeaders({
  accessToken: auth.openai.access,
  accountId: auth.openai.accountId,
  deviceId,
});

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent: headers["User-Agent"],
  extraHTTPHeaders: headers,
});
const page = await context.newPage();

async function pageFetch(path: string, init?: { method?: string; body?: unknown; headers?: Record<string, string> }) {
  return page.evaluate(
    async ({ path, init }) => {
      const response = await fetch(path, {
        method: init?.method ?? "GET",
        headers: init?.headers,
        body: init?.body ? JSON.stringify(init.body) : undefined,
      });
      const text = await response.text();
      return { status: response.status, text };
    },
    { path, init }
  );
}

try {
  await page.goto("https://chatgpt.com/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(3000);

  const models = await pageFetch("/backend-api/models");
  let modelsJson: any = null;
  try {
    modelsJson = JSON.parse(models.text);
  } catch {}
  const model = auth.model ?? pickPreferredModelSlug(modelsJson);

  const sentinel = await pageFetch("/backend-api/sentinel/chat-requirements", {
    method: "POST",
    body: {},
    headers: { "Content-Type": "application/json" },
  });

  let conversation: { status: number; text: string } | null = null;
  let sentinelJson: any = null;

  try {
    sentinelJson = JSON.parse(sentinel.text);
  } catch {}

  if (model) {
    const conversationHeaders: Record<string, string> = { "Content-Type": "application/json", Accept: "text/event-stream" };
    if (sentinelJson?.token) {
      conversationHeaders["OpenAI-Sentinel-Chat-Requirements-Token"] = sentinelJson.token;
    }

    conversation = await pageFetch("/backend-api/conversation", {
      method: "POST",
      headers: conversationHeaders,
      body: createBrowserConversationPayload({
        model,
        prompt: buildPrompt(buildProviderSmokeRequest()),
      }),
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        authPath: resolveChatGptAuthPath(),
        title: await page.title(),
        currentUrl: page.url(),
        modelStatus: models.status,
        modelJson: Boolean(modelsJson),
        modelPreview: models.text.slice(0, 300),
        selectedModel: model,
        sentinelStatus: sentinel.status,
        sentinelTurnstile: sentinelJson?.turnstile?.required ?? null,
        sentinelProofOfWork: sentinelJson?.proofofwork?.required ?? null,
        conversationStatus: conversation?.status ?? null,
        conversationPreview: conversation?.text?.slice(0, 500) ?? null,
      },
      null,
      2
    )
  );
} finally {
  await context.close();
  await browser.close();
}
