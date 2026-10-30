import {
  AbstractPaymentProvider,
  BigNumber,
  MedusaError,
} from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  Logger,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { verifyStripeSignature } from "../../lib/payments/signatures"

type Options = {
  apiKey: string
  webhookSecret?: string
  baseUrl?: string
}

type StripePaymentIntent = {
  id: string
  status?: string
  amount?: number
  amount_received?: number
  currency?: string
  client_secret?: string
  metadata?: Record<string, string>
  [key: string]: unknown
}

type StripeCheckoutSession = {
  id: string
  url?: string
  payment_status?: string
  payment_intent?: string
  amount_total?: number
  currency?: string
  metadata?: Record<string, string>
  [key: string]: unknown
}

class StripePaymentProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "stripe"

  protected logger_: Logger
  protected options_: Options

  constructor(container: Record<string, unknown>, options: Options) {
    super(container, options)

    this.logger_ = container.logger as Logger
    this.options_ = options
  }

  private get baseUrl() {
    return this.options_.baseUrl ?? "https://api.stripe.com/v1"
  }

  private toMinorUnits(value: unknown) {
    return Math.round(Number(new BigNumber(value as any).numeric) * 100)
  }

  private async request<T>(
    path: string,
    method: "GET" | "POST",
    form?: URLSearchParams
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.options_.apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: method === "POST" ? (form ?? new URLSearchParams()).toString() : undefined,
    })

    const text = await response.text()
    let data: Record<string, unknown> = {}

    if (text) {
      try {
        data = JSON.parse(text) as Record<string, unknown>
      } catch {
        data = { raw: text }
      }
    }

    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Stripe request failed with status ${response.status}: ${JSON.stringify(
          data
        )}`
      )
    }

    return data as T
  }

  private mapStatus(status?: string) {
    switch (status) {
      case "succeeded":
        return "captured" as const
      case "requires_capture":
        return "authorized" as const
      case "canceled":
        return "canceled" as const
      case "requires_payment_method":
      case "requires_confirmation":
      case "requires_action":
        return "pending" as const
      default:
        return "pending" as const
    }
  }

  private metadataFrom(data: Record<string, unknown>) {
    const metadata: Record<string, string> = {}

    for (const key of [
      "session_id",
      "cart_id",
      "order_id",
      "payment_id",
    ]) {
      const value = data[key]
      if (value !== undefined && value !== null) {
        metadata[key] = String(value)
      }
    }

    return metadata
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const customer = (input.context?.customer ?? {}) as Record<string, unknown>
    const locale = data.locale === "en" ? "en" : "ar"
    const storefrontUrl = (
      process.env.MEDUSA_STOREFRONT_URL || "http://localhost:3000"
    ).replace(/\/+$/, "")

    const form = new URLSearchParams()
    form.set("mode", "payment")
    form.set(
      "line_items[0][price_data][currency]",
      input.currency_code.toLowerCase()
    )
    form.set(
      "line_items[0][price_data][unit_amount]",
      String(this.toMinorUnits(input.amount))
    )
    form.set("line_items[0][price_data][product_data][name]", "3WEEQ Order")
    form.set("line_items[0][quantity]", "1")
    form.set(
      "success_url",
      `${storefrontUrl}/${locale}/checkout/callback?session_id={CHECKOUT_SESSION_ID}`
    )
    form.set("cancel_url", `${storefrontUrl}/${locale}/checkout`)

    if (customer.email || data.email) {
      form.set("customer_email", String(customer.email ?? data.email))
    }

    for (const [key, value] of Object.entries(this.metadataFrom(data))) {
      form.set(`metadata[${key}]`, value)
    }

    const session = await this.request<StripeCheckoutSession>(
      "/checkout/sessions",
      "POST",
      form
    )

    return {
      id: session.id,
      data: {
        ...session,
        redirect_url: session.url,
        session_id: data.session_id,
        cart_id: data.cart_id,
        order_id: data.order_id,
        payment_id: data.payment_id,
      },
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const id = input.data?.id as string | undefined
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Stripe checkout session id is missing"
      )
    }

    const session = await this.request<StripeCheckoutSession>(
      `/checkout/sessions/${id}`,
      "GET"
    )

    return {
      data: {
        ...input.data,
        ...session,
      },
      status: session.payment_status === "paid" ? "captured" : "pending",
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    // Checkout Sessions capture immediately on completion; there is nothing
    // left to capture, so this is a no-op that preserves the session data.
    return {
      data: input.data ?? {},
    }
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    const id = input.data?.id as string | undefined
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Stripe payment intent id is missing"
      )
    }

    const form = new URLSearchParams()
    form.set("payment_intent", id)
    form.set("amount", String(this.toMinorUnits(input.amount)))

    await this.request("/refunds", "POST", form)

    return {
      data: input.data ?? {},
    }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    const id = input.data?.id as string | undefined
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Stripe payment intent id is missing"
      )
    }

    await this.request(
      `/payment_intents/${id}/cancel`,
      "POST",
      new URLSearchParams()
    )

    return {
      data: input.data ?? {},
    }
  }

  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    return {
      data: input.data ?? {},
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const id = input.data?.id as string | undefined
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Stripe checkout session id is missing"
      )
    }

    const session = await this.request<StripeCheckoutSession>(
      `/checkout/sessions/${id}`,
      "GET"
    )

    return {
      status: session.payment_status === "paid" ? "captured" : "pending",
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    const id = input.data?.id as string | undefined
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Stripe checkout session id is missing"
      )
    }

    const session = await this.request<StripeCheckoutSession>(
      `/checkout/sessions/${id}`,
      "GET"
    )

    return {
      data: session as unknown as Record<string, unknown>,
    }
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    const id = input.data?.id as string | undefined
    if (!id) {
      // Nothing was created on the provider side yet; keep the session data.
      return { data: input.data ?? {} }
    }

    const session = await this.request<StripeCheckoutSession>(
      `/checkout/sessions/${id}`,
      "GET"
    )

    return {
      data: {
        ...input.data,
        ...session,
      },
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const data = payload.data as Record<string, unknown>
    const rawBody = Buffer.isBuffer(payload.rawData)
      ? payload.rawData.toString("utf8")
      : String(payload.rawData)

    if (
      !verifyStripeSignature(
        rawBody,
        payload.headers as Record<string, unknown>,
        this.options_.webhookSecret
      )
    ) {
      return {
        action: "failed",
        data: {
          session_id: "",
          amount: new BigNumber(0),
        },
      }
    }

    const eventData = (data.data ?? {}) as Record<string, unknown>
    const object = (eventData.object ?? {}) as Record<string, unknown>
    const metadata = (object.metadata ?? {}) as Record<string, unknown>
    const type = String(data.type ?? "")
    const sessionId = String(metadata.session_id ?? "")
    const amountInMinor = Number(
      object.amount_received ?? object.amount ?? object.amount_total ?? 0
    )
    const amount = new BigNumber(amountInMinor / 100)

    if (type === "checkout.session.completed") {
      return {
        action: "authorized",
        data: { session_id: sessionId, amount },
      }
    }

    if (type === "payment_intent.succeeded") {
      return {
        action: "captured",
        data: { session_id: sessionId, amount },
      }
    }

    if (type === "payment_intent.amount_capturable_updated") {
      return {
        action: "authorized",
        data: { session_id: sessionId, amount },
      }
    }

    if (
      type === "payment_intent.payment_failed" ||
      type === "payment_intent.canceled"
    ) {
      return {
        action: "failed",
        data: { session_id: sessionId, amount },
      }
    }

    return {
      action: "not_supported",
      data: { session_id: sessionId, amount },
    }
  }
}

export default StripePaymentProviderService
