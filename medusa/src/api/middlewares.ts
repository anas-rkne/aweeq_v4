import { defineMiddlewares } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/webhooks/payments",
      bodyParser: { preserveRawBody: true },
    },
    {
      matcher: "/api/webhooks/payments",
      bodyParser: { preserveRawBody: true },
    },
  ],
})
