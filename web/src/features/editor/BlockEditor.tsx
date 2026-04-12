// Bead 1.5 + 2.1 — Block editor with selection capture
import React, { useRef, useEffect, useCallback, useState } from "react";
import type { Block } from "../../../../src/domain/blocks/block";
import type { SuggestionActionType } from "../../../../src/domain/suggestions/suggestion-types";
import { captureSelection, computePopoverPosition } from "./SelectionState";
import type { SelectionSpan, PopoverPosition } from "./SelectionState";
import SelectionPopover from "./SelectionPopover";

interface BlockEditorProps {
  blocks: Block[];
  onBlockChange: (id: string, newMarkdown: string) => void;
  dirtyIds?: Set<string>;
  onRequestSuggestion?: (
    blockId: string,
    selection: SelectionSpan,
    actionType: SuggestionActionType,
    customInstruction?: string
  ) => void;
  loadingSuggestionBlockId?: string;
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  heading: "H",
  paragraph: "¶",
  list: "•",
  quote: "»",
  code: "</>",
  hr: "—",
  table: "⊞",
  html: "HTML",
};

function AutoresizeTextarea({
  blockId,
  value,
  onChange,
  isDirty,
  onSelectionCapture,
}: {
  blockId: string;
  value: string;
  onChange: (val: string) => void;
  isDirty: boolean;
  onSelectionCapture: (span: SelectionSpan, pos: PopoverPosition) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);

  const handleMouseUp = () => {
    if (!ref.current) return;
    const span = captureSelection(blockId, ref.current);
    if (span) {
      const pos = computePopoverPosition(ref.current);
      onSelectionCapture(span, pos);
    }
  };

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onMouseUp={handleMouseUp}
      style={{
        width: "100%",
        fontFamily: "monospace",
        fontSize: "14px",
        padding: "8px",
        border: isDirty ? "1px solid #f59e0b" : "1px solid #d1d5db",
        borderRadius: "4px",
        resize: "none",
        overflow: "hidden",
        background: isDirty ? "#fffbeb" : "#fff",
        boxSizing: "border-box",
      }}
    />
  );
}

export default function BlockEditor({
  blocks,
  onBlockChange,
  dirtyIds = new Set(),
  onRequestSuggestion,
  loadingSuggestionBlockId,
}: BlockEditorProps) {
  const [activeSelection, setActiveSelection] = useState<SelectionSpan | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPosition | null>(null);

  const handleChange = useCallback(
    (id: string, value: string) => {
      onBlockChange(id, value);
    },
    [onBlockChange]
  );

  const handleSelectionCapture = useCallback(
    (span: SelectionSpan, pos: PopoverPosition) => {
      setActiveSelection(span);
      setPopoverPos(pos);
    },
    []
  );

  const handlePopoverAction = useCallback(
    (actionType: SuggestionActionType, customInstruction?: string) => {
      if (activeSelection && onRequestSuggestion) {
        onRequestSuggestion(
          activeSelection.blockId,
          activeSelection,
          actionType,
          customInstruction
        );
      }
      setActiveSelection(null);
      setPopoverPos(null);
    },
    [activeSelection, onRequestSuggestion]
  );

  const closePopover = useCallback(() => {
    setActiveSelection(null);
    setPopoverPos(null);
  }, []);

  if (blocks.length === 0) {
    return (
      <div style={{ color: "#9ca3af", padding: "24px", textAlign: "center" }}>
        No blocks loaded
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative" }}>
      {blocks.map((block) => {
        const isDirty = dirtyIds.has(block.id);
        const isLoadingSuggestion = loadingSuggestionBlockId === block.id;
        return (
          <div key={block.id} style={{ position: "relative" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  background: "#f3f4f6",
                  padding: "2px 6px",
                  borderRadius: "3px",
                  color: "#6b7280",
                  fontFamily: "monospace",
                }}
              >
                {BLOCK_TYPE_LABELS[block.type] ?? block.type}
              </span>
              <span style={{ fontSize: "10px", color: "#d1d5db" }}>
                #{block.index + 1}
              </span>
              {isDirty && (
                <span style={{ fontSize: "10px", color: "#f59e0b", fontWeight: 600 }}>
                  unsaved
                </span>
              )}
              {isLoadingSuggestion && (
                <span style={{ fontSize: "10px", color: "#3b82f6" }}>
                  ✦ getting suggestion…
                </span>
              )}
            </div>
            <AutoresizeTextarea
              blockId={block.id}
              value={block.markdown}
              onChange={(val) => handleChange(block.id, val)}
              isDirty={isDirty}
              onSelectionCapture={handleSelectionCapture}
            />
          </div>
        );
      })}

      {/* Selection popover — rendered at document level */}
      {activeSelection && popoverPos && (
        <SelectionPopover
          selection={activeSelection}
          position={popoverPos}
          onAction={handlePopoverAction}
          onClose={closePopover}
          loading={loadingSuggestionBlockId === activeSelection.blockId}
        />
      )}
    </div>
  );
}
