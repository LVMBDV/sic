import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown.ts";

describe("renderMarkdown", () => {
  it("renders basic emphasis", () => {
    expect(renderMarkdown("**bold** and _italic_")).toContain("<strong>bold</strong>");
    expect(renderMarkdown("**bold** and _italic_")).toContain("<em>italic</em>");
  });

  it("renders lists, blockquotes, and code", () => {
    expect(renderMarkdown("- a\n- b")).toContain("<ul>");
    expect(renderMarkdown("> quote")).toContain("<blockquote>");
    expect(renderMarkdown("`inline`")).toContain("<code>inline</code>");
    expect(renderMarkdown("```\nblock\n```")).toContain("<pre>");
  });

  it("hardens links with rel and target", () => {
    const html = renderMarkdown("[x](https://example.com)");
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('rel="nofollow ugc noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it("auto-links bare urls", () => {
    expect(renderMarkdown("see https://example.com")).toContain('href="https://example.com"');
  });

  it("strips raw HTML", () => {
    const html = renderMarkdown("<script>alert(1)</script>hi");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("alert(1)</script");
  });

  it("drops img with onerror payloads", () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)">');
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img"); // escaped to inert text, not a live element
  });

  it("neutralizes javascript: links", () => {
    const html = renderMarkdown("[click](javascript:alert(1))");
    expect(html).not.toContain("<a"); // left as plain text, no anchor created
    expect(html).not.toContain('href="javascript');
  });

  it("does not render image syntax as <img>", () => {
    expect(renderMarkdown("![alt](https://example.com/a.png)")).not.toContain("<img");
  });

  it("does not render headings", () => {
    const html = renderMarkdown("# Heading");
    expect(html).not.toContain("<h1");
  });
});
