// Bead 1.1 — Block domain model

export type BlockType =
  | "heading"
  | "paragraph"
  | "list"
  | "quote"
  | "code"
  | "hr"
  | "table"
  | "html";

export interface Block {
  /** Deterministic stable ID */
  id: string;
  /** 0-based position in document */
  index: number;
  /** Semantic block type */
  type: BlockType;
  /** Raw markdown content of this block */
  markdown: string;
  /** Character start offset in the original document string */
  charStart: number;
  /** Character end offset (exclusive) in the original document string */
  charEnd: number;
  /** SHA-256 of first 80 chars of markdown, truncated to 16 hex chars */
  excerptHash: string;
}

export type PartialBlock = Omit<Block, "id">;
