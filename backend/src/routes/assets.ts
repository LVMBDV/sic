import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";

const here = dirname(fileURLToPath(import.meta.url));
const distRoot = resolve(here, "../../../frontend/dist");

const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

function mimeFor(p: string): string {
  if (p.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".map")) return "application/json; charset=utf-8";
  if (p.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

async function readDist(rel: string): Promise<Buffer | null> {
  const full = resolve(distRoot, rel);
  if (!full.startsWith(distRoot)) return null; // path traversal guard
  if (!existsSync(full)) return null;
  return await readFile(full);
}

export async function registerAssetRoutes(app: FastifyInstance): Promise<void> {
  app.get("/embed.js", async (_req, reply) => {
    const buf = await readDist("embed.js");
    if (!buf) return reply.code(404).send("embed.js not built");
    reply
      .headers({
        ...SECURITY_HEADERS,
        "content-type": mimeFor("embed.js"),
        "cache-control": "public, max-age=3600",
      })
      .send(buf);
  });

  app.get<{ Params: { "*": string } }>("/assets/*", async (req, reply) => {
    const sub = req.params["*"];
    const buf = await readDist(join("assets", sub));
    if (!buf) return reply.code(404).send("not found");
    reply
      .headers({
        ...SECURITY_HEADERS,
        "content-type": mimeFor(sub),
        // hashed filenames — long cache
        "cache-control": "public, max-age=31536000, immutable",
      })
      .send(buf);
  });

  app.get("/embed", async (_req, reply) => {
    const buf = await readDist("index.html");
    const body = buf ?? Buffer.from("<!doctype html><h1>widget not built</h1>");
    const frameAncestors =
      app.config.allowedOrigins.length > 0 ? app.config.allowedOrigins.join(" ") : "'self'";
    const csp = [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
      "connect-src 'self'",
      `frame-ancestors ${frameAncestors}`,
      "base-uri 'none'",
      "form-action 'self'",
    ].join("; ");
    // Allow framing per CSP frame-ancestors; suppress the global X-Frame-Options: DENY.
    reply.removeHeader("x-frame-options");
    reply
      .headers({
        ...SECURITY_HEADERS,
        "content-type": "text/html; charset=utf-8",
        "content-security-policy": csp,
      })
      .send(body);
  });
}
