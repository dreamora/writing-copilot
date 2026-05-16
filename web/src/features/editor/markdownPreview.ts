/**
 * Markdown preview renderer with optional annotation highlight injection.
 *
 * Annotations carry document-global source offsets (charStart/charEnd into the
 * raw markdown string). To render highlights without corrupting inline
 * markdown processing, we inject sentinel markers into the visible text
 * BEFORE `renderInlineMarkdown` runs, then swap the sentinels for real
 * `<mark>` tags AFTER inline rendering. The sentinel characters (U+0001 and
 * U+0002) survive HTML escaping and do not match any markdown regex.
 */

const ANN_START = "\u0001"; // followed by `${id}|${focused?'1':'0'}` then ANN_SEP
const ANN_SEP = "\u0002";
const ANN_END = "\u0003";

export interface AnnotationHighlight {
  id: string;
  charStart: number;
  charEnd: number;
  focused?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(input: string): string {
  let html = escapeHtml(input);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/_([^_]+)_/g, "<em>$1</em>");
  html = html.replace(/~~([^~]+)~~/g, "<s>$1</s>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  return html;
}

/**
 * Replace sentinel-wrapped highlight markers with `<mark>` tags.
 * Sentinel form: ANN_START + id + ANN_SEP + (0|1) + ANN_SEP + ... + ANN_END
 */
function replaceHighlightSentinels(html: string): string {
  // Sentinels are inserted BEFORE renderInlineMarkdown runs, so by the time
  // we run, the captured id has already been HTML-escaped by escapeHtml().
  // Using it as an attribute value (inside double-quotes) is safe; no
  // additional escaping needed.
  const pattern = new RegExp(
    `${ANN_START}([^${ANN_SEP}]*)${ANN_SEP}([01])${ANN_SEP}([\\s\\S]*?)${ANN_END}`,
    "g",
  );
  return html.replace(pattern, (_match, id: string, focused: string, body: string) => {
    const cls = focused === "1" ? "annotation-highlight focused" : "annotation-highlight";
    return `<mark data-annotation-id="${id}" class="${cls}">${body}</mark>`;
  });
}

function stripLinePrefix(line: string): { visible: string; kind: string } {
  if (/^```/.test(line)) return { visible: line.replace(/^```\w*\s*/, ""), kind: "code" };
  if (/^#{1,6}\s+/.test(line)) return { visible: line.replace(/^#{1,6}\s+/, ""), kind: "heading" };
  if (/^>\s?/.test(line)) return { visible: line.replace(/^>\s?/, ""), kind: "quote" };
  if (/^[-*+]\s+/.test(line)) return { visible: line.replace(/^[-*+]\s+/, ""), kind: "ul" };
  if (/^\d+\.\s+/.test(line)) return { visible: line.replace(/^\d+\.\s+/, ""), kind: "ol" };
  return { visible: line, kind: "paragraph" };
}

/**
 * Inject annotation sentinel markers into `visible` text. Offsets in
 * `annotations` are document-global; `visibleStart` is the source offset
 * where this line's visible text begins. Output retains line-local
 * positions and is safe to pass to `renderInlineMarkdown` because the
 * sentinel characters survive HTML escaping unchanged.
 */
function injectHighlightSentinels(
  visible: string,
  visibleStart: number,
  annotations: AnnotationHighlight[],
): string {
  const visibleEnd = visibleStart + visible.length;
  // Build sorted list of cuts: [position-in-visible, kind, id, focused]
  type Cut = { pos: number; kind: "start" | "end"; id: string; focused: boolean };
  const cuts: Cut[] = [];
  for (const ann of annotations) {
    if (ann.charEnd <= visibleStart || ann.charStart >= visibleEnd) continue;
    const start = Math.max(0, ann.charStart - visibleStart);
    const end = Math.min(visible.length, ann.charEnd - visibleStart);
    if (end <= start) continue;
    cuts.push({ pos: start, kind: "start", id: ann.id, focused: !!ann.focused });
    cuts.push({ pos: end, kind: "end", id: ann.id, focused: !!ann.focused });
  }
  if (cuts.length === 0) return visible;
  // Sort: end-cuts before start-cuts at same pos (so adjacent annotations close before opening)
  cuts.sort((a, b) => a.pos - b.pos || (a.kind === "end" ? -1 : 1));
  let out = "";
  let cursor = 0;
  for (const cut of cuts) {
    out += visible.slice(cursor, cut.pos);
    if (cut.kind === "start") {
      out += `${ANN_START}${cut.id}${ANN_SEP}${cut.focused ? "1" : "0"}${ANN_SEP}`;
    } else {
      out += ANN_END;
    }
    cursor = cut.pos;
  }
  out += visible.slice(cursor);
  return out;
}

interface LineContext {
  sourceStart: number;
  visibleStart: number;
  annotations: AnnotationHighlight[];
}

function renderLine(line: string, ctx: LineContext): string {
  if (!line.trim()) return '<div class="md-line md-empty"><br /></div>';
  if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
    return '<hr class="md-rule" />';
  }

