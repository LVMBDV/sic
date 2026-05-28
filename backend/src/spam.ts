/**
 * Heuristic spam check. Returns null when OK, or a reason string when rejected.
 */
export function checkSpam(body: string, honeypot: string): string | null {
  if (honeypot.length > 0) return "honeypot_triggered";
  const trimmed = body.trim();
  if (trimmed.length === 0) return "empty_body";
  if (trimmed.length > 10_000) return "body_too_long";

  const linkCount = (trimmed.match(/https?:\/\//g) ?? []).length;
  if (linkCount > 5) return "too_many_links";

  const letters = (trimmed.match(/\p{L}/gu) ?? []).length;
  const upper = (trimmed.match(/\p{Lu}/gu) ?? []).length;
  if (letters > 40 && (upper * 100) / Math.max(letters, 1) > 80) return "excessive_caps";

  return null;
}
