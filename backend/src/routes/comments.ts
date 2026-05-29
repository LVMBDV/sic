import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { nowUnix } from "../db.ts";
import { renderMarkdown } from "../markdown.ts";
import { checkSpam } from "../spam.ts";
import type { CommentDTO, CommentRow } from "../types.ts";

const MAX_BODY = 10_000;

function ensureThread(app: FastifyInstance, slug: string): string {
  const row = app.db.prepare("SELECT id FROM threads WHERE slug = ?").get(slug) as
    | { id: string }
    | undefined;
  if (row) return row.id;
  const id = randomUUID();
  app.db
    .prepare("INSERT INTO threads (id, slug, created_at) VALUES (?, ?, ?)")
    .run(id, slug, nowUnix());
  return id;
}

function rowToDto(r: CommentRow): CommentDTO {
  const deleted = r.deleted !== 0;
  return {
    id: r.id,
    thread_id: r.thread_id,
    parent_id: r.parent_id,
    body: deleted ? "" : r.body,
    body_html: deleted ? "" : renderMarkdown(r.body),
    created_at: r.created_at,
    updated_at: r.updated_at,
    deleted,
    author: deleted
      ? null
      : {
          id: r.user_id,
          display_name: r.display_name,
          avatar_url: r.avatar_url,
        },
    reactions: {
      up: r.up,
      down: r.down,
      score: r.up - r.down,
      user_vote: r.user_up !== 0 ? "up" : r.user_down !== 0 ? "down" : null,
    },
  };
}

export async function registerCommentRoutes(app: FastifyInstance): Promise<void> {
  // Lightweight count for host listing/index pages — no thread is created on miss,
  // so a "💬 12" badge never spawns empty threads. Returns 0 for unknown slugs.
  app.get<{ Params: { slug: string } }>("/api/threads/:slug/count", async (req) => {
    const row = app.db
      .prepare(
        `SELECT COUNT(*) AS count
           FROM comments c
           JOIN threads t ON t.id = c.thread_id
          WHERE t.slug = ? AND c.deleted = 0 AND c.hidden = 0`
      )
      .get(req.params.slug) as { count: number };
    return { thread: req.params.slug, count: row.count };
  });

  app.get<{ Params: { slug: string } }>("/api/threads/:slug/comments", async (req) => {
    const threadId = ensureThread(app, req.params.slug);
    const meId = req.user?.sub ?? "";
    const rows = app.db
      .prepare(
        `
        SELECT c.id, c.thread_id, c.parent_id, c.body, c.created_at, c.updated_at, c.deleted,
               u.id AS user_id, u.display_name, u.avatar_url,
               (SELECT COUNT(*) FROM reactions r WHERE r.comment_id = c.id AND r.kind = 'up') AS up,
               (SELECT COUNT(*) FROM reactions r WHERE r.comment_id = c.id AND r.kind = 'down') AS down,
               EXISTS(SELECT 1 FROM reactions r WHERE r.comment_id = c.id AND r.kind = 'up' AND r.user_id = ?) AS user_up,
               EXISTS(SELECT 1 FROM reactions r WHERE r.comment_id = c.id AND r.kind = 'down' AND r.user_id = ?) AS user_down
          FROM comments c
          JOIN users u ON u.id = c.user_id
         WHERE c.thread_id = ? AND c.hidden = 0
         ORDER BY c.created_at ASC
        `
      )
      .all(meId, meId, threadId) as unknown as CommentRow[];

    return { thread: req.params.slug, comments: rows.map(rowToDto) };
  });

  app.post<{
    Params: { slug: string };
    Body: { body: string; website?: string; parent_id?: string };
  }>(
    "/api/threads/:slug/comments",
    {
      schema: {
        body: {
          type: "object",
          required: ["body"],
          properties: {
            body: { type: "string", minLength: 1, maxLength: MAX_BODY },
            website: { type: "string", maxLength: 0 },
            parent_id: { type: "string" },
          },
        },
      },
    },
    async (req, reply) => {
      if (!req.user) return reply.code(401).send({ error: "unauthorized" });
      const body = req.body.body.trim();
      const reason = checkSpam(body, req.body.website ?? "");
      if (reason) return reply.code(400).send({ error: `spam:${reason}` });

      const threadId = ensureThread(app, req.params.slug);

      const parentId = req.body.parent_id ?? null;
      if (parentId) {
        const parent = app.db
          .prepare("SELECT thread_id FROM comments WHERE id = ?")
          .get(parentId) as { thread_id: string } | undefined;
        if (!parent || parent.thread_id !== threadId) {
          return reply.code(400).send({ error: "invalid_parent" });
        }
      }

      const id = randomUUID();
      const now = nowUnix();

      app.db
        .prepare(
          "INSERT INTO comments (id, thread_id, parent_id, user_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run(id, threadId, parentId, req.user.sub, body, now, now);

      const dto: CommentDTO = {
        id,
        thread_id: threadId,
        parent_id: parentId,
        body,
        body_html: renderMarkdown(body),
        created_at: now,
        updated_at: now,
        deleted: false,
        author: {
          id: req.user.sub,
          display_name: req.user.name,
          avatar_url: req.user.avatar,
        },
        reactions: { up: 0, down: 0, score: 0, user_vote: null },
      };
      return dto;
    }
  );

  app.delete<{ Params: { id: string } }>("/api/comments/:id", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "unauthorized" });
    const owner = app.db.prepare("SELECT user_id FROM comments WHERE id = ?").get(req.params.id) as
      | { user_id: string }
      | undefined;
    if (!owner) return reply.code(404).send({ error: "not_found" });
    if (owner.user_id !== req.user.sub) return reply.code(403).send({ error: "forbidden" });

    app.db
      .prepare("UPDATE comments SET deleted = 1, body = '', updated_at = ? WHERE id = ?")
      .run(nowUnix(), req.params.id);
    return reply.code(204).send();
  });
}
