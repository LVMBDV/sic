import { expect, test } from "vitest";
import { escapeHtml, fmtDate } from "./format.ts";

test("escapeHtml leaves plain text untouched", () => {
  expect(escapeHtml("hello there")).toBe("hello there");
});

test("escapeHtml neutralizes a script tag", () => {
  expect(escapeHtml("<script>alert(1)</script>")).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
});

test("escapeHtml escapes all five sensitive characters", () => {
  expect(escapeHtml(`& < > " '`)).toBe("&amp; &lt; &gt; &quot; &#39;");
});

test("escapeHtml escapes attribute-breaking quotes", () => {
  expect(escapeHtml('" onerror="alert(1)')).toBe("&quot; onerror=&quot;alert(1)");
});

test("fmtDate renders the calendar year of the timestamp", () => {
  // 2023-11-14T22:13:20Z — mid-month/mid-year so it stays 2023 in any timezone.
  expect(fmtDate(1_700_000_000)).toContain("2023");
});
