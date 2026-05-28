import { SignJWT, jwtVerify } from 'jose';
import type { FastifyReply } from 'fastify';
import type { Config } from '../config.ts';
import type { SessionClaims } from '../types.ts';

export const COOKIE_NAME = 'sic_session';
export const SESSION_TTL_SECS = 60 * 60 * 24 * 30; // 30 days

export async function issueSession(
  config: Config,
  user: { id: string; provider: string; displayName: string; avatarUrl: string | null },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({
    provider: user.provider,
    name: user.displayName,
    avatar: user.avatarUrl,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_TTL_SECS)
    .sign(config.sessionSecret);
}

export async function verifySession(config: Config, token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, config.sessionSecret, {
      clockTolerance: 30,
    });
    if (typeof payload.sub !== 'string') return null;
    return {
      sub: payload.sub,
      provider: String(payload['provider'] ?? ''),
      name: String(payload['name'] ?? ''),
      avatar: (payload['avatar'] as string | null) ?? null,
      iat: Number(payload.iat ?? 0),
      exp: Number(payload.exp ?? 0),
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(reply: FastifyReply, token: string, secure: boolean): void {
  reply.setCookie(COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: SESSION_TTL_SECS,
  });
}

export function clearSessionCookie(reply: FastifyReply, secure: boolean): void {
  reply.clearCookie(COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
  });
}
