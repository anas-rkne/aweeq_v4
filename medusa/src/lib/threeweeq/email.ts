export type OrderConfirmationPayload = {
  order_id?: string
  display_id?: number | string | null
  email?: string | null
  phone?: string | null
  customer_name?: string | null
  customer_email?: string | null
  customer_phone?: string | null
  locale?: "ar" | "en"
  currency_code?: string | null
  total?: number | string | null
  shipping_total?: number | string | null
  shipping_address?: Record<string, unknown> | null
  created_at?: string | Date | null
  status?: string | null
  admin_url?: string | null
  items?: Array<{
    title?: string | null
    quantity?: number | null
    unit_price?: number | string | null
  }>
}

export type OutboxEvent = {
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

function addressParts(address?: Record<string, unknown> | null) {
  if (!address) return []
  return [
    address.address_1,
    address.address_2,
    address.city,
    address.province,
    address.postal_code,
    address.country_code,
  ]
    .filter(Boolean)
    .map((part) => String(part))
}

function addressLines(address?: Record<string, unknown> | null) {
  return addressParts(address).map((part) => escapeHtml(part)).join(" · ")
}

function addressText(address?: Record<string, unknown> | null) {
  return addressParts(address).join(" · ")
}

/** Accept `Name <address>` as well as a bare address. */
function emailAddress(value: unknown) {
  const raw = String(value ?? "").trim()
  const bracketed = raw.match(/<([^>]+)>/)
  return (bracketed ? bracketed[1] : raw).trim()
}

/** The address customers are told to write to; follows EMAIL_REPLY_TO. */
function supportEmail() {
  const configured = String(process.env.EMAIL_REPLY_TO ?? "")
    .split(/[,;]/)
    .map((entry) => emailAddress(entry))
    .find((entry) => entry.includes("@"))

  return configured ?? "3weeq.971@gmail.com"
}

/** Dubai time, Latin digits — an order alert is read on a phone, not parsed. */
function formatDateTime(value: unknown) {
  if (!value) return ""

  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return ""

  try {
    return new Intl.DateTimeFormat("ar-AE-u-nu-latn", {
      timeZone: "Asia/Dubai",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date)
  } catch {
    return date.toISOString()
  }
}

function orderConfirmationEmail(event: OutboxEvent) {
  const payload = event.payload ?? {}
  const locale = payload.locale === "en" ? "en" : "ar"
  const currency = String(payload.currency_code ?? "aed").toUpperCase()
  const total = formatMoney(payload.total, locale, currency)
  const orderNumber = payload.display_id ? `#${payload.display_id}` : payload.order_id ?? ""
  const items = Array.isArray(payload.items) ? payload.items : []
  const name = payload.customer_name?.trim()
  const support = supportEmail()

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
          footer: `التوصيل داخل الإمارات فقط. للاستفسار: ${support}`,
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
          footer: `Delivery inside the UAE only. Questions: ${support}`,
          dir: "ltr",
        }

  const html = `<!doctype html>
<html dir="${copy.dir}" lang="${locale}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>3WEEQ</title>
  </head>
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
    addressText(payload.shipping_address)
      ? `${copy.addressLabel}: ${addressText(payload.shipping_address)}`
      : "",
    copy.footer,
  ]
    .filter(Boolean)
    .join("\n")

  return { subject: copy.subject, html, text }
}

function shippedEmail(event: OutboxEvent) {
  const payload = event.payload ?? {}
  const locale = payload.locale === "en" ? "en" : "ar"
  const orderNumber = payload.display_id
    ? `#${payload.display_id}`
    : payload.order_id ?? ""
  const name = payload.customer_name?.trim()
  const tracking = Array.isArray(payload.tracking_numbers)
    ? payload.tracking_numbers
        .filter((entry): entry is string => Boolean(entry))
        .map((entry) => String(entry))
    : []
  const trackingUrl = "https://topex.ae/Home/tracking2"
  const support = supportEmail()

  const copy =
    locale === "ar"
      ? {
          subject: `طلبك في الطريق ${orderNumber} — 3WEEQ`,
          heading: "طلبك في الطريق",
          greeting: name ? `مرحباً ${escapeHtml(name)}،` : "مرحباً،",
          intro:
            "خرج طلبك من المستودع مع شركة التوصيل. يمكنك متابعة الشحنة عبر الرابط أدناه.",
          orderLabel: "رقم الطلب",
          trackingLabel: "رقم التتبع",
          trackingButton: "تتبع الشحنة",
          window:
            "التوصيل خلال 24 ساعة من الاستلام، يومياً من 10 صباحاً حتى 10 مساءً.",
          footer: `للاستفسار: ${support}`,
          dir: "rtl",
        }
      : {
          subject: `Your order is on the way ${orderNumber} — 3WEEQ`,
          heading: "Your order is on the way",
          greeting: name ? `Hello ${escapeHtml(name)},` : "Hello,",
          intro:
            "Your order has left our warehouse with the courier. Follow the shipment through the link below.",
          orderLabel: "Order",
          trackingLabel: "Tracking number",
          trackingButton: "Track shipment",
          window:
            "Delivery within 24 hours of pickup, daily from 10 AM to 10 PM.",
          footer: `Questions: ${support}`,
          dir: "ltr",
        }

  const trackingLine = tracking.length
    ? `<p style="margin:16px 0 0"><strong>${copy.trackingLabel}:</strong><br/>${tracking
        .map((entry) => escapeHtml(entry))
        .join("<br/>")}</p>`
    : ""

  const html = `<!doctype html>
<html dir="${copy.dir}" lang="${locale}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>3WEEQ</title>
  </head>
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
          ${trackingLine}
          <p style="margin:24px 0 0">
            <a href="${trackingUrl}" style="display:inline-block;background:#cd9e61;color:#0a1628;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold">${copy.trackingButton}</a>
          </p>
          <p style="margin:24px 0 0;color:#6b7280;font-size:13px">${copy.window}</p>
          <p style="margin:4px 0 0;color:#6b7280;font-size:13px">${copy.footer}</p>
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
    tracking.length
      ? `${copy.trackingLabel}: ${tracking.join(", ")} — ${trackingUrl}`
      : trackingUrl,
    copy.window,
    copy.footer,
  ]
    .filter(Boolean)
    .join("\n")

  return { subject: copy.subject, html, text }
}

/**
 * Merchant alert. Deliberately denser than the customer email: the operator
 * needs the phone, the address, every line item, and a one-click jump to the
 * order — usually read on a phone while away from the dashboard.
 */
function adminOrderEmail(event: OutboxEvent) {
  const payload = event.payload ?? {}
  const currency = String(payload.currency_code ?? "aed").toUpperCase()
  const orderNumber = payload.display_id
    ? `#${payload.display_id}`
    : String(payload.order_id ?? "")
  const items = Array.isArray(payload.items) ? payload.items : []
  const total = formatMoney(payload.total, "ar", currency)
  const shipping = Number(payload.shipping_total ?? 0)
  const itemTotal = items.reduce(
    (sum, item) =>
      sum + Number(item.unit_price ?? 0) * Number(item.quantity ?? 0),
    0
  )
  const customerName = String(payload.customer_name ?? "").trim()
  const customerEmail = String(payload.customer_email ?? "").trim()
  const customerPhone = String(payload.customer_phone ?? "").trim()
  const adminUrl = String(payload.admin_url ?? "").trim()
  const createdAt = formatDateTime(payload.created_at)
  const subject = `${["طلب جديد", orderNumber]
    .filter(Boolean)
    .join(" ")} — ${total}`

  const itemRows = items
    .map((item) => {
      const quantity = Number(item.quantity ?? 0)
      const lineTotal = Number(item.unit_price ?? 0) * quantity
      return `<tr>
        <td style="padding:10px 0;border-top:1px solid #ece7df;color:#1f2937">${escapeHtml(
          item.title ?? ""
        )}</td>
        <td style="padding:10px 0;border-top:1px solid #ece7df;text-align:center;color:#1f2937">${quantity}</td>
        <td style="padding:10px 0;border-top:1px solid #ece7df;text-align:left;color:#1f2937;white-space:nowrap">${formatMoney(
          lineTotal,
          "ar",
          currency
        )}</td>
      </tr>`
    })
    .join("")

  const contactLines = [
    customerName
      ? `<p style="margin:0 0 6px"><strong>الاسم:</strong> ${escapeHtml(
          customerName
        )}</p>`
      : "",
    customerPhone
      ? `<p style="margin:0 0 6px"><strong>الجوال:</strong> <a href="tel:${escapeHtml(
          customerPhone.replace(/[^\d+]/g, "")
        )}" style="color:#0b1020">${escapeHtml(customerPhone)}</a></p>`
      : "",
    customerEmail
      ? `<p style="margin:0 0 6px"><strong>البريد:</strong> <a href="mailto:${escapeHtml(
          customerEmail
        )}" style="color:#0b1020">${escapeHtml(customerEmail)}</a></p>`
      : "",
    addressLines(payload.shipping_address)
      ? `<p style="margin:8px 0 0"><strong>عنوان الشحن:</strong><br/>${addressLines(
          payload.shipping_address
        )}</p>`
      : "",
  ]
    .filter(Boolean)
    .join("")

  const totals = [
    itemTotal > 0
      ? `<tr><td style="padding:4px 0;color:#6b7280">قيمة القطع</td><td style="padding:4px 0;text-align:left;color:#1f2937;white-space:nowrap">${formatMoney(
          itemTotal,
          "ar",
          currency
        )}</td></tr>`
      : "",
    shipping > 0
      ? `<tr><td style="padding:4px 0;color:#6b7280">الشحن</td><td style="padding:4px 0;text-align:left;color:#1f2937;white-space:nowrap">${formatMoney(
          shipping,
          "ar",
          currency
        )}</td></tr>`
      : "",
    `<tr><td style="padding:10px 0 0;border-top:1px solid #ece7df;font-weight:bold;color:#0b1020">الإجمالي</td><td style="padding:10px 0 0;border-top:1px solid #ece7df;text-align:left;font-weight:bold;color:#0b1020;white-space:nowrap">${total}</td></tr>`,
  ]
    .filter(Boolean)
    .join("")

  const html = `<!doctype html>
<html dir="rtl" lang="ar">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>3WEEQ</title>
  </head>
  <body style="margin:0;background:#f4f1ec;padding:24px;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto">
      <tr>
        <td style="background:#0b1020;padding:20px 24px;border-radius:10px 10px 0 0">
          <span style="color:#cd9e61;font-size:20px;letter-spacing:6px;font-weight:bold">3WEEQ</span>
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff;padding:24px;border-radius:0 0 10px 10px;color:#1f2937;font-size:14px;line-height:1.7">
          <p style="margin:0;color:#6b7280;font-size:13px">طلب جديد</p>
          <h1 style="margin:2px 0 0;font-size:26px;color:#0b1020">${escapeHtml(
            orderNumber
          )}</h1>
          ${
            createdAt
              ? `<p style="margin:4px 0 0;color:#6b7280;font-size:13px">${escapeHtml(
                  createdAt
                )} بتوقيت الإمارات</p>`
              : ""
          }

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;background:#faf8f5;border:1px solid #ece7df;border-radius:8px">
            <tr>
              <td style="padding:14px 16px;color:#6b7280;font-size:13px">الإجمالي المدفوع</td>
              <td style="padding:14px 16px;text-align:left;color:#0b1020;font-size:20px;font-weight:bold;white-space:nowrap">${total}</td>
            </tr>
          </table>

          <h2 style="margin:0 0 8px;font-size:15px;color:#0b1020">بيانات العميل</h2>
          <div style="margin:0 0 18px">${
            contactLines ||
            `<p style="margin:0;color:#6b7280">لا توجد بيانات تواصل</p>`
          }</div>

          <h2 style="margin:0 0 6px;font-size:15px;color:#0b1020">القطع</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-size:14px">
            <thead>
              <tr style="color:#6b7280;font-size:12px">
                <th style="padding:0 0 6px;text-align:right;font-weight:normal">القطعة</th>
                <th style="padding:0 0 6px;text-align:center;font-weight:normal">الكمية</th>
                <th style="padding:0 0 6px;text-align:left;font-weight:normal">الإجمالي</th>
              </tr>
            </thead>
            <tbody>${
              itemRows ||
              `<tr><td colspan="3" style="padding:10px 0;border-top:1px solid #ece7df;color:#6b7280">لا توجد قطع</td></tr>`
            }</tbody>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 0;font-size:14px">
            ${totals}
          </table>

          ${
            adminUrl
              ? `<p style="margin:24px 0 0">
                   <a href="${escapeHtml(
                     adminUrl
                   )}" style="display:inline-block;background:#cd9e61;color:#0b1020;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:bold">افتح الطلب في لوحة التحكم</a>
                 </p>`
              : ""
          }

          <p style="margin:24px 0 0;color:#6b7280;font-size:12px">رسالة تلقائية من متجر 3WEEQ${
            customerEmail ? " — الرد على هذه الرسالة يصل إلى بريد العميل." : "."
          }</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const itemLines = items.length
    ? items.map(
        (item) =>
          `- ${item.title ?? ""} × ${Number(item.quantity ?? 0)} — ${formatMoney(
            Number(item.unit_price ?? 0) * Number(item.quantity ?? 0),
            "ar",
            currency
          )}`
      )
    : ["- لا توجد قطع"]

  const text = [
    [
      "طلب جديد — 3WEEQ",
      `رقم الطلب: ${orderNumber}`,
      createdAt ? `التاريخ: ${createdAt} (بتوقيت الإمارات)` : "",
      `الإجمالي المدفوع: ${total}`,
    ]
      .filter(Boolean)
      .join("\n"),
    [
      "بيانات العميل",
      customerName ? `الاسم: ${customerName}` : "",
      customerPhone ? `الجوال: ${customerPhone}` : "",
      customerEmail ? `البريد: ${customerEmail}` : "",
      addressText(payload.shipping_address)
        ? `عنوان الشحن: ${addressText(payload.shipping_address)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    [
      "القطع",
      ...itemLines,
      itemTotal > 0
        ? `قيمة القطع: ${formatMoney(itemTotal, "ar", currency)}`
        : "",
      shipping > 0 ? `الشحن: ${formatMoney(shipping, "ar", currency)}` : "",
      `الإجمالي: ${total}`,
    ]
      .filter(Boolean)
      .join("\n"),
    adminUrl ? `لوحة التحكم: ${adminUrl}` : "",
    customerEmail ? "الرد على هذه الرسالة يصل إلى بريد العميل." : "",
  ]
    .filter(Boolean)
    .join("\n\n")

  return { subject, html, text }
}

