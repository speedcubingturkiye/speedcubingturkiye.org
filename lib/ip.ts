// lib/ip.ts: the visitor's address as the platform reports it. One definition for the routes that bind a form to the
// network it was filled on (lib/turnstile.ts) and the ones that record it (membership, newsletter).
export const clientIp = (headers: Headers) =>
  headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || null

/**
 * The address of the request being served; null where there is none (a unit test that calls the action directly, a
 * job). Never throws: Next's `headers()` does outside a request, and a page must not answer 500 for it.
 */
export async function requestIp(): Promise<string | null> {
  try {
    const { headers } = await import('next/headers')
    return clientIp(await headers())
  } catch {
    return null
  }
}
