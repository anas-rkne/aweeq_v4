# Environment Variables

Create `.env.local` in the project root. Only variables prefixed with
`NEXT_PUBLIC_` are exposed to the browser.

## Storefront

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | yes | Medusa server URL (e.g. `http://localhost:9000`) |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | yes | Public key used for `/store/*` requests |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical site URL used by metadata |
| `NEXT_PUBLIC_SITE_NAME` | optional | Brand name fallback |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | optional | Default currency code (default `aed`) |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | optional | Default locale (default `ar`) |
| `NEXT_PUBLIC_DEFAULT_REGION` | optional | Default region label |

## Newsletter (server-only)

| Variable | Required | Purpose |
|---|---|---|
| `MEDUSA_WAITLIST_CIVILIZATION_ID` | optional | When set, newsletter signups are forwarded to `POST /store/waitlist` for this civilization |
| `MEDUSA_BACKEND_URL` | optional | Server-side Medusa URL (falls back to `NEXT_PUBLIC_MEDUSA_BACKEND_URL`) |
| `MEDUSA_PUBLISHABLE_KEY` | optional | Server-side publishable key (falls back to the public one) |
| `REVALIDATE_SECRET` | yes in production | Bearer secret for `POST /api/revalidate` (catalog cache invalidation) |

In development, without the waitlist variables the newsletter route queues the
email locally in `.data/newsletter-subscribers.json` (git-ignored). In
production the route **fails closed** (`503`) unless the Medusa waitlist or an
ESP is configured. Configure it before launch.
