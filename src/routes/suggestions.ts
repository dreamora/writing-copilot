// REST routes for suggestion lifecycle
import type { SuggestionService } from "../domain/suggestions/suggestion-service";
import type { SuggestionRequest } from "../domain/suggestions/suggestion-types";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status = 400): Response {
  return json({ error: message }, status);
}

async function readOptionalJson(req: Request): Promise<Record<string, unknown>> {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return {};
  return (await req.json()) as Record<string, unknown>;
}

export function createSuggestionRoutes(service: SuggestionService) {
  return {
    "POST /api/suggestions": async (req: Request) => {
      let body: SuggestionRequest & { sessionId?: string };
      try {
        body = (await req.json()) as SuggestionRequest & { sessionId?: string };
      } catch {
        return jsonError("Invalid JSON body");
      }

      if (!body.documentId || !body.blockId || !body.selection?.selectedText) {
        return jsonError("Missing required fields: documentId, blockId, selection.selectedText");
      }
      if (!body.actionType) {
        return jsonError("Missing actionType");
      }

      try {
        const suggestion = await service.createSuggestion(body, body.sessionId);
        return json(suggestion, 201);
      } catch (e) {
        return jsonError(`Failed to create suggestion: ${(e as Error).message}`, 500);
      }
    },

    "GET /api/suggestions": (req: Request) => {
      const url = new URL(req.url);
      const documentId = url.searchParams.get("documentId");
      if (!documentId) return jsonError("Missing documentId query param");
      const suggestions = service.getSuggestionsForDocument(documentId);
      return json(suggestions);
    },

    "POST /api/suggestions/:id/accept": async (req: Request, id: string) => {
      const body = await readOptionalJson(req);
      const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;
      const updated = service.transition(id, "accepted", undefined, sessionId);
      if (!updated) return jsonError("Suggestion not found", 404);
      return json(updated);
    },

    "POST /api/suggestions/:id/reject": async (req: Request, id: string) => {
      const body = await readOptionalJson(req);
      const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;
      const updated = service.transition(id, "rejected", undefined, sessionId);
      if (!updated) return jsonError("Suggestion not found", 404);
      return json(updated);
    },

    "POST /api/suggestions/:id/edit-apply": async (req: Request, id: string) => {
      let body: { editedText?: string; sessionId?: string };
      try {
        body = (await req.json()) as { editedText?: string; sessionId?: string };
      } catch {
        return jsonError("Invalid JSON body");
      }
      if (!body.editedText) return jsonError("Missing editedText");
      const updated = service.transition(id, "edited_applied", body.editedText, body.sessionId);
      if (!updated) return jsonError("Suggestion not found", 404);
      return json(updated);
    },

    "POST /api/suggestions/:id/defer": async (req: Request, id: string) => {
      const body = await readOptionalJson(req);
      const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;
      const updated = service.transition(id, "deferred", undefined, sessionId);
      if (!updated) return jsonError("Suggestion not found", 404);
      return json(updated);
    },

    "POST /api/suggestions/:id/reopen": async (req: Request, id: string) => {
      const body = await readOptionalJson(req);
      const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;
      const existing = service.getById(id);
      if (!existing) return jsonError("Suggestion not found", 404);
      if (existing.status !== "deferred") {
        return jsonError("Only deferred suggestions can be reopened", 409);
      }
      const updated = service.transition(id, "open", undefined, sessionId);
      return json(updated);
    },
  } as const;
}
