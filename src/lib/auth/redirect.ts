/**
 * Accepts only same-site paths ("/dashboard", "/seller/orders?status=ready").
 * Anything else falls back, so a crafted `?next=` / `?redirectTo=` cannot send a
 * user to another site. Rejected: absolute URLs, "//host", "/\host", "@host/x",
 * and control characters that browsers strip before parsing.
 */
export function safeRedirectPath(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw || raw.length > 2048) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback;

  // Final check with the real URL parser: the result must stay on our origin.
  try {
    const base = 'http://placeholder.invalid';
    const url = new URL(raw, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
