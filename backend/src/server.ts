import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import Fastify from "fastify";

import { registerAuthRoutes } from "./auth/oauth.ts";
import { loadConfig } from "./config.ts";
import { openDb } from "./db.ts";
import { registerAssetRoutes } from "./routes/assets.ts";
import { registerCommentRoutes } from "./routes/comments.ts";
import { registerMeRoutes } from "./routes/me.ts";
import { registerReactionRoutes } from "./routes/reactions.ts";
import "./types.ts";

const config = loadConfig();
const db = openDb(config.databaseUrl);

const app = Fastify({
  logger: { level: config.logLevel },
  trustProxy: true,
  disableRequestLogging: false,
});

app.decorate("config", config);
app.decorate("db", db);

await app.register(sensible);
await app.register(cookie);
await app.register(cors, {
  origin: config.allowedOrigins.length > 0 ? config.allowedOrigins : false,
  credentials: true,
});
await app.register(rateLimit, {
  max: 60,
  timeWindow: "1 minute",
  // Don't rate-limit GETs of the widget; focus on writes.
  allowList: (req) => req.method === "GET",
});

app.addHook("onSend", async (_req, reply) => {
  reply.header("x-frame-options", "DENY"); // overridden for /embed inside assets.ts via CSP
  reply.header("strict-transport-security", "max-age=31536000; includeSubDomains");
});

app.get("/healthz", async () => ({ ok: true }));

await registerAuthRoutes(app);
await registerCommentRoutes(app);
await registerReactionRoutes(app);
await registerMeRoutes(app);
await registerAssetRoutes(app);

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutdown signal received");
  try {
    await app.close();
    db.close();
  } finally {
    process.exit(0);
  }
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ host: config.bind.host, port: config.bind.port });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
