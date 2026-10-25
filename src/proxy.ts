import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

// Next.js 16 renamed Middleware to Proxy; the handler is the same.
export const proxy = createMiddleware(routing)
export default proxy

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
}
