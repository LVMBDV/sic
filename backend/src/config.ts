function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

function optional(key: string): string | undefined {
  const v = process.env[key];
  return v && v.length > 0 ? v : undefined;
}

function oauthPair(idKey: string, secretKey: string) {
  const clientId = optional(idKey);
  const clientSecret = optional(secretKey);
  if (!clientId || !clientSecret) return undefined;
  return { clientId, clientSecret };
}

export interface Config {
  bind: { host: string; port: number };
  publicUrl: string;
  databaseUrl: string;
  sessionSecret: Uint8Array;
  allowedOrigins: string[];
  github: { clientId: string; clientSecret: string } | undefined;
  google: { clientId: string; clientSecret: string } | undefined;
  logLevel: string;
}

export function loadConfig(): Config {
  const bindRaw = process.env.SIC_BIND ?? '127.0.0.1:6767';
  const lastColon = bindRaw.lastIndexOf(':');
  if (lastColon < 0) throw new Error(`Invalid SIC_BIND: ${bindRaw}`);
  const host = bindRaw.slice(0, lastColon);
  const port = Number(bindRaw.slice(lastColon + 1));
  if (!Number.isFinite(port)) throw new Error(`Invalid port in SIC_BIND: ${bindRaw}`);

  const sessionSecretRaw = required('SIC_SESSION_SECRET');
  if (sessionSecretRaw.length < 32) {
    throw new Error('SIC_SESSION_SECRET must be at least 32 chars');
  }

  return {
    bind: { host, port },
    publicUrl: required('SIC_PUBLIC_URL'),
    databaseUrl: process.env.DATABASE_URL ?? 'sic.db',
    sessionSecret: new TextEncoder().encode(sessionSecretRaw),
    allowedOrigins: (process.env.SIC_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    github: oauthPair('SIC_GITHUB_CLIENT_ID', 'SIC_GITHUB_CLIENT_SECRET'),
    google: oauthPair('SIC_GOOGLE_CLIENT_ID', 'SIC_GOOGLE_CLIENT_SECRET'),
    logLevel: process.env.LOG_LEVEL ?? 'info',
  };
}
