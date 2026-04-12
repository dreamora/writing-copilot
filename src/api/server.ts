// Writing Copilot API Server — Phase 2
import { Database } from "bun:sqlite";
import { readDoc, saveDoc } from "../lib/fs-adapter";
import { SuggestionService } from "../domain/suggestions/suggestion-service";
import { OpenAiSuggestionProvider, StubSuggestionProvider } from "../adapters/ai/OpenAiSuggestionProvider";
import { createSuggestionRoutes } from "../routes/suggestions";

const API_PORT = parseInt(process.env.API_PORT || "3001", 10);
const DB_PATH = process.env.DB_PATH || "./data/copilot.db";
const USE_STUB = !process.env.OPENAI_API_KEY || process.env.USE_STUB_PROVIDER === "true";

// Open DB connection
const db = new Database(DB_PATH);
db.exec("PRAGMA journal_mode=WAL;");

// Wire suggestion service
const provider = USE_STUB
  ? new StubSuggestionProvider()
  : new OpenAiSuggestionProvider();
const suggestionService = new SuggestionService(db, provider);
const suggestionRoutes = createSuggestionRoutes(suggestionService);

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Helper to extract path param from pattern like /api/suggestions/:id/action
function extractId(pathname: string, prefix: string): string {
  const after = pathname.slice(prefix.length);
  return after.split("/")[0] ?? "";
}

const server = Bun.serve({
  port: API_PORT,
  async fetch(request: Request) {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    // CORS headers
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

    // --- Health ---
    if (method === "GET" && pathname === "/api/health") {
      return addCors(
        json({ status: "ok", timestamp: new Date().toISOString(), stubProvider: USE_STUB })
      );
    }

    // --- Docs ---
    if (method === "GET" && pathname === "/api/docs") {
      const path = url.searchParams.get("path");
      if (!path) return addCors(json({ error: "Missing path parameter" }, 400));
      try {
        const { content, hash } = readDoc(path);
        return addCors(json({ content, hash, path }));
      } catch (err) {
        return addCors(json({ error: (err as Error).message }, 404));
      }
    }

    if (method === "POST" && pathname === "/api/docs/save") {
      let body: { path?: string; content?: string };
      try {
        body = (await request.json()) as { path?: string; content?: string };
      } catch {
        return addCors(json({ error: "Invalid JSON" }, 400));
      }
      if (!body.path || body.content === undefined) {
        return addCors(json({ error: "Missing path or content" }, 400));
      }
      try {
        const result = saveDoc(body.path, body.content);
        return addCors(json(result));
      } catch (err) {
        return addCors(json({ error: (err as Error).message }, 500));
      }
    }

    // --- Suggestions ---
    if (method === "POST" && pathname === "/api/suggestions") {
      const res = await suggestionRoutes["POST /api/suggestions"](request);
      return addCors(res);
    }

    if (method === "GET" && pathname === "/api/suggestions") {
      const res = suggestionRoutes["GET /api/suggestions"](request);
      return addCors(res);
    }

    // Lifecycle routes with :id
    const lifecycleMatch = pathname.match(
      /^\/api\/suggestions\/([^/]+)\/(accept|reject|edit-apply|defer)$/
    );
    if (method === "POST" && lifecycleMatch) {
      const id = lifecycleMatch[1]!;
      const action = lifecycleMatch[2]!;

      let res: Response;
      if (action === "accept") {
        res = suggestionRoutes["POST /api/suggestions/:id/accept"](request, id);
      } else if (action === "reject") {
        res = suggestionRoutes["POST /api/suggestions/:id/reject"](request, id);
      } else if (action === "edit-apply") {
        res = await suggestionRoutes["POST /api/suggestions/:id/edit-apply"](request, id);
      } else {
        res = suggestionRoutes["POST /api/suggestions/:id/defer"](request, id);
      }
      return addCors(res);
    }

    return addCors(json({ error: "Not found" }, 404));
  },
});

console.log(`Writing Copilot API running on http://localhost:${server.port}`);
console.log(`Provider: ${USE_STUB ? "stub (no API key)" : "OpenAI"}`);
