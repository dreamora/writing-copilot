// REST routes for annotations (Plannotator-style inline comments).
// Mirrors the structure of src/routes/suggestions.ts: a factory returns an
// object keyed by "METHOD /path" so server.ts can dispatch by string lookup.
import type { AnnotationService } from "../domain/annotations/annotation-service";
import type { CreateAnnotationInput } from "../domain/annotations/annotation-types";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export function createAnnotationRoutes(service: AnnotationService) {
  return {
    "GET /api/documents/:documentId/annotations": (_req: Request, documentId: string) => {
      if (!documentId) return jsonError("Missing documentId");
      const annotations = service.listByDocument(documentId);
      return json(annotations);
    },

    "POST /api/documents/:documentId/annotations": async (req: Request, documentId: string) => {
      if (!documentId) return jsonError("Missing documentId");

      let body: Partial<CreateAnnotationInput>;
      try {
        body = (await req.json()) as Partial<CreateAnnotationInput>;
      } catch {
        return jsonError("Invalid JSON body");
      }

      const blockId = typeof body.blockId === "string" ? body.blockId : documentId;
      const charStart = body.charStart;
      const charEnd = body.charEnd;
      const originalText = body.originalText;
      const commentText = body.commentText;

      if (typeof charStart !== "number" || typeof charEnd !== "number") {
        return jsonError("charStart and charEnd must be numbers");
      }
      if (charStart < 0 || charEnd < charStart) {
        return jsonError("Invalid range: charStart must be >= 0 and charEnd >= charStart");
      }
      if (typeof originalText !== "string" || originalText.length === 0) {
        return jsonError("originalText is required");
      }
      if (typeof commentText !== "string" || commentText.trim().length === 0) {
        return jsonError("commentText is required");
      }

      try {
        const created = service.create({
          documentId,
          blockId,
          charStart,
          charEnd,
          originalText,
          commentText,
        });
        return json(created, 201);
      } catch (e) {
        if ((e as Error).message.includes("overlaps")) {
          return jsonError((e as Error).message, 409);
        }
        return jsonError(`Failed to create annotation: ${(e as Error).message}`, 500);
      }
    },

    "DELETE /api/annotations/:id": (_req: Request, id: string) => {
      if (!id) return jsonError("Missing annotation id");
      const deleted = service.delete(id);
      if (!deleted) return jsonError("Annotation not found", 404);
      return new Response(null, { status: 204 });
    },
  } as const;
}
