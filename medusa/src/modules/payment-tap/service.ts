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
  WebhookActionResult,
} from "@medusajs/framework/types"
import { verifyTapSignature } from "../../lib/payments/signatures"

type Options = {
  apiKey: string
  webhookSecret?: string
  baseUrl?: string
  redirectUrl?: string
}

type TapCharge = {
  id: string
  status?: string
  amount?: number
  currency?: string
  metadata?: Record<string, unknown>
  reference?: string
  [key: string]: unknown
}

class TapPaymentProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "tap"

  protected logger_: Logger
  protected options_: Options

  constructor(container: Record<string, unknown>, options: Options) {
    super(container, options)

    this.logger_ = container.logger as Logger
    this.options_ = options
  }

  private get baseUrl() {
    return this.options_.baseUrl ?? "https://api.tap.company/v2"
  }

  private toNumber(value: unknown) {
    return Number(new BigNumber(value as any).numeric)
  }

  private async request<T>(
    path: string,
    method: "GET" | "POST",
    body?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.options_.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
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
        `Tap request failed with status ${response.status}: ${JSON.stringify(
          data
        )}`
      )
    }

    return data as T
  }

  private mapStatus(status?: string) {
    switch ((status ?? "").toUpperCase()) {
      case "CAPTURED":
        return "captured" as const
      case "AUTHORIZED":
        return "authorized" as const
      case "DECLINED":
      case "CANCELLED":
      case "CANCELED":
      case "VOID":
        return "canceled" as const
      default:
        return "pending" as const
    }
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>
    const customer = (input.context?.customer ?? {}) as Record<string, unknown>
    const redirectUrl =
      typeof data.return_url === "string"
        ? data.return_url
        : this.options_.redirectUrl

    const charge = await this.request<TapCharge>("/charges", "POST", {
      amount: this.toNumber(input.amount),
      currency: input.currency_code.toUpperCase(),
      customer: {
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
      },
      source: { id: "src_all" },
      redirect: redirectUrl ? { url: redirectUrl } : undefined,
      capture: false,
      reference: {
        order: data.cart_id,
        transaction: data.session_id,
      },
      metadata: {
        ...data,
        session_id: data.session_id,
        cart_id: data.cart_id,
        order_id: data.order_id,
        payment_id: data.payment_id,
      },
    })

    return {
      id: charge.id,
      data: {
        ...charge,
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
        "Tap charge id is missing"
      )
    }

    const charge = await this.request<TapCharge>(`/charges/${id}`, "GET")

    return {
      data: {
        ...input.data,
        ...charge,
      },
      status: this.mapStatus(charge.status),
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    const id = input.data?.id as string | undefined
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Tap charge id is missing"
      )
    }

    const charge = await this.request<TapCharge>(
      `/charges/${id}/capture`,
      "POST",
      {}
    )

    return {
      data: {
        ...input.data,
        ...charge,
      },
    }
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    const id = input.data?.id as string | undefined
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Tap charge id is missing"
      )
    }

    await this.request(`/charges/${id}/refund`, "POST", {
      amount: this.toNumber(input.amount),
      reason: "requested_by_customer",
    })

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
        "Tap charge id is missing"
      )
    }

    await this.request(`/charges/${id}/void`, "POST", {})

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
        "Tap charge id is missing"
      )
    }

    const charge = await this.request<TapCharge>(`/charges/${id}`, "GET")

    return {
      status: this.mapStatus(charge.status),
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    const id = input.data?.id as string | undefined
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Tap charge id is missing"
      )
    }

    return this.request<TapCharge>(`/charges/${id}`, "GET")
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const data = payload.data as Record<string, unknown>
    const status = String(data.status ?? "").toUpperCase()
    const rawBody = Buffer.isBuffer(payload.rawData)
      ? payload.rawData.toString("utf8")
      : String(payload.rawData)

    if (
      !verifyTapSignature(
        rawBody,
        payload.headers as Record<string, unknown>,
        this.options_.webhookSecret,
        data
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

    const metadata = (data.metadata ?? {}) as Record<string, unknown>
    const sessionId = String(metadata.session_id ?? data.reference ?? "")
    const amount = new BigNumber(Number(data.amount ?? 0))

    if (status === "CAPTURED") {
      return {
        action: "captured",
        data: { session_id: sessionId, amount },
      }
    }

    if (status === "AUTHORIZED") {
      return {
        action: "authorized",
        data: { session_id: sessionId, amount },
      }
    }

    if (status === "DECLINED" || status === "CANCELLED") {
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

export default TapPaymentProviderService
