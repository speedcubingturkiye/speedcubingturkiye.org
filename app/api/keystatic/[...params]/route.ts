// app/api/keystatic/[...params]/route.ts: Keystatic's API. Local mode reads and writes the working tree; GitHub mode
// runs the OAuth session and proxies commits. Env (Production only, docs/yayin-kontrol-listesi.md §12):
// KEYSTATIC_GITHUB_CLIENT_ID, KEYSTATIC_GITHUB_CLIENT_SECRET, KEYSTATIC_SECRET, NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG.
// makeRouteHandler throws in GitHub mode when those secrets are missing, and `next build` imports this module: it is
// built on the first request, so local and Preview builds (no secrets, spec §6) stay green and only the API answers 500.
import { makeRouteHandler } from '@keystatic/next/route-handler'
import config from '@/keystatic.config'

let handler: ReturnType<typeof makeRouteHandler> | undefined
const keystatic = () => (handler ??= makeRouteHandler({ config }))

export const GET = (request: Request) => keystatic().GET(request)
export const POST = (request: Request) => keystatic().POST(request)
