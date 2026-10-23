import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  ThreeweeqRepository,
  type Locale,
} from "../../../lib/threeweeq/repository"

type WaitlistBody = {
  civilization_id?: string
  drop_id?: string | null
  email?: string
  customer_id?: string | null
  locale?: Locale
  source?: string | null
  metadata?: Record<string, unknown>
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as WaitlistBody
  const email = body.email?.trim()

  if (!body.civilization_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "civilization_id is required"
    )
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A valid email is required"
    )
  }

  const repository = new ThreeweeqRepository(req.scope)
  const result = await repository.addWaitlist({
    civilization_id: body.civilization_id,
    drop_id: body.drop_id ?? null,
    email,
    customer_id: body.customer_id ?? null,
    locale: body.locale === "en" ? "en" : "ar",
    source: body.source ?? null,
    metadata: body.metadata ?? {},
  })

  res.status(result.created ? 201 : 200).json({
    entry: result.entry,
    created: result.created,
  })
}
