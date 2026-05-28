import type { Config } from "./config.ts";
import type { DB } from "./db.ts";

declare module "fastify" {
  interface FastifyInstance {
    db: DB;
    config: Config;
  }
  interface FastifyRequest {
    user?: SessionClaims;
  }
}

export interface SessionClaims {
  sub: string;
  provider: string;
  name: string;
  avatar: string | null;
  iat: number;
  exp: number;
}

export interface CommentRow {
  id: string;
  thread_id: string;
  body: string;
  created_at: number;
  updated_at: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  up: number;
  user_up: number;
}

export interface CommentDTO {
  id: string;
  thread_id: string;
  body: string;
  created_at: number;
  updated_at: number;
  author: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  };
  reactions: {
    up: number;
    user_reacted: boolean;
  };
}