/**
 * The operator alert for money that arrived without an order. Written to be
 * read on a phone: what happened, how much, and which cart to open.
 */
function paymentStuckEmail(event: OutboxEvent) {
  const payload = event.payload ?? {}
  const currency = String(payload.currency_code ?? "aed").toUpperCase()
  const amount = formatMoney(payload.amount ?? payload.total, "ar", currency)
  const cartId = String(payload.cart_id ?? payload.order_id ?? "")
  const sessionId = String(payload.payment_session_id ?? "")
  const reason = String(payload.reason ?? "").trim()
  const createdAt = formatDateTime(payload.created_at)
  const subject = `⚠️ دفعة بدون طلب — ${amount}`

  const row = (label: string, value: string) =>
    value
      ? `<tr>
           <td style="padding:6px 0;color:#6b7280">${label}</td>
           <td style="padding:6px 0;color:#1f2937;font-weight:bold;text-align:end;word-break:break-all">${escapeHtml(
             value
           )}</td>
         </tr>`
      : ""

  const html = `<!doctype html>
<html dir="rtl" lang="ar">
  <head><meta charset="utf-8"><title>3WEEQ</title></head>
  <body style="margin:0;background:#0b1020;padding:24px;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">
      <tr>
        <td style="background:#0b1020;color:#cd9e61;padding:20px;font-size:20px;letter-spacing:4px">3WEEQ</td>
      </tr>
      <tr>
        <td style="padding:24px;color:#1f2937;font-size:15px;line-height:1.7">
          <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#b91c1c">دفعة ناجحة لكن الطلب لم يُنشأ</p>
          <p style="margin:0 0 16px">وصلنا تأكيد دفع من Stripe، لكن إنشاء الطلب فشل. المبلغ محتجز لدى Stripe والعميل بلا طلب — تدخّل مطلوب.</p>
          <table role="presentation" width="100%" style="font-size:14px">
            ${row("المبلغ", amount)}
            ${row("السلة", cartId)}
            ${row("جلسة الدفع", sessionId)}
            ${row("الوقت", createdAt)}
            ${row("السبب", reason)}
          </table>
          <p style="margin:16px 0 0;font-size:13px;color:#6b7280">افتح الطلب من Medusa، وتحقّق من Stripe قبل أي استرجاع.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = [
    "دفعة ناجحة لكن الطلب لم يُنشأ — تدخّل مطلوب",
    `المبلغ: ${amount}`,
    cartId ? `السلة: ${cartId}` : "",
    sessionId ? `جلسة الدفع: ${sessionId}` : "",
    createdAt ? `الوقت: ${createdAt}` : "",
    reason ? `السبب: ${reason}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  return { subject, html, text }
}

