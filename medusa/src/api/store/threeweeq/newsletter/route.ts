import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  ThreeweeqRepository,
  type Locale,
} from "../../../../lib/threeweeq/repository"

type NewsletterBody = {
  email?: string
  locale?: Locale
  source?: string | null
  metadata?: Record<string, unknown>
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as NewsletterBody
  const email = body.email?.trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A valid email is required"
    )
  }

  const repository = new ThreeweeqRepository(req.scope)
  const result = await repository.addNewsletterSubscriber({
    email,
    locale: body.locale === "en" ? "en" : "ar",
    source: body.source ?? "storefront",
    metadata: body.metadata,
  })

  // Never leak the full row (or the fact that the address already existed) to
  // the public storefront — only what the UI needs to show a confirmation.
  res.status(result.created ? 201 : 200).json({
    subscribed: true,
    already_subscribed: !result.created && !result.resubscribed,
  })
}
