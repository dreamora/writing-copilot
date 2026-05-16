import { describe, it, expect } from "bun:test";
import {
  renderMarkdownToHtml,
  type AnnotationHighlight,
} from "../../web/src/features/editor/markdownPreview";

describe("renderMarkdownToHtml with annotations", () => {
  it("renders unchanged when no annotations are provided", () => {
    const md = "# Hello\n\nThis is a paragraph.";
    const without = renderMarkdownToHtml(md);
    const withEmpty = renderMarkdownToHtml(md, []);
    expect(withEmpty).toBe(without);
    expect(without).toContain("Hello");
    expect(without).not.toContain("<mark");
  });

  it("injects a <mark> with annotation-highlight class for a paragraph range", () => {
    const md = "Hello world this is fine.";
    // "world" -> offsets 6..11
    const anns: AnnotationHighlight[] = [
      { id: "ann-1", charStart: 6, charEnd: 11 },
    ];
    const html = renderMarkdownToHtml(md, anns);
    expect(html).toContain('<mark data-annotation-id="ann-1" class="annotation-highlight">world</mark>');
  });

  it("applies focused class when annotation.focused is true", () => {
    const md = "Hello world this is fine.";
    const anns: AnnotationHighlight[] = [
      { id: "ann-1", charStart: 6, charEnd: 11, focused: true },
    ];
    const html = renderMarkdownToHtml(md, anns);
    expect(html).toContain('class="annotation-highlight focused"');
  });

  it("highlights inside a heading after prefix-strip", () => {
    const md = "## My Section";
    // "Section" starts at source offset 6 ("## My ")
    const anns: AnnotationHighlight[] = [
      { id: "h1", charStart: 6, charEnd: 13 },
    ];
    const html = renderMarkdownToHtml(md, anns);
    expect(html).toContain("md-h2");
    expect(html).toContain('<mark data-annotation-id="h1"');
    expect(html).toContain(">Section</mark>");
  });

  it("highlights only the overlap on a multi-line annotation (clamps per line)", () => {
    const md = "First line\nSecond line";
    // Annotation spans "line\nSeco" -> 6..15
    const anns: AnnotationHighlight[] = [
      { id: "ann-x", charStart: 6, charEnd: 15 },
    ];
    const html = renderMarkdownToHtml(md, anns);
    // Both lines should each contain a <mark> for ann-x
    const markCount = (html.match(/<mark data-annotation-id="ann-x"/g) ?? []).length;
    expect(markCount).toBe(2);
    expect(html).toContain(">line</mark>");
    expect(html).toContain(">Seco</mark>");
  });

  it("does not interfere with inline bold/italic markdown rendering", () => {
    const md = "Hello **bold** world";
    // Highlight "bold" rendered text -> source offsets: "Hello **" is 0..8, then "bold" 8..12, then "**" 12..14
    const anns: AnnotationHighlight[] = [
      { id: "b1", charStart: 8, charEnd: 12 },
    ];
    const html = renderMarkdownToHtml(md, anns);
    expect(html).toContain("<strong>");
    expect(html).toContain('<mark data-annotation-id="b1"');
  });

  it("ignores annotations entirely outside the document", () => {
    const md = "short";
    const anns: AnnotationHighlight[] = [
      { id: "out-of-range", charStart: 100, charEnd: 200 },
    ];
    const html = renderMarkdownToHtml(md, anns);
    expect(html).not.toContain("<mark");
    expect(html).toContain("short");
  });

  it("escapes annotation ids in the data attribute", () => {
    const md = "Hello world";
    const anns: AnnotationHighlight[] = [
      { id: 'evil"id<>&', charStart: 6, charEnd: 11 },
    ];
    const html = renderMarkdownToHtml(md, anns);
    expect(html).not.toContain('id<>&"');
    expect(html).toContain('data-annotation-id="evil&quot;id&lt;&gt;&amp;"');
  });

  it("renders multiple non-overlapping annotations", () => {
    const md = "alpha beta gamma";
    // "alpha" 0..5, "gamma" 11..16
    const anns: AnnotationHighlight[] = [
      { id: "a", charStart: 0, charEnd: 5 },
      { id: "g", charStart: 11, charEnd: 16 },
    ];
    const html = renderMarkdownToHtml(md, anns);
    expect(html).toContain('<mark data-annotation-id="a"');
    expect(html).toContain('<mark data-annotation-id="g"');
    expect(html).toContain(">alpha</mark>");
    expect(html).toContain(">gamma</mark>");
  });

  it("handles list item annotations after bullet prefix-strip", () => {
    const md = "- first item\n- second item";
    // "first" -> 2..7 (after "- ")
    const anns: AnnotationHighlight[] = [
      { id: "li1", charStart: 2, charEnd: 7 },
    ];
    const html = renderMarkdownToHtml(md, anns);
    expect(html).toContain("md-list");
    expect(html).toContain('<mark data-annotation-id="li1"');
    expect(html).toContain(">first</mark>");
  });
});
