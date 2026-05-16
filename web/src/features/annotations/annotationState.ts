import { useCallback, useEffect, useState } from "react";
import type { SelectionSpan } from "../editor/SelectionState";
import type { Annotation } from "../../../../src/domain/annotations/annotation-types";
import {
  fetchAnnotations,
  postAnnotation,
  deleteAnnotationRequest,
} from "./annotationApi";

export interface UseAnnotationsState {
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  setSelectedAnnotationId: (id: string | null) => void;
  createAnnotation: (span: SelectionSpan, commentText: string) => Promise<Annotation>;
  deleteAnnotation: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useAnnotations(documentId: string): UseAnnotationsState {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!documentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const list = await fetchAnnotations(documentId);
      setAnnotations(list);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createAnnotation = useCallback(
    async (span: SelectionSpan, commentText: string): Promise<Annotation> => {
      setError(null);
      try {
        const created = await postAnnotation(documentId, {
          blockId: span.blockId,
          charStart: span.charStart,
          charEnd: span.charEnd,
          originalText: span.selectedText,
          commentText,
        });
        setAnnotations((prev) => [...prev, created]);
        return created;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      }
    },
    [documentId],
  );

  const deleteAnnotation = useCallback(async (id: string): Promise<void> => {
    setError(null);
    try {
      await deleteAnnotationRequest(id);
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      setSelectedAnnotationId((curr) => (curr === id ? null : curr));
    } catch (e) {
      setError((e as Error).message);
      throw e;
    }
  }, []);

  return {
    annotations,
    selectedAnnotationId,
    setSelectedAnnotationId,
    createAnnotation,
    deleteAnnotation,
    reload,
    isLoading,
    error,
  };
}
