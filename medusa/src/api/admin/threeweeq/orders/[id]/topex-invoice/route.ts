import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { buildTopexInvoice } from "../../../../../../lib/threeweeq/topex-invoice"

/* GET /admin/threeweeq/orders/:id/topex-invoice
   The Topex delivery sheet for one order, as a PDF download. The studio's
   «توبكس» tab points its per-order button here, so printing or forwarding the
   sheet to the courier is one click and zero re-typing. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const orderId = String(req.params.id ?? "")

  if (!orderId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "order id is required"
    )
  }

  const built = await buildTopexInvoice(req.scope, orderId)

  if (!built) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order not found")
  }

  const filename = `3WEEQ-Topex-${built.order.display_id}.pdf`

  res.setHeader("Content-Type", "application/pdf")
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(filename)}"`
  )
  res.send(built.buffer)
}
