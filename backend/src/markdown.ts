import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

// Comment-appropriate markdown subset: inline emphasis, links, code, blockquotes,
// and lists. No headings, no images, no raw HTML. markdown-it does the rendering
// (html: false means raw HTML in the input is never passed through); sanitize-html
// is the security boundary that constrains the output to a known-safe allowlist.

const md = new MarkdownIt({ html: false, linkify: true, breaks: true }).disable([
  "image",
  "heading",
  "lheading",
]);

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "del",
    "s",
    "code",
    "pre",
    "blockquote",
    "ul",
    "ol",
    "li",
    "a",
  ],
  allowedAttributes: { a: ["href", "rel", "target"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        rel: "nofollow ugc noopener noreferrer",
        target: "_blank",
      },
    }),
  },
};

export function renderMarkdown(raw: string): string {
  return sanitizeHtml(md.render(raw), sanitizeOptions);
}
