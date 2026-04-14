import { Database } from "bun:sqlite";
import { readDoc, saveDoc } from "../lib/fs-adapter";
import { SuggestionService } from "../domain/suggestions/suggestion-service";
import { OpenAiSuggestionProvider, StubSuggestionProvider } from "../adapters/ai/OpenAiSuggestionProvider";
import { createSuggestionRoutes } from "../routes/suggestions";
import { createTelemetryRoutes } from "../routes/telemetry";
import { EventWriter } from "../domain/telemetry/event-writer";
import {
  ChatGptAuthError,
  loadChatGptAuth,
  resolveChatGptAuthPath,
} from "../adapters/ai/chatgpt-auth";
import type { SuggestionProvider } from "../adapters/ai/SuggestionProvider";

const API_PORT = parseInt(process.env.API_PORT || "8788", 10);
const DB_PATH = process.env.DB_PATH || "./data/copilot.db";

function createSuggestionProvider(): {
  provider: SuggestionProvider;
  mode: "stub" | "chatgpt";
  authPath: string;
  authError?: string;
} {
  const authPath = resolveChatGptAuthPath();

  if (process.env.USE_STUB_PROVIDER === "true") {
    return { provider: new StubSuggestionProvider(), mode: "stub", authPath };
  }

  try {
    const auth = loadChatGptAuth();
    return {
      provider: new OpenAiSuggestionProvider(auth),
      mode: "chatgpt",
      authPath,
    };
  } catch (error) {
    if (error instanceof ChatGptAuthError) {
      return {
        provider: new StubSuggestionProvider(),
        mode: "stub",
        authPath,
        authError: error.message,
      };
    }

    throw error;
  }
}

const providerBootstrap = createSuggestionProvider();
const db = new Database(DB_PATH);
db.exec("PRAGMA journal_mode=WAL;");

const eventWriter = new EventWriter(db);
const suggestionService = new SuggestionService(db, providerBootstrap.provider, eventWriter);
const suggestionRoutes = createSuggestionRoutes(suggestionService);
const telemetryRoutes = createTelemetryRoutes(db);

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const server = Bun.serve({
  port: API_PORT,
  async fetch(request: Request) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const addCors = (res: Response) => {
      res.headers.set("Access-Control-Allow-Origin", "*");
      return res;
    };

    if (method === "GET" && pathname === "/api/health") {
      return addCors(
        json({
          status: "ok",
          timestamp: new Date().toISOString(),
          stubProvider: providerBootstrap.mode === "stub",
          providerMode: providerBootstrap.mode,
          authPath: providerBootstrap.authPath,
          authError: providerBootstrap.authError ?? null,
        })
      );
    }

    if (method === "GET" && pathname === "/api/docs") {
      const path = url.searchParams.get("path");
      if (!path) return addCors(json({ error: "Missing path parameter" }, 400));
      try { return addCors(json({ ...readDoc(path), path })); }
      catch (err) { return addCors(json({ error: (err as Error).message }, 404)); }
    }

    if (method === "POST" && pathname === "/api/docs/save") {
      let body: { path?: string; content?: string };
      try { body = (await request.json()) as { path?: string; content?: string }; }
      catch { return addCors(json({ error: "Invalid JSON" }, 400)); }
      if (!body.path || body.content === undefined) return addCors(json({ error: "Missing path or content" }, 400));
      try { return addCors(json(saveDoc(body.path, body.content))); }
      catch (err) { return addCors(json({ error: (err as Error).message }, 500)); }
    }

    if (method === "POST" && pathname === "/api/suggestions") {
      return addCors(await suggestionRoutes["POST /api/suggestions"](request));
    }
    if (method === "GET" && pathname === "/api/suggestions") {
      return addCors(suggestionRoutes["GET /api/suggestions"](request));
    }
    const lifecycleMatch = pathname.match(/^\/api\/suggestions\/([^/]+)\/(accept|reject|edit-apply|defer)$/);
    if (method === "POST" && lifecycleMatch) {
      const [, id, action] = lifecycleMatch;
      let res: Response;
      if (action === "accept") res = await suggestionRoutes["POST /api/suggestions/:id/accept"](request, id!);
      else if (action === "reject") res = await suggestionRoutes["POST /api/suggestions/:id/reject"](request, id!);
      else if (action === "edit-apply") res = await suggestionRoutes["POST /api/suggestions/:id/edit-apply"](request, id!);
      else res = await suggestionRoutes["POST /api/suggestions/:id/defer"](request, id!);
      return addCors(res);
    }

    if (method === "POST" && pathname === "/api/telemetry/events") {
      return addCors(await telemetryRoutes["POST /api/telemetry/events"](request));
    }
    if (method === "POST" && pathname === "/api/telemetry/rewrites") {
      return addCors(await telemetryRoutes["POST /api/telemetry/rewrites"](request));
    }
    if (method === "POST" && pathname === "/api/telemetry/block-time") {
      return addCors(await telemetryRoutes["POST /api/telemetry/block-time"](request));
    }

    if (method === "GET" && pathname === "/api/insights/acceptance-by-type") {
      return addCors(telemetryRoutes["GET /api/insights/acceptance-by-type"](request));
    }
    if (method === "GET" && pathname === "/api/insights/time-by-block") {
      return addCors(telemetryRoutes["GET /api/insights/time-by-block"](request));
    }
    if (method === "GET" && pathname === "/api/insights/rewrite-patterns") {
      return addCors(telemetryRoutes["GET /api/insights/rewrite-patterns"](request));
    }
    if (method === "GET" && pathname === "/api/insights/search") {
      return addCors(telemetryRoutes["GET /api/insights/search"](request));
    }
    if (method === "GET" && pathname === "/api/insights/summary") {
      return addCors(telemetryRoutes["GET /api/insights/summary"](request));
    }

    return addCors(json({ error: "Not found" }, 404));
  },
});

console.log(`Writing Copilot API running on http://localhost:${server.port}`);
console.log(`Provider: ${providerBootstrap.mode}${providerBootstrap.authError ? ` (${providerBootstrap.authError})` : ""}`);
