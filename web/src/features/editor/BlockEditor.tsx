// Updated BlockEditor — Phase 2: Selection + popover integration
import React, { useRef, useEffect, useCallback, useState } from "react";
import type { Block } from "../../../../src/domain/blocks/block";
import { useBlockSelection } from "./SelectionState";
import SelectionPopover from "./SelectionPopover";
import type { SuggestionActionType } from "../../../../src/domain/suggestions/suggestion-types";

interface BlockEditorProps {
  blocks: Block[];
  onBlockChange: (id: string, newMarkdown: string) => void;
  onSuggestionRequested?: (blockId: string, action: SuggestionActionType, selectedText: string, charStart: number, charEnd: number, customInstruction?: string) => void;
  dirtyIds?: Set<string>;
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
  value,
  onChange,
  isDirty,
  blockId,
  onSelectionChange,
}: {
  value: string;
  onChange: (val: string) => void;
  isDirty: boolean;
  blockId: string;
  onSelectionChange: (ref: HTMLTextAreaElement | null) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);

  useEffect(() => {
    onSelectionChange(ref.current);
  }, [blockId, onSelectionChange]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
  onSuggestionRequested,
  dirtyIds = new Set(),
}: BlockEditorProps) {
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  
  const handleChange = useCallback(
    (id: string, value: string) => {
      onBlockChange(id, value);
    },
    [onBlockChange]
  );

  const handleTextareaRef = useCallback((blockId: string, ref: HTMLTextAreaElement | null) => {
    setActiveBlockId(blockId);
  }, []);

  const renderBlock = (block: Block) => {
    const isDirty = dirtyIds.has(block.id);
    const { selection, handleSelect, clearSelection } = useBlockSelection({
      blockId: block.id,
      blockMarkdown: block.markdown,
    });

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
            <span
              style={{ fontSize: "10px", color: "#f59e0b", fontWeight: 600 }}
            >
              unsaved
            </span>
          )}
        </div>

        <AutoresizeTextarea
          value={block.markdown}
          onChange={(val) => handleChange(block.id, val)}
          isDirty={isDirty}
          blockId={block.id}
          onSelectionChange={(ref) => {
            if (ref) {
              ref.addEventListener("select", handleSelect);
              handleTextareaRef(block.id, ref);
              return () => ref.removeEventListener("select", handleSelect);
            }
          }}
        />

        <SelectionPopover
          selection={selection}
          isLoading={suggestionLoading}
          onAction={(action, customInstruction) => {
            if (selection && onSuggestionRequested) {
              setSuggestionLoading(true);
              onSuggestionRequested(
                block.id,
                action,
                selection.selectedText,
                selection.charStart,
                selection.charEnd,
                customInstruction
              );
              clearSelection();
              // Reset loading after a delay (would be reset by parent component)
              setTimeout(() => setSuggestionLoading(false), 2000);
            }
          }}
          onClose={clearSelection}
        />
      </div>
    );
  };

  if (blocks.length === 0) {
    return (
      <div style={{ color: "#9ca3af", padding: "24px", textAlign: "center" }}>
        No blocks loaded
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {blocks.map((block) => renderBlock(block))}
    </div>
  );
}
