// Bead 1.5 — Web editor block surface
import React, { useRef, useEffect, useCallback } from "react";
import type { Block } from "../../../../src/domain/blocks/block";

interface BlockEditorProps {
  blocks: Block[];
  onBlockChange: (id: string, newMarkdown: string) => void;
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
}: {
  value: string;
  onChange: (val: string) => void;
  isDirty: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);

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
  dirtyIds = new Set(),
}: BlockEditorProps) {
  const handleChange = useCallback(
    (id: string, value: string) => {
      onBlockChange(id, value);
    },
    [onBlockChange]
  );

  if (blocks.length === 0) {
    return (
      <div style={{ color: "#9ca3af", padding: "24px", textAlign: "center" }}>
        No blocks loaded
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {blocks.map((block) => {
        const isDirty = dirtyIds.has(block.id);
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
            />
          </div>
        );
      })}
    </div>
  );
}
