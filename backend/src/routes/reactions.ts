import type { FastifyInstance } from "fastify";
import { nowUnix } from "../db.ts";

const KINDS = new Set(["up", "down"]);
const opposite = (kind: string): string => (kind === "up" ? "down" : "up");

export async function registerReactionRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { id: string; kind: string } }>(
    "/api/comments/:id/reactions/:kind",
    async (req, reply) => {
      if (!req.user) return reply.code(401).send({ error: "unauthorized" });
      if (!KINDS.has(req.params.kind)) {
        return reply.code(400).send({ error: "unknown_kind" });
      }
      const exists = app.db
        .prepare("SELECT 1 FROM comments WHERE id = ? AND deleted = 0")
        .get(req.params.id);
      if (!exists) return reply.code(404).send({ error: "not_found" });

      // up/down are mutually exclusive: casting one clears the other.
      app.db
        .prepare("DELETE FROM reactions WHERE comment_id = ? AND user_id = ? AND kind = ?")
        .run(req.params.id, req.user.sub, opposite(req.params.kind));
      app.db
        .prepare(
          "INSERT OR IGNORE INTO reactions (comment_id, user_id, kind, created_at) VALUES (?, ?, ?, ?)"
        )
        .run(req.params.id, req.user.sub, req.params.kind, nowUnix());
      return reply.code(204).send();
    }
  );

  app.delete<{ Params: { id: string; kind: string } }>(
    "/api/comments/:id/reactions/:kind",
    async (req, reply) => {
      if (!req.user) return reply.code(401).send({ error: "unauthorized" });
      if (!KINDS.has(req.params.kind)) {
        return reply.code(400).send({ error: "unknown_kind" });
      }
      app.db
        .prepare("DELETE FROM reactions WHERE comment_id = ? AND user_id = ? AND kind = ?")
        .run(req.params.id, req.user.sub, req.params.kind);
      return reply.code(204).send();
    }
  );
}
