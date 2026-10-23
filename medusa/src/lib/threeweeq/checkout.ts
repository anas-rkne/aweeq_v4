import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export type CartPaymentSession = {
  id: string
  status: string
  provider_id?: string | null
  payment_collection_id?: string | null
  amount?: unknown
  currency_code?: string | null
  data?: Record<string, unknown> | null
  authorized_at?: string | null
}

export type CartPaymentCollection = {
  id: string
  status?: string | null
  amount?: unknown
  currency_code?: string | null
  payment_sessions?: CartPaymentSession[]
}

const PAYMENT_SESSION_FIELDS = [
  "payment_collection.id",
  "payment_collection.status",
  "payment_collection.amount",
  "payment_collection.currency_code",
  "payment_collection.payment_sessions.id",
  "payment_collection.payment_sessions.status",
  "payment_collection.payment_sessions.provider_id",
  "payment_collection.payment_sessions.payment_collection_id",
  "payment_collection.payment_sessions.amount",
  "payment_collection.payment_sessions.currency_code",
  "payment_collection.payment_sessions.data",
  "payment_collection.payment_sessions.authorized_at",
]

export async function getCartPaymentCollection(
  container: MedusaContainer,
  cartId: string
): Promise<CartPaymentCollection | null> {
  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY)

  try {
    const { data } = await query.graph({
      entity: "cart",
      fields: PAYMENT_SESSION_FIELDS,
      filters: { id: cartId },
    })

    return data?.[0]?.payment_collection ?? null
  } catch {
    return null
  }
}

export function pickPaymentSession(
  collection: CartPaymentCollection | null,
  input?: { sessionId?: string | null; providerId?: string | null }
) {
  const sessions = collection?.payment_sessions ?? []

  if (input?.sessionId) {
    return sessions.find((session) => session.id === input.sessionId) ?? null
  }

  const usable = sessions.filter(
    (session) => session.status !== "canceled" && session.status !== "error"
  )

  if (input?.providerId) {
    const providerSession = usable.find(
      (session) => session.provider_id === input.providerId
    )

    if (providerSession) {
      return providerSession
    }
  }

  return usable[usable.length - 1] ?? null
}

export async function findOrderByCart(
  container: MedusaContainer,
  cartId: string
) {
  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "status",
      "customer_id",
      "email",
      "currency_code",
      "items.id",
      "items.variant_id",
      "items.quantity",
    ],
    filters: { cart_id: cartId },
    pagination: { skip: 0, take: 1 },
  })

  return data?.[0] ?? null
}

export async function findPaymentBySession(
  container: MedusaContainer,
  sessionId: string
) {
  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "payment",
    fields: ["id", "captured_at", "canceled_at", "payment_session_id"],
    filters: { payment_session_id: sessionId },
    pagination: { skip: 0, take: 1 },
  })

  return data?.[0] ?? null
}

export function isSessionAuthorized(session: CartPaymentSession) {
  return session.status === "authorized" || session.status === "captured"
}
