import type { Annotation } from "../../../../src/domain/annotations/annotation-types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export interface CreateAnnotationBody {
  blockId: string;
  charStart: number;
  charEnd: number;
  originalText: string;
  commentText: string;
}

async function readError(res: Response): Promise<string> {
  const err = await res.json().catch(() => ({ error: res.statusText }));
  return (err as { error?: string }).error ?? res.statusText;
}

export async function fetchAnnotations(documentId: string): Promise<Annotation[]> {
  const res = await fetch(
    `${API_BASE}/api/documents/${encodeURIComponent(documentId)}/annotations`,
  );
  if (!res.ok) {
    throw new Error(`Load failed: ${await readError(res)}`);
  }
  return (await res.json()) as Annotation[];
}

export async function postAnnotation(
  documentId: string,
  body: CreateAnnotationBody,
): Promise<Annotation> {
  const res = await fetch(
    `${API_BASE}/api/documents/${encodeURIComponent(documentId)}/annotations`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    throw new Error(`Create failed: ${await readError(res)}`);
  }
  return (await res.json()) as Annotation;
}

export async function deleteAnnotationRequest(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/annotations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Delete failed: ${await readError(res)}`);
  }
}
