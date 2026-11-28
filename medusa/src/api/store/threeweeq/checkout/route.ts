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
  refreshPaymentCollectionForCartWorkflow,
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
import { getVariantStockMap } from "../../../../lib/threeweeq/inventory"
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

/* Stripe Checkout Sessions carry `expires_at` in seconds. A session that is
   still payable is handed back instead of minting another one, so a second
   click on «ادفع» cannot leave a second payable page behind. */
function sessionExpiresAt(session: any) {
  const raw = session?.data?.expires_at
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

function isReusableSession(
  session: any,
  cartTotal: number,
  email?: string | null
) {
  if (!session || isSessionAuthorized(session)) {
    return false
  }

  /* A session created before the Elements switch has no `payment_ui`; reusing
     it would send the customer back to the hosted page that fails in the
     in-app browser. Force a fresh Elements session instead. New sessions state
     their mode explicitly, so a hosted fallback can still be reused. */
  const configuredUi =
    process.env.STRIPE_CHECKOUT_UI === "hosted_page"
      ? "hosted_page"
      : "elements"
  const sessionUi = String(session?.data?.payment_ui ?? "")

  if (sessionUi === "elements") {
    if (!clientSecretOf(session)) {
      return false
    }
  } else if (sessionUi === "hosted_page") {
    if (!redirectUrlOf(session)) {
      return false
    }
  } else {
    if (configuredUi === "elements" || !redirectUrlOf(session)) {
      return false
    }
  }

  /* The receipt address is fixed when the page is created. Reusing a page whose
     email no longer matches would send the receipt to the wrong inbox. */
  const sessionEmail = String(session?.data?.customer_email ?? "")
    .trim()
    .toLowerCase()
  const wantedEmail = String(email ?? "")
    .trim()
    .toLowerCase()

  if (sessionEmail && wantedEmail && sessionEmail !== wantedEmail) {
    return false
  }

  /* The page was priced when it was created. Reusing it after the cart changed
     would charge the old amount, so a different total always means a new page. */
  const rawAmount = session?.amount
  const sessionAmount =
    rawAmount && typeof rawAmount === "object" && "numeric" in rawAmount
      ? Number((rawAmount as { numeric: number }).numeric)
      : Number(rawAmount ?? 0)

  if (
    Number.isFinite(cartTotal) &&
    cartTotal > 0 &&
    Math.abs(sessionAmount - cartTotal) > 0.01
  ) {
    return false
  }

  const expiresAt = sessionExpiresAt(session)
  return expiresAt !== null && expiresAt * 1000 > Date.now() + 60_000
}

function stripeSessionIdOf(session: any) {
  const id = String(session?.data?.id ?? "").trim()
  return id.startsWith("cs_") ? id : undefined
}

function optionAmount(option: any) {
  return Number(
    option?.amount ??
      option?.calculated_price?.calculated_amount ??
      option?.prices?.[0]?.amount ??
      0
  )
}

async function resolveShippingOptionId(
  req: MedusaRequest,
  cartId: string,
  requested?: string | null
) {
  const result = await listShippingOptionsForCartWithPricingWorkflow(
    req.scope
  ).run({
    input: { cart_id: cartId },
  })
  const options = (unwrap(result) ?? []) as any[]
  const list = Array.isArray(options) ? options : []

  /* Free flat rates are leftovers from seeding. The shop charges 35 AED
     across the emirates and 50 AED for the Western Region, so an option that
     prices at zero must never be accepted — even from a hand-made request. */
  const priced = list.filter((option) => optionAmount(option) > 0)

  if (!priced.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "No shipping options are available for this cart"
    )
  }

  if (requested) {
    const match = priced.find(
      (option) => String(option.id) === String(requested)
    )

    if (!match) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The selected shipping option is not available for this address"
      )
    }

    return String(match.id)
  }

  return String(priced[0].id)
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

  if (!cart.items?.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Cannot start checkout with an empty cart"
    )
  }

  /* Stock is reserved when the order is created, which is after the customer
     has paid. A cart that sat open while the last piece sold would take the
     money and then fail, so the shelf is checked before Stripe is involved. */
  const variantIds = (cart.items ?? [])
    .map((item) => item.variant_id)
    .filter((id): id is string => Boolean(id))

  if (variantIds.length) {
    const stock = await getVariantStockMap(req.scope, variantIds)
    const shortages = (cart.items ?? [])
      .map((item) => {
        const entry = item.variant_id ? stock.get(item.variant_id) : null
        const quantity = Number(item.quantity ?? 0)

        if (!entry?.managed || entry.available >= quantity) {
          return null
        }

        return {
          item_id: item.id,
          variant_id: item.variant_id ?? null,
          title: item.product_title ?? item.title ?? null,
          requested: quantity,
          available: entry.available,
        }
      })
      .filter(Boolean)

    if (shortages.length) {
      res.status(409).json({
        code: "insufficient_stock",
        message:
          "Some items in this cart are no longer available in the requested quantity",
        items: shortages,
      })
      return
    }
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

  /* The page Medusa may replace: captured before a refresh can delete the
     session that points at it, so the provider still knows what to expire. */
  const priorSession = pickPaymentSession(collection, { providerId })
  const priorStripeSessionId = stripeSessionIdOf(priorSession)

  /* The collection keeps the amount it was created with. A cart that gained an
     item or changed its emirate would otherwise be charged the old total, so
     the amount is recomputed before a page is created or reused. An authorized
     session is left alone — that cart is already paid for. */
  if (!priorSession || !isSessionAuthorized(priorSession)) {
    try {
      await refreshPaymentCollectionForCartWorkflow(req.scope).run({
        input: { cart_id: cartId },
      })
      collection =
        (await getCartPaymentCollection(req.scope, cartId)) ?? collection
    } catch (error) {
      req.scope
        .resolve<any>("logger")
        ?.warn?.(
          `checkout: could not refresh the payment collection for ${cartId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
    }
  }

  const existingSession = priorSession
    ? pickPaymentSession(collection, { sessionId: priorSession.id })
    : pickPaymentSession(collection, { providerId })

  let session = existingSession
  const reuseSession = isReusableSession(
    existingSession,
    Number((cart as any).total ?? 0),
    email
  )

  if (!session || (!reuseSession && !isSessionAuthorized(session))) {
    /* Capture the page we are about to replace before Medusa deletes the
       session that points at it, so the provider can expire it at Stripe. */
    const previousCheckoutSessionId =
      stripeSessionIdOf(existingSession) ?? priorStripeSessionId

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
          ...(previousCheckoutSessionId
            ? { previous_checkout_session_id: previousCheckoutSessionId }
            : {}),
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
      "The payment provider did not return a redirect URL or a client secret"
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
    payment_ui:
      String(session?.data?.payment_ui ?? session?.data?.ui_mode ?? "") ||
      null,
    amount: serializableAmount(session.amount ?? collection.amount),
    currency_code: session.currency_code ?? collection.currency_code ?? null,
    authorized: isSessionAuthorized(session),
    cart: await serializeCart(req.scope, refreshedCart, locale),
  })
}
