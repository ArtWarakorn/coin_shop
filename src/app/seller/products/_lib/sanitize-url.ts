export function sanitizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.protocol === 'http:' || u.protocol === 'https:') return raw;
  } catch {
    // not a valid url
  }
  return '';
}
