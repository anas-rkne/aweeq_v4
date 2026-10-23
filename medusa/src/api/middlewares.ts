import express from "express"
import { defineMiddlewares } from "@medusajs/framework/http"

const rawJson = express.raw({ type: "application/json" }) as any

export default defineMiddlewares({
  routes: [
    {
      matcher: "/api/webhooks/payments",
      middlewares: [rawJson],
    },
    {
      matcher: "/webhooks/payments",
      middlewares: [rawJson],
    },
  ],
})
