export type OrderConfirmationPayload = {
  order_id?: string
  display_id?: number | string | null
  email?: string | null
  phone?: string | null
  customer_name?: string | null
  locale?: "ar" | "en"
  currency_code?: string | null
  total?: number | string | null
  shipping_address?: Record<string, unknown> | null
  items?: Array<{
    title?: string | null
    quantity?: number | null
    unit_price?: number | string | null
  }>
}

type OutboxEvent = {
  id: string
  event_type: string
  payload: OrderConfirmationPayload & Record<string, unknown>
}

export type SendResult = {
  sent: boolean
  skipped?: boolean
  reason?: string
  provider_id?: string | null
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Prices are stored in AED major units (850.00), so no /100 here. Emails are
 * sent from the backend where `Intl` with an explicit locale is safe.
 */
function formatMoney(value: unknown, locale: "ar" | "en", currency: string) {
  const amount = Number(value ?? 0)

  if (!Number.isFinite(amount)) {
    return "—"
  }

  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

function addressLines(address?: Record<string, unknown> | null) {
  if (!address) return ""
  return [
    address.address_1,
    address.address_2,
    address.city,
    address.province,
    address.postal_code,
    address.country_code,
  ]
    .filter(Boolean)
    .map((part) => escapeHtml(part))
    .join(" · ")
}

function orderConfirmationEmail(event: OutboxEvent) {
  const payload = event.payload ?? {}
  const locale = payload.locale === "en" ? "en" : "ar"
  const currency = String(payload.currency_code ?? "aed").toUpperCase()
  const total = formatMoney(payload.total, locale, currency)
  const orderNumber = payload.display_id ? `#${payload.display_id}` : payload.order_id ?? ""
  const items = Array.isArray(payload.items) ? payload.items : []
  const name = payload.customer_name?.trim()

  const rows = items
    .map(
      (item) =>
        `<tr>
           <td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(item.title ?? "")}</td>
           <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center">${Number(
             item.quantity ?? 0
           )}</td>
           <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:end">${formatMoney(
             item.unit_price,
             locale,
             currency
           )}</td>
         </tr>`
    )
    .join("")

  const copy =
    locale === "ar"
      ? {
          subject: `تم استلام طلبك ${orderNumber} — 3WEEQ`,
          heading: "تم استلام طلبك",
          greeting: name ? `مرحباً ${escapeHtml(name)}،` : "مرحباً،",
          intro:
            "شكراً لاقتنائك قطعة من 3WEEQ. هذا تأكيد لطلبك، وسنتواصل معك عند شحنه.",
          orderLabel: "رقم الطلب",
          itemsLabel: "القطع",
          totalLabel: "الإجمالي (شامل الضريبة)",
          addressLabel: "عنوان الشحن",
          footer:
            "التوصيل داخل الإمارات فقط. للاستفسار: care@3weeq.ae",
          dir: "rtl",
        }
      : {
          subject: `We received your order ${orderNumber} — 3WEEQ`,
          heading: "Order confirmed",
          greeting: name ? `Hello ${escapeHtml(name)},` : "Hello,",
          intro:
            "Thank you for choosing 3WEEQ. This confirms your order — we will be in touch when it ships.",
          orderLabel: "Order",
          itemsLabel: "Items",
          totalLabel: "Total (VAT included)",
          addressLabel: "Shipping address",
          footer: "Delivery inside the UAE only. Questions: care@3weeq.ae",
          dir: "ltr",
        }

  const html = `<!doctype html>
<html dir="${copy.dir}" lang="${locale}">
  <body style="margin:0;background:#0b1020;padding:24px;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">
      <tr>
        <td style="background:#0b1020;color:#cd9e61;padding:20px;font-size:20px;letter-spacing:4px">3WEEQ</td>
      </tr>
      <tr>
        <td style="padding:24px;color:#1f2937;font-size:15px;line-height:1.7">
          <h1 style="margin:0 0 12px;font-size:20px">${copy.heading}</h1>
          <p style="margin:0 0 8px">${copy.greeting}</p>
          <p style="margin:0 0 16px">${copy.intro}</p>
          <p style="margin:0 0 4px"><strong>${copy.orderLabel}:</strong> ${escapeHtml(orderNumber)}</p>
          ${
            rows
              ? `<table role="presentation" width="100%" style="margin:16px 0;font-size:14px">
                   <thead>
                     <tr style="text-align:start;color:#6b7280">
                       <th style="padding:4px 0;text-align:start">${copy.itemsLabel}</th>
                       <th style="padding:4px 0;text-align:center">×</th>
                       <th style="padding:4px 0;text-align:end"></th>
                     </tr>
                   </thead>
                   <tbody>${rows}</tbody>
                 </table>`
              : ""
          }
          <p style="margin:12px 0"><strong>${copy.totalLabel}:</strong> ${total}</p>
          ${
            addressLines(payload.shipping_address)
              ? `<p style="margin:12px 0"><strong>${copy.addressLabel}:</strong><br/>${addressLines(
                  payload.shipping_address
                )}</p>`
              : ""
          }
          <p style="margin:24px 0 0;color:#6b7280;font-size:13px">${copy.footer}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = [
    copy.heading,
    copy.greeting,
    copy.intro,
    `${copy.orderLabel}: ${orderNumber}`,
    ...items.map(
      (item) =>
        `- ${item.title ?? ""} × ${Number(item.quantity ?? 0)} — ${formatMoney(
          item.unit_price,
          locale,
          currency
        )}`
    ),
    `${copy.totalLabel}: ${total}`,
    addressLines(payload.shipping_address)
      ? `${copy.addressLabel}: ${addressLines(payload.shipping_address)}`
      : "",
    copy.footer,
  ]
    .filter(Boolean)
    .join("\n")

  return { subject: copy.subject, html, text }
}

function templateFor(event: OutboxEvent) {
  switch (event.event_type) {
    case "order.confirmation":
      return orderConfirmationEmail(event)
    default:
      return null
  }
}

/**
 * Resend HTTP API (no SDK dependency). Returns `skipped` when no key is set so
 * the outbox job can leave events pending instead of burning retries.
 */
export async function sendOutboxEvent(event: OutboxEvent): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? "3WEEQ <care@3weeq.ae>"
  const replyTo = process.env.EMAIL_REPLY_TO ?? "care@3weeq.ae"

  if (!apiKey) {
    return { sent: false, skipped: true, reason: "email_not_configured" }
  }

  const to = String(event.payload?.email ?? "").trim()
  if (!to) {
    return { sent: false, skipped: true, reason: "missing_recipient" }
  }

  const template = templateFor(event)
  if (!template) {
    return { sent: false, skipped: true, reason: "no_template" }
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: replyTo,
      subject: template.subject,
      html: template.html,
      text: template.text,
    }),
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(
      `Resend rejected the email (${response.status}): ${body.slice(0, 300)}`
    )
  }

  const data = (await response.json().catch(() => null)) as {
    id?: string
  } | null

  return { sent: true, provider_id: data?.id ?? null }
}
