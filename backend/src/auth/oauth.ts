import { GitHub, Google, generateState, generateCodeVerifier } from 'arctic';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { nowUnix } from '../db.ts';
import {
  issueSession,
  setSessionCookie,
  clearSessionCookie,
  verifySession,
  COOKIE_NAME,
} from './session.ts';

type ProviderName = 'github' | 'google';

interface OAuthProfile {
  providerUserId: string;
  displayName: string;
  avatarUrl: string | null;
}

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  const { config } = app;

  const providers: Partial<Record<ProviderName, { client: GitHub | Google }>> = {};
  if (config.github) {
    providers.github = {
      client: new GitHub(
        config.github.clientId,
        config.github.clientSecret,
        `${config.publicUrl}/auth/github/callback`,
      ),
    };
  }
  if (config.google) {
    providers.google = {
      client: new Google(
        config.google.clientId,
        config.google.clientSecret,
        `${config.publicUrl}/auth/google/callback`,
      ),
    };
  }

  app.get<{
    Params: { provider: ProviderName };
    Querystring: { return_to?: string };
  }>('/auth/:provider/login', async (req, reply) => {
    const p = providers[req.params.provider];
    if (!p) return reply.callNotFound();

    const state = generateState();
    const verifier = generateCodeVerifier();

    let url: URL;
    if (req.params.provider === 'github') {
      url = (p.client as GitHub).createAuthorizationURL(state, ['read:user']);
    } else {
      url = (p.client as Google).createAuthorizationURL(state, verifier, [
        'openid',
        'email',
        'profile',
      ]);
    }

    app.db
      .prepare(
        'INSERT INTO oauth_state (state, provider, pkce_verifier, return_to, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(state, req.params.provider, verifier, req.query.return_to ?? null, nowUnix());

    return reply.redirect(url.toString());
  });

  app.get<{
    Params: { provider: ProviderName };
    Querystring: { code?: string; state?: string };
  }>('/auth/:provider/callback', async (req, reply) => {
    const p = providers[req.params.provider];
    if (!p) return reply.callNotFound();

    const { code, state } = req.query;
    if (!code || !state) return reply.code(400).send({ error: 'missing_params' });

    const row = app.db
      .prepare(
        'SELECT pkce_verifier, return_to, created_at FROM oauth_state WHERE state = ? AND provider = ?',
      )
      .get(state, req.params.provider) as
      | { pkce_verifier: string; return_to: string | null; created_at: number }
      | undefined;

    if (!row) return reply.code(401).send({ error: 'invalid_state' });

    app.db.prepare('DELETE FROM oauth_state WHERE state = ?').run(state);
    if (nowUnix() - row.created_at > 600) {
      return reply.code(401).send({ error: 'state_expired' });
    }

    let accessToken: string;
    try {
      if (req.params.provider === 'github') {
        const tokens = await (p.client as GitHub).validateAuthorizationCode(code);
        accessToken = tokens.accessToken();
      } else {
        const tokens = await (p.client as Google).validateAuthorizationCode(code, row.pkce_verifier);
        accessToken = tokens.accessToken();
      }
    } catch (e) {
      app.log.warn({ err: e }, 'oauth token exchange failed');
      return reply.code(401).send({ error: 'token_exchange_failed' });
    }

    const profile = await fetchProfile(req.params.provider, accessToken);

    const existing = app.db
      .prepare('SELECT id FROM users WHERE provider = ? AND provider_user_id = ?')
      .get(req.params.provider, profile.providerUserId) as { id: string } | undefined;

    let userId: string;
    if (existing) {
      userId = existing.id;
      app.db
        .prepare('UPDATE users SET display_name = ?, avatar_url = ? WHERE id = ?')
        .run(profile.displayName, profile.avatarUrl, userId);
    } else {
      userId = randomUUID();
      app.db
        .prepare(
          'INSERT INTO users (id, provider, provider_user_id, display_name, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(
          userId,
          req.params.provider,
          profile.providerUserId,
          profile.displayName,
          profile.avatarUrl,
          nowUnix(),
        );
    }

    const token = await issueSession(config, {
      id: userId,
      provider: req.params.provider,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    });

    const secure = config.publicUrl.startsWith('https://');
    setSessionCookie(reply, token, secure);

    const target = row.return_to ?? `${config.publicUrl}/embed`;
    return reply.redirect(target, 303);
  });

  app.post('/auth/logout', async (_req, reply) => {
    const secure = config.publicUrl.startsWith('https://');
    clearSessionCookie(reply, secure);
    return reply.code(204).send();
  });

  // Decode session cookie on every request and stash on req.user
  app.addHook('onRequest', async (req) => {
    const token = req.cookies[COOKIE_NAME];
    if (!token) return;
    const claims = await verifySession(config, token);
    if (claims) req.user = claims;
  });
}

async function fetchProfile(provider: ProviderName, accessToken: string): Promise<OAuthProfile> {
  if (provider === 'github') {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: 'application/vnd.github+json',
        'user-agent': 'sic',
      },
    });
    if (!res.ok) throw new Error(`github user: ${res.status}`);
    const u = (await res.json()) as {
      id: number;
      login: string;
      name: string | null;
      avatar_url: string | null;
    };
    return {
      providerUserId: String(u.id),
      displayName: u.name ?? u.login,
      avatarUrl: u.avatar_url,
    };
  } else {
    const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`google user: ${res.status}`);
    const u = (await res.json()) as {
      sub: string;
      name?: string;
      email?: string;
      picture?: string;
    };
    return {
      providerUserId: u.sub,
      displayName: u.name ?? u.email ?? 'user',
      avatarUrl: u.picture ?? null,
    };
  }
}
