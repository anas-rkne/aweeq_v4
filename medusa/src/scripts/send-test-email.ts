import type { ExecArgs } from "@medusajs/framework/types"
import { sendOutboxEvent } from "../lib/threeweeq/email"

/**
 * Sends one merchant alert and one customer confirmation to a real inbox so
 * the Resend key, the verified domain, and both templates are proven end to
 * end before the first real order.
 *
 *   TEST_EMAIL_TO=owner@example.com npm run email:test
 */
export default async function sendTestEmail(_args: ExecArgs) {
  const to = String(process.env.TEST_EMAIL_TO ?? "").trim()

  if (!to.includes("@")) {
    throw new Error("TEST_EMAIL_TO is required (a real inbox you can check)")
  }

  const backend = (process.env.MEDUSA_BACKEND_URL ?? "").replace(/\/+$/, "")
  const payload = {
    order_id: "order_test_email",
    display_id: "TEST",
    email: to,
    customer_email: to,
    customer_phone: "+971 50 000 0000",
    customer_name: "Test Customer",
    locale: "ar" as const,
    currency_code: "aed",
    total: 195,
    shipping_total: 35,
    created_at: new Date().toISOString(),
    shipping_address: {
      address_1: "Test address",
      city: "Abu Dhabi",
      country_code: "AE",
    },
    admin_url: backend ? `${backend}/app/orders/order_test_email` : "",
    items: [{ title: "MIKHARIA-45", quantity: 1, unit_price: 160 }],
  }

  const admin = await sendOutboxEvent({
    id: "test-admin",
    event_type: "order.admin_notification",
    payload,
  })
  const customer = await sendOutboxEvent({
    id: "test-customer",
    event_type: "order.confirmation",
    payload,
  })

  console.log(JSON.stringify({ to, admin, customer }, null, 2))

  if (!admin.sent || !customer.sent) {
    throw new Error("At least one test email was not sent; see the result above")
  }
}
