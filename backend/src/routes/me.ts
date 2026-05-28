import type { FastifyInstance } from "fastify";

export async function registerMeRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/me", async (req) => {
    if (!req.user) return null;
    return {
      id: req.user.sub,
      provider: req.user.provider,
      display_name: req.user.name,
      avatar_url: req.user.avatar,
    };
  });
}
