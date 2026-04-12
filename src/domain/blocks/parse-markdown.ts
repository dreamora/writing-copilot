// Bead 1.2 — Markdown parser adapter
import type { Block, BlockType } from "./block";
import { generateBlockId } from "./block-id";
import { computeExcerptHash } from "./block-hash";

/**
 * Detect the BlockType for a raw block of markdown text.
 */
function detectBlockType(text: string): BlockType {
  const trimmed = text.trimStart();

  // Headings: # ... ###### ...
  if (/^#{1,6}\s/.test(trimmed)) return "heading";

  // Horizontal rule: ---, ***, ___
  if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(trimmed)) return "hr";

  // Fenced code block
  if (/^```/.test(trimmed) || /^~~~/.test(trimmed)) return "code";

  // Blockquote
  if (/^>/.test(trimmed)) return "quote";

  // HTML block
  if (/^<[a-zA-Z]/.test(trimmed)) return "html";

  // Table (pipe-separated, second line has dashes)
  const lines = trimmed.split("\n");
  if (
    lines.length >= 2 &&
    lines[0].includes("|") &&
    /^\s*\|?[\s\-:|]+\|/.test(lines[1] ?? "")
  ) {
    return "table";
  }

  // List (ordered or unordered)
  if (/^(\s*[-*+]\s|\s*\d+\.\s)/.test(trimmed)) return "list";

  return "paragraph";
}

/**
 * Split markdown into raw block strings, preserving positions.
 * Returns an array of { text, start } objects.
 *
 * Splitting rules:
 * 1. Fenced code blocks (``` or ~~~) are never split internally
 * 2. Double newline (blank line) splits paragraphs
 * 3. A heading line at the start of a chunk starts a new block
 */
function splitIntoRawBlocks(markdown: string): Array<{ text: string; start: number }> {
  const rawBlocks: Array<{ text: string; start: number }> = [];

  // We use a line-by-line approach
  const lines = markdown.split("\n");
  let pos = 0; // current char position
  let currentLines: string[] = [];
  let currentStart = 0;
  let inCodeFence = false;
  let codeFenceChar = "";

  const flush = () => {
    if (currentLines.length === 0) return;
    const text = currentLines.join("\n");
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      rawBlocks.push({ text: trimmed, start: currentStart });
    }
    currentLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineLen = line.length + 1; // +1 for \n

    if (!inCodeFence) {
      // Detect entering a code fence
      const fenceMatch = line.match(/^(`{3,}|~{3,})/);
      if (fenceMatch) {
        inCodeFence = true;
        codeFenceChar = fenceMatch[1]!.charAt(0);
        if (currentLines.length > 0) {
          flush();
          currentStart = pos;
        }
        currentLines.push(line);
        pos += lineLen;
        continue;
      }

      // Blank line → split
      if (line.trim() === "") {
        flush();
        pos += lineLen;
        currentStart = pos;
        continue;
      }

      // Heading at start of a non-empty chunk → start new block
      if (/^#{1,6}\s/.test(line) && currentLines.length > 0) {
        flush();
        currentStart = pos;
      }

      if (currentLines.length === 0) {
        currentStart = pos;
      }
      currentLines.push(line);
    } else {
      // Inside code fence
      currentLines.push(line);
      // Detect closing fence
      if (line.trim() === codeFenceChar.repeat(3) || line.startsWith(codeFenceChar.repeat(3)) && line.trim().replace(/^`+|^~+/, "").length === 0) {
        inCodeFence = false;
        codeFenceChar = "";
      }
    }

    pos += lineLen;
  }

  flush();
  return rawBlocks;
}

/**
 * Parse markdown string into an ordered array of Blocks.
 * Deterministic: same input → same output.
 */
export function parseMarkdown(markdown: string): Block[] {
  const raw = splitIntoRawBlocks(markdown);
  const blocks: Block[] = [];

  for (let i = 0; i < raw.length; i++) {
    const { text, start } = raw[i]!;
    const type = detectBlockType(text);
    const charStart = start;
    const charEnd = start + text.length;
    const excerptHash = computeExcerptHash(text);

    const partial = { index: i, type, markdown: text, charStart, charEnd, excerptHash };
    const id = generateBlockId(partial, i);

    blocks.push({ id, ...partial });
  }

  return blocks;
}
