// proxy.ts  (Next 16 name; middleware.ts is deprecated)
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Skip API routes, Next internals, Vercel internals, public asset folders, the editor and any path with a dot.
  matcher: ['/((?!api|_next|_vercel|brand|docs|galeri|keystatic|.*\\..*).*)'],
}
