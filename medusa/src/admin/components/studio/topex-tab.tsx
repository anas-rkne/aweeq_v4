import { useEffect, useState } from "react"
import { studioFetch, studioStyles } from "./api"

type TopexOrder = {
  id: string
  display_id: number
  created_at: string
  total: number
  currency_code: string
  customer_name: string | null
  phone: string | null
  emirate: string | null
  area: string | null
  shipped: boolean
}

const money = new Intl.NumberFormat("ar-AE", {
  style: "currency",
  currency: "AED",
  maximumFractionDigits: 2,
})

/* The courier desk: every paid order with its delivery data and a one-click
   Topex invoice. The AWB itself is entered on the native order page
   (Create fulfillment → tracking number), which also fires the customer's
   tracking email — this tab only hands the paper to Topex. */
export function TopexTab() {
  const [orders, setOrders] = useState<TopexOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await studioFetch<{ orders: TopexOrder[] }>(
        "/admin/threeweeq/topex/orders"
      )
      setOrders(data.orders ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "load failed")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const ready = orders.filter((order) => !order.shipped)

  return (
    <div>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 0 }}>
        الطلبات المدفوعة جاهزة للتسليم لتوبكس. حمّل فاتورة الطلب، سلّمها مع
        الطرد، وبعد الشحن اكتب رقم التتبع من صفحة الطلب الأصلية (Orders →
        Create fulfillment) حتى يصله الإيميل للزبون.
      </p>

      {error && <div style={studioStyles.error}>{error}</div>}

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#6b7280" }}>
          {loading ? "…" : `${ready.length} طلب جاهز للتسليم`}
        </span>
        <button type="button" onClick={() => void load()} style={studioStyles.buttonGray}>
          تحديث
        </button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
        <thead>
          <tr style={{ textAlign: "right", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "8px" }}>الطلب</th>
            <th style={{ padding: "8px" }}>الاسم</th>
            <th style={{ padding: "8px" }}>الهاتف</th>
            <th style={{ padding: "8px" }}>الإمارة</th>
            <th style={{ padding: "8px" }}>المنطقة</th>
            <th style={{ padding: "8px" }}>الإجمالي</th>
            <th style={{ padding: "8px" }}>الحالة</th>
            <th style={{ padding: "8px" }}></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                #{order.display_id}
              </td>
              <td style={{ padding: "8px" }}>{order.customer_name ?? "—"}</td>
              <td style={{ padding: "8px", whiteSpace: "nowrap", direction: "ltr" }}>
                {order.phone ?? "—"}
              </td>
              <td style={{ padding: "8px" }}>{order.emirate ?? "—"}</td>
              <td style={{ padding: "8px" }}>{order.area ?? "—"}</td>
              <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                {money.format(order.total)}
              </td>
              <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                {order.shipped ? (
                  <span style={{ color: "#059669" }}>مشحون</span>
                ) : (
                  <span style={{ color: "#b45309" }}>جاهز</span>
                )}
              </td>
              <td style={{ padding: "8px", textAlign: "left", whiteSpace: "nowrap" }}>
                <a
                  href={`/admin/threeweeq/orders/${order.id}/topex-invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...studioStyles.button, textDecoration: "none", display: "inline-block" }}
                >
                  فاتورة توبكس PDF
                </a>
              </td>
            </tr>
          ))}
          {orders.length === 0 && !loading && (
            <tr>
              <td colSpan={8} style={{ padding: 12, color: "#6b7280" }}>
                لا طلبات مدفوعة بعد.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