/** The customer learns the money is coming back without having to ask. */
function refundedEmail(event: OutboxEvent) {
  const payload = event.payload ?? {}
  const locale = payload.locale === "en" ? "en" : "ar"
  const currency = String(payload.currency_code ?? "aed").toUpperCase()
  const amount = formatMoney(payload.amount, locale, currency)
  const orderNumber = payload.display_id
    ? `#${payload.display_id}`
    : String(payload.order_id ?? "")
  const support = supportEmail()

  const copy =
    locale === "ar"
      ? {
          subject: `تم استرجاع مبلغ الطلب ${orderNumber} — 3WEEQ`,
          heading: "تم استرجاع المبلغ",
          intro: `أعدنا لك ${amount} عن الطلب ${orderNumber}. يظهر المبلغ في حسابك حسب مدة إصدار البطاقة، وقد يستغرق من ٥ إلى ١٠ أيام عمل.`,
          footer: `لأي استفسار: ${support}`,
          dir: "rtl",
        }
      : {
          subject: `Refund issued for order ${orderNumber} — 3WEEQ`,
          heading: "Refund issued",
          intro: `We refunded ${amount} for order ${orderNumber}. Your bank decides when it appears — usually within 5 to 10 business days.`,
          footer: `Questions: ${support}`,
          dir: "ltr",
        }

  const html = `<!doctype html>
<html dir="${copy.dir}" lang="${locale}">
  <head><meta charset="utf-8"><title>3WEEQ</title></head>
  <body style="margin:0;background:#0b1020;padding:24px;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">
      <tr>
        <td style="background:#0b1020;color:#cd9e61;padding:20px;font-size:20px;letter-spacing:4px">3WEEQ</td>
      </tr>
      <tr>
        <td style="padding:24px;color:#1f2937;font-size:15px;line-height:1.7">
          <p style="margin:0 0 12px;font-size:18px;font-weight:bold">${copy.heading}</p>
          <p style="margin:0 0 16px">${escapeHtml(copy.intro)}</p>
          <p style="margin:0;font-size:13px;color:#6b7280">${escapeHtml(
            copy.footer
          )}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return {
    subject: copy.subject,
    html,
    text: `${copy.heading}\n\n${copy.intro}\n\n${copy.footer}`,
  }
}

/** The merchant gets the same fact, with the refund id for the books. */
function refundedAdminEmail(event: OutboxEvent) {
  const payload = event.payload ?? {}
  const orderNumber = payload.display_id
    ? `#${payload.display_id}`
    : String(payload.order_id ?? "")
  const amount = formatMoney(
    payload.amount,
    "ar",
    String(payload.currency_code ?? "aed").toUpperCase()
  )
  const refundId = String(payload.refund_id ?? "")
  const subject = `استرجاع على الطلب ${orderNumber} — ${amount}`

  const html = `<!doctype html>
<html dir="rtl" lang="ar">
  <head><meta charset="utf-8"><title>3WEEQ</title></head>
  <body style="margin:0;background:#0b1020;padding:24px;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">
      <tr>
        <td style="background:#0b1020;color:#cd9e61;padding:20px;font-size:20px;letter-spacing:4px">3WEEQ</td>
      </tr>
      <tr>
        <td style="padding:24px;color:#1f2937;font-size:15px;line-height:1.7">
          <p style="margin:0 0 12px;font-size:18px;font-weight:bold">تم تسجيل استرجاع</p>
          <p style="margin:0 0 6px"><strong>الطلب:</strong> ${escapeHtml(
            orderNumber
          )}</p>
          <p style="margin:0 0 6px"><strong>المبلغ:</strong> ${escapeHtml(amount)}</p>
          ${
            refundId
              ? `<p style="margin:0;font-size:13px;color:#6b7280">معرّف الاسترجاع: ${escapeHtml(
                  refundId
                )}</p>`
              : ""
          }
        </td>
      </tr>
    </table>
  </body>
</html>`

  return {
    subject,
    html,
    text: [`تم تسجيل استرجاع — ${orderNumber}`, `المبلغ: ${amount}`, refundId ? `المعرّف: ${refundId}` : ""]
      .filter(Boolean)
      .join("\n"),
  }
}

