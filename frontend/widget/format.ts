// Pure rendering helpers, kept separate from main.ts so they're unit-testable
// without standing up the DOM.

export function fmtDate(unix: number): string {
  return new Date(unix * 1000).toLocaleString();
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