  const renderInline = (text: string, visibleStartInLine: number): string => {
    const injected = injectHighlightSentinels(
      text,
      ctx.visibleStart + visibleStartInLine,
      ctx.annotations,
    );
    return replaceHighlightSentinels(renderInlineMarkdown(injected));
  };

  const heading = line.match(/^(#{1,6})\s+(.*)$/);
  if (heading) {
    const level = Math.min(6, heading[1].length);
    return `<div class="md-line md-h${level}">${renderInline(heading[2], 0)}</div>`;
  }

  const quote = line.match(/^>\s?(.*)$/);
  if (quote) {
    return `<blockquote class="md-line md-quote">${renderInline(quote[1], 0)}</blockquote>`;
  }

  const ul = line.match(/^[-*+]\s+(.*)$/);
  if (ul) {
    return `<div class="md-line md-list"><span class="md-bullet">•</span><span>${renderInline(ul[1], 0)}</span></div>`;
  }

  const ol = line.match(/^(\d+)\.\s+(.*)$/);
  if (ol) {
    return `<div class="md-line md-list"><span class="md-bullet">${escapeHtml(ol[1])}.</span><span>${renderInline(ol[2], 0)}</span></div>`;
  }

  if (/^```/.test(line)) {
    return `<div class="md-line md-code">${renderInline(line.replace(/^```\w*\s*/, ""), 0)}</div>`;
  }

  return `<div class="md-line md-paragraph">${renderInline(line, 0)}</div>`;
}

export function renderMarkdownToHtml(
  markdown: string,
  annotations?: AnnotationHighlight[],
): string {
  const anns = annotations ?? [];
  const lines = markdown.split("\n");
  const out: string[] = [];
  let sourceOffset = 0;
  for (const line of lines) {
    const { visible } = stripLinePrefix(line);
    const visibleStart = sourceOffset + (line.length - visible.length);
    out.push(renderLine(line, { sourceStart: sourceOffset, visibleStart, annotations: anns }));
    sourceOffset += line.length + 1; // +1 for the "\n" that split() consumed
  }
  return out.join("");
}

export function buildMarkdownTextMap(markdown: string): { plainText: string; sourceIndices: number[] } {
  const sourceIndices: number[] = [];
  let plainText = "";

  const appendChar = (char: string, sourceIndex: number) => {
    plainText += char;
    sourceIndices.push(sourceIndex);
  };

  const lines = markdown.split("\n");
  let sourceOffset = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? "";
    const { visible } = stripLinePrefix(line);
    const lineStart = sourceOffset + Math.max(0, line.length - visible.length);

    let i = 0;
    while (i < visible.length) {
      const rest = visible.slice(i);
      const imageMatch = rest.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (imageMatch) {
        const alt = imageMatch[1] ?? "";
        for (let j = 0; j < alt.length; j += 1) appendChar(alt[j]!, lineStart + i + j + 2);
        i += imageMatch[0].length;
        continue;
      }

      const linkMatch = rest.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const label = linkMatch[1] ?? "";
        for (let j = 0; j < label.length; j += 1) appendChar(label[j]!, lineStart + i + j + 1);
        i += linkMatch[0].length;
        continue;
      }

      const codeMatch = rest.match(/^`([^`]+)`/);
      if (codeMatch) {
        const code = codeMatch[1] ?? "";
        for (let j = 0; j < code.length; j += 1) appendChar(code[j]!, lineStart + i + j + 1);
        i += codeMatch[0].length;
        continue;
      }

      const doubleMarker = rest.match(/^(\*\*|__|~~)/);
      if (doubleMarker) {
        i += doubleMarker[0].length;
        continue;
      }

      if (/[`*_~]/.test(rest[0] ?? "")) {
        i += 1;
        continue;
      }

      appendChar(visible[i]!, lineStart + i);
      i += 1;
    }

    if (lineIndex < lines.length - 1) {
      appendChar("\n", sourceOffset + line.length);
    }

    sourceOffset += line.length + 1;
  }

  return { plainText, sourceIndices };
}
