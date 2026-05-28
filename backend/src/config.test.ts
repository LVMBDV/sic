import { afterEach, beforeEach, expect, test } from "vitest";
import { loadConfig } from "./config.ts";

const SECRET = "x".repeat(32);

let saved: NodeJS.ProcessEnv;

beforeEach(() => {
  saved = process.env;
  // Start each test from a clean slate so leaked vars can't mask a bug.
  process.env = {};
});

afterEach(() => {
  process.env = saved;
});

test("throws when the session secret is missing", () => {
  process.env.SIC_PUBLIC_URL = "https://c.example";
  expect(() => loadConfig()).toThrow(/SIC_SESSION_SECRET/);
});

test("throws when the session secret is too short", () => {
  process.env.SIC_PUBLIC_URL = "https://c.example";
  process.env.SIC_SESSION_SECRET = "short";
  expect(() => loadConfig()).toThrow(/at least 32/);
});

test("throws when the public URL is missing", () => {
  process.env.SIC_SESSION_SECRET = SECRET;
  expect(() => loadConfig()).toThrow(/SIC_PUBLIC_URL/);
});

test("defaults bind to 127.0.0.1:6767", () => {
  process.env.SIC_SESSION_SECRET = SECRET;
  process.env.SIC_PUBLIC_URL = "https://c.example";
  const cfg = loadConfig();
  expect(cfg.bind).toEqual({ host: "127.0.0.1", port: 6767 });
});

test("parses host and port from SIC_BIND on the last colon", () => {
  process.env.SIC_SESSION_SECRET = SECRET;
  process.env.SIC_PUBLIC_URL = "https://c.example";
  process.env.SIC_BIND = "0.0.0.0:8080";
  expect(loadConfig().bind).toEqual({ host: "0.0.0.0", port: 8080 });
});

test("leaves OAuth providers undefined unless both id and secret are set", () => {
  process.env.SIC_SESSION_SECRET = SECRET;
  process.env.SIC_PUBLIC_URL = "https://c.example";
  process.env.SIC_GITHUB_CLIENT_ID = "id-only";
  const cfg = loadConfig();
  expect(cfg.github).toBeUndefined();
  expect(cfg.google).toBeUndefined();
});

test("builds the GitHub provider when both halves are present", () => {
  process.env.SIC_SESSION_SECRET = SECRET;
  process.env.SIC_PUBLIC_URL = "https://c.example";
  process.env.SIC_GITHUB_CLIENT_ID = "gh-id";
  process.env.SIC_GITHUB_CLIENT_SECRET = "gh-secret";
  expect(loadConfig().github).toEqual({ clientId: "gh-id", clientSecret: "gh-secret" });
});

test("splits and trims the allowed-origins list, dropping empties", () => {
  process.env.SIC_SESSION_SECRET = SECRET;
  process.env.SIC_PUBLIC_URL = "https://c.example";
  process.env.SIC_ALLOWED_ORIGINS = "https://a.example, https://b.example ,";
  expect(loadConfig().allowedOrigins).toEqual(["https://a.example", "https://b.example"]);
});
