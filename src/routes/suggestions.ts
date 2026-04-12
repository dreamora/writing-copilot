// Bead 2.5 — REST routes for suggestion lifecycle
import type { SuggestionService } from "../domain/suggestions/suggestion-service";
import type { SuggestionRequest, SuggestionStatus } from "../domain/suggestions/suggestion-types";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export function createSuggestionRoutes(service: SuggestionService) {
  return {
    /** POST /api/suggestions — create a new suggestion */
    "POST /api/suggestions": async (req: Request) => {
      let body: SuggestionRequest;
      try {
        body = (await req.json()) as SuggestionRequest;
      } catch {
        return jsonError("Invalid JSON body");
      }

      // Basic validation
      if (!body.documentId || !body.blockId || !body.selection?.selectedText) {
        return jsonError("Missing required fields: documentId, blockId, selection.selectedText");
      }
      if (!body.actionType) {
        return jsonError("Missing actionType");
      }

      try {
        const suggestion = await service.createSuggestion(body);
        return json(suggestion, 201);
      } catch (e) {
        return jsonError(`Failed to create suggestion: ${(e as Error).message}`, 500);
      }
    },

    /** GET /api/suggestions?documentId=... */
    "GET /api/suggestions": (req: Request) => {
      const url = new URL(req.url);
      const documentId = url.searchParams.get("documentId");
      if (!documentId) return jsonError("Missing documentId query param");
      const suggestions = service.getSuggestionsForDocument(documentId);
      return json(suggestions);
    },

    /** POST /api/suggestions/:id/accept */
    "POST /api/suggestions/:id/accept": (_req: Request, id: string) => {
      const updated = service.transition(id, "accepted");
      if (!updated) return jsonError("Suggestion not found", 404);
      return json(updated);
    },

    /** POST /api/suggestions/:id/reject */
    "POST /api/suggestions/:id/reject": (_req: Request, id: string) => {
      const updated = service.transition(id, "rejected");
      if (!updated) return jsonError("Suggestion not found", 404);
      return json(updated);
    },

    /** POST /api/suggestions/:id/edit-apply  body: { editedText } */
    "POST /api/suggestions/:id/edit-apply": async (req: Request, id: string) => {
      let body: { editedText?: string };
      try {
        body = (await req.json()) as { editedText?: string };
      } catch {
        return jsonError("Invalid JSON body");
      }
      if (!body.editedText) return jsonError("Missing editedText");
      const updated = service.transition(id, "edited_applied", body.editedText);
      if (!updated) return jsonError("Suggestion not found", 404);
      return json(updated);
    },

    /** POST /api/suggestions/:id/defer */
    "POST /api/suggestions/:id/defer": (_req: Request, id: string) => {
      const updated = service.transition(id, "deferred");
      if (!updated) return jsonError("Suggestion not found", 404);
      return json(updated);
    },
  } as const;
}
