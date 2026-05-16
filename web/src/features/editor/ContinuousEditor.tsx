import React, { useCallback, useMemo, useRef, useState } from "react";
import type { SuggestionActionType } from "../../../../src/domain/suggestions/suggestion-types";
import {
  captureRenderedSelection,
  captureSelection,
  computePopoverPosition,
  computePopoverPositionFromRect,
} from "./SelectionState";
import type { SelectionSpan, PopoverPosition } from "./SelectionState";
import SelectionPopover from "./SelectionPopover";
import { renderMarkdownToHtml } from "./markdownPreview";
import type { AnnotationHighlight } from "./markdownPreview";

interface ContinuousEditorProps {
  documentId: string;
  content: string;
  dirty: boolean;
  onChange: (next: string) => void;
  onRequestSuggestion?: (
    selection: SelectionSpan,
    actionType: SuggestionActionType,
    customInstruction?: string
  ) => void;
  loadingSuggestion?: boolean;
  annotationHighlights?: AnnotationHighlight[];
  onAnnotate?: (selection: SelectionSpan, commentText: string) => void | Promise<void>;
  onAnnotationClick?: (annotationId: string) => void;
}

export default function ContinuousEditor({
  documentId,
  content,
  dirty,
  onChange,
  onRequestSuggestion,
  loadingSuggestion = false,
  annotationHighlights,
  onAnnotate,
  onAnnotationClick,
}: ContinuousEditorProps) {
  const [activeSelection, setActiveSelection] = useState<SelectionSpan | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPosition | null>(null);
  const [showSourceEditor, setShowSourceEditor] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewHtml = useMemo(
    () => renderMarkdownToHtml(content, annotationHighlights),
    [content, annotationHighlights]
  );

  const handlePreviewMouseUp = useCallback(() => {
    if (!previewRef.current) return;
    const result = captureRenderedSelection(documentId, previewRef.current, content);
    if (!result) return;
    setActiveSelection(result.span);
    setPopoverPos(computePopoverPositionFromRect(result.rect));
  }, [content, documentId]);

  const handleTextareaMouseUp = useCallback((event: React.MouseEvent<HTMLTextAreaElement>) => {
    const span = captureSelection(documentId, event.currentTarget);
    if (!span) return;
    setActiveSelection(span);
    setPopoverPos(computePopoverPosition(event.currentTarget));
  }, [documentId]);

  const handlePopoverAction = useCallback((actionType: SuggestionActionType, customInstruction?: string) => {
    if (activeSelection && onRequestSuggestion) onRequestSuggestion(activeSelection, actionType, customInstruction);
    setActiveSelection(null);
    setPopoverPos(null);
  }, [activeSelection, onRequestSuggestion]);

  const closePopover = useCallback(() => {
    setActiveSelection(null);
    setPopoverPos(null);
  }, []);

  const handlePopoverAnnotate = useCallback(
    async (commentText: string) => {
      if (activeSelection && onAnnotate) {
        await onAnnotate(activeSelection, commentText);
      }
    },
    [activeSelection, onAnnotate]
  );

  const handlePreviewClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!onAnnotationClick) return;
      const target = event.target as HTMLElement;
      const mark = target.closest("mark[data-annotation-id]") as HTMLElement | null;
      if (!mark) return;
      const id = mark.getAttribute("data-annotation-id");
      if (id) onAnnotationClick(id);
    },
    [onAnnotationClick]
  );

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "11px", background: "#f3f4f6", padding: "2px 6px", borderRadius: "999px", color: "#4b5563" }}>
          Rich markdown review
        </span>
        {dirty && <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600 }}>unsaved changes</span>}
        {loadingSuggestion && <span style={{ fontSize: "11px", color: "#2563eb" }}>✦ generating review…</span>}
        <button
          type="button"
          onClick={() => setShowSourceEditor((current) => !current)}
          style={{ marginLeft: "auto", padding: "6px 10px", borderRadius: "999px", border: "1px solid #d1d5db", background: showSourceEditor ? "#111827" : "#fff", color: showSourceEditor ? "#fff" : "#374151", cursor: "pointer", fontSize: "12px" }}
        >
          {showSourceEditor ? "Hide markdown source" : "Edit markdown source"}
        </button>
      </div>

      <div
        ref={previewRef}
        onMouseUp={handlePreviewMouseUp}
        onClick={handlePreviewClick}
        style={{
          width: "100%",
          minHeight: showSourceEditor ? "50vh" : "72vh",
          padding: "32px clamp(20px, 5vw, 72px)",
          border: dirty ? "1px solid #f59e0b" : "1px solid #d1d5db",
          borderRadius: "16px",
          background: dirty ? "#fffbeb" : "#fff",
          boxSizing: "border-box",
          color: "#111827",
          lineHeight: 1.75,
          fontSize: "18px",
          overflowWrap: "anywhere",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
        }}
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />

      {showSourceEditor && (
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onMouseUp={handleTextareaMouseUp}
          style={{
            width: "100%",
            minHeight: "28vh",
            marginTop: "12px",
            padding: "16px",
            border: "1px solid #d1d5db",
            borderRadius: "12px",
            resize: "vertical",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "14px",
            lineHeight: 1.6,
            background: "#fcfcfd",
            boxSizing: "border-box",
          }}
        />
      )}

      <style>{`
        .md-line { margin: 0 0 0.8em; }
        .md-paragraph { white-space: pre-wrap; }
        .md-empty { min-height: 0.9em; }
        .md-h1, .md-h2, .md-h3, .md-h4, .md-h5, .md-h6 { font-weight: 700; line-height: 1.25; margin-top: 0.35em; }
        .md-h1 { font-size: 2.1em; }
        .md-h2 { font-size: 1.75em; }
        .md-h3 { font-size: 1.45em; }
        .md-h4 { font-size: 1.25em; }
        .md-h5 { font-size: 1.1em; }
        .md-h6 { font-size: 1em; letter-spacing: 0.02em; text-transform: uppercase; color: #4b5563; }
        .md-quote { margin: 0 0 0.8em; padding-left: 1em; border-left: 3px solid #d1d5db; color: #4b5563; }
        .md-list { display: flex; gap: 0.65em; align-items: flex-start; }
        .md-bullet { min-width: 1.6em; color: #6b7280; }
        .md-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #f3f4f6; padding: 0.65em 0.8em; border-radius: 10px; white-space: pre-wrap; }
        .md-rule { border: 0; border-top: 1px solid #e5e7eb; margin: 1.2em 0; }
        .md-line code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #f3f4f6; padding: 0.1em 0.35em; border-radius: 6px; font-size: 0.9em; }
        .md-line a { color: #2563eb; text-decoration: none; }
        .md-line a:hover { text-decoration: underline; }
        .md-line mark.annotation-highlight { background: #fef3c7; color: inherit; padding: 0 2px; border-radius: 3px; border-bottom: 1px solid #f59e0b; cursor: pointer; transition: filter 120ms ease; }
        .md-line mark.annotation-highlight:hover { filter: brightness(0.96); }
        .md-line mark.annotation-highlight.focused { background: #dbeafe; border-bottom-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25); }
      `}</style>

      {activeSelection && popoverPos && (
        <SelectionPopover
          selection={activeSelection}
          position={popoverPos}
          onAction={handlePopoverAction}
          onClose={closePopover}
          loading={loadingSuggestion}
          onAnnotate={onAnnotate ? handlePopoverAnnotate : undefined}
        />
      )}
    </div>
  );
}
