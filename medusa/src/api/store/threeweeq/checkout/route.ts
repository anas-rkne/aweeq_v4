import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  addShippingMethodToCartWorkflow,
  createPaymentCollectionForCartWorkflow,
  createPaymentSessionsWorkflow,
  listShippingOptionsForCartWithPricingWorkflow,
  updateCartWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  getCartId,
  loadCart,
  serializeCart,
  setCartCookie,
  type CartLike,
} from "../../../../lib/threeweeq/cart"
import {
  getCartPaymentCollection,
  isSessionAuthorized,
  pickPaymentSession,
} from "../../../../lib/threeweeq/checkout"
import type { Locale } from "../../../../lib/threeweeq/repository"

type CheckoutInitBody = {
  cart_id?: string
  email?: string | null
  shipping_address?: Record<string, unknown> | null
  billing_address?: Record<string, unknown> | null
  shipping_option_id?: string | null
  provider_id?: string | null
  locale?: string | null
  drop_id?: string | null
  gift_message?: string | null
  packaging_code?: string | null
  metadata?: Record<string, unknown> | null
}

const DEFAULT_PROVIDER_ID = "pp_stripe_stripe"

function resolveLocale(value: unknown): Locale {
  return typeof value === "string" && value.toLowerCase().startsWith("en")
    ? "en"
    : "ar"
}

function unwrap(value: any) {
  return value?.result ?? value
}

function firstRow(value: any) {
  const output = unwrap(value)
  return Array.isArray(output) ? (output[0] ?? null) : (output ?? null)
}

function clientSecretOf(session: any) {
  const data = session?.data ?? {}
  const secret = data.client_secret ?? session?.client_secret
  return secret ? String(secret) : null
}

function redirectUrlOf(session: any) {
  const data = session?.data ?? {}
  const url = data.redirect_url ?? session?.redirect_url
  return url ? String(url) : null
}

function serializableAmount(value: unknown) {
  if (value && typeof value === "object" && "numeric" in value) {
    return Number((value as { numeric: number }).numeric)
  }

  return value === undefined || value === null ? null : Number(value)
}

async function resolveShippingOptionId(
  req: MedusaRequest,
  cartId: string,
  requested?: string | null
) {
  if (requested) {
    return requested
  }

  const result = await listShippingOptionsForCartWithPricingWorkflow(
    req.scope
  ).run({
    input: { cart_id: cartId },
  })
  const options = unwrap(result) as any[]

  if (!Array.isArray(options) || !options.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No shipping options are available for this cart"
    )
  }

  return String(options[0].id)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as CheckoutInitBody
  const cartId = getCartId(req, body)

  if (!cartId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "cart_id is required"
    )
  }

  const cart = await loadCart(req.scope, cartId)

  if (!cart) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Cart not found")
  }

  if (cart.completed_at) {
    res.status(409).json({
      code: "cart_completed",
      message: "This cart has already been completed",
    })
    return
  }

  const email = body.email?.trim() || cart.email || null

  if (!email) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "email is required to start checkout"
    )
  }

  const locale = resolveLocale(body.locale ?? cart.metadata?.locale)
  const metadata: Record<string, unknown> = {
    ...(cart.metadata ?? {}),
    ...(body.metadata ?? {}),
    locale,
  }

  if (body.drop_id !== undefined) {
    metadata.drop_id = body.drop_id
  }

  if (body.gift_message !== undefined) {
    metadata.gift_message = body.gift_message
  }

  if (body.packaging_code !== undefined) {
    metadata.packaging_code = body.packaging_code
  }

  const updateInput: Record<string, unknown> = {
    id: cartId,
    email,
    metadata,
    locale,
  }

  if (body.shipping_address) {
    updateInput.shipping_address = body.shipping_address
  }

  if (body.billing_address) {
    updateInput.billing_address = body.billing_address
  }

  await updateCartWorkflow(req.scope).run({ input: updateInput as any })

  const shippingOptionId = await resolveShippingOptionId(
    req,
    cartId,
    body.shipping_option_id
  )

  await addShippingMethodToCartWorkflow(req.scope).run({
    input: {
      cart_id: cartId,
      options: [{ id: shippingOptionId }],
    },
  })

  const providerId = body.provider_id?.trim() || DEFAULT_PROVIDER_ID
  let collection = await getCartPaymentCollection(req.scope, cartId)

  if (!collection?.id) {
    try {
      const created = await createPaymentCollectionForCartWorkflow(
        req.scope
      ).run({
        input: {
          cart_id: cartId,
          metadata: { provider_id: providerId },
        },
      })
      collection = firstRow(created)
    } catch (error) {
      collection = await getCartPaymentCollection(req.scope, cartId)

      if (!collection?.id) {
        throw error
      }
    }
  }

  if (!collection?.id) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Unable to create a payment collection for this cart"
    )
  }

  const existingSession = pickPaymentSession(collection, {
    providerId,
  })

  let session = existingSession

  if (!session || !isSessionAuthorized(session)) {
    const createdSession = await createPaymentSessionsWorkflow(req.scope).run({
      input: {
        payment_collection_id: collection.id,
        provider_id: providerId,
        customer_id: cart.customer_id ?? undefined,
        data: {
          cart_id: cartId,
          ...(metadata.drop_id ? { drop_id: metadata.drop_id } : {}),
          locale,
          ...(email ? { email } : {}),
        },
      },
    })

    session = firstRow(createdSession)
  }

  if (!session?.id) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Unable to create a payment session for this cart"
    )
  }

  const clientSecret = clientSecretOf(session)
  const redirectUrl = redirectUrlOf(session)

  if (!redirectUrl && !clientSecret && !isSessionAuthorized(session)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "The payment provider did not return a redirect URL"
    )
  }

  setCartCookie(res, cartId)

  const refreshedCart = (await loadCart(req.scope, cartId)) as CartLike

  res.status(200).json({
    cart_id: cartId,
    payment_collection_id: collection.id,
    payment_session_id: session.id,
    provider_id: session.provider_id ?? providerId,
    redirect_url: redirectUrl,
    client_secret: clientSecret,
    amount: serializableAmount(session.amount ?? collection.amount),
    currency_code: session.currency_code ?? collection.currency_code ?? null,
    authorized: isSessionAuthorized(session),
    cart: await serializeCart(req.scope, refreshedCart, locale),
  })
}