function templateFor(event: OutboxEvent) {
  switch (event.event_type) {
    case "order.confirmation":
      return orderConfirmationEmail(event)
    case "order.shipped":
      return shippedEmail(event)
    case "order.admin_notification":
      return adminOrderEmail(event)
    case "order.payment_stuck":
      return paymentStuckEmail(event)
    case "order.refunded":
      return refundedEmail(event)
    case "order.refunded_admin":
      return refundedAdminEmail(event)
    default:
      return null
  }
}

/** Exposed so scripts and tests can render without sending anything. */
export function renderOutboxEvent(event: OutboxEvent) {
  return templateFor(event)
}

/**
 * Resend HTTP API (no SDK dependency). Returns `skipped` when no key is set so
 * the outbox job can leave events pending instead of burning retries.
 */
export async function sendOutboxEvent(event: OutboxEvent): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? "3WEEQ <orders@3weeq.ae>"
  const defaultReplyTo = process.env.EMAIL_REPLY_TO ?? "3weeq.971@gmail.com"

  if (!apiKey) {
    return { sent: false, skipped: true, reason: "email_not_configured" }
  }

  // `ORDER_NOTIFICATION_EMAIL` accepts a comma-separated list so the operator
  // can fan an alert out to a shared inbox and a personal one.
  const to = String(event.payload?.email ?? "")
    .split(/[,;]/)
    .map((entry) => emailAddress(entry))
    .filter((entry) => entry.includes("@"))

  if (!to.length) {
    return { sent: false, skipped: true, reason: "missing_recipient" }
  }

  const template = templateFor(event)
  if (!template) {
    return { sent: false, skipped: true, reason: "no_template" }
  }

  // Replying to a new-order alert should reach the buyer, not bounce off the
  // store's own sender address.
  const customerEmail = emailAddress(event.payload?.customer_email)
  const replyTo =
    event.event_type === "order.admin_notification" &&
    customerEmail.includes("@")
      ? customerEmail
      : defaultReplyTo

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
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
