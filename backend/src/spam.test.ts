import { expect, test } from "vitest";
import { checkSpam } from "./spam.ts";

test("accepts normal text", () => {
  expect(checkSpam("hello there", "")).toBe(null);
});

test("rejects honeypot", () => {
  expect(checkSpam("hi", "bot")).toBe("honeypot_triggered");
});

test("rejects link flood", () => {
  const body = "http://a http://b http://c http://d http://e http://f";
  expect(checkSpam(body, "")).toBe("too_many_links");
});

test("rejects excessive caps", () => {
  const body = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  expect(checkSpam(body, "")).toBe("excessive_caps");
});
