import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react"

export const config = defineRouteConfig({
  label: "3WEEQ Studio",
})

type ProductRow = {
  product_id: string
  title_ar: string | null
  title_en: string | null
  status: string
  is_serialized: boolean
  edition_size: number | null
  collection_handle: string | null
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "14px",
  marginBottom: "10px",
}

const buttonStyle: CSSProperties = {
  padding: "8px 14px",
  border: "none",
  borderRadius: "6px",
  background: "#1c64f2",
  color: "white",
  cursor: "pointer",
  fontSize: "14px",
}

async function apiFetch(path: string, options?: RequestInit) {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? `Request failed (${response.status})`)
  }

  return response.json()
}

function CatalogPage() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [handle, setHandle] = useState("")
  const [titleAr, setTitleAr] = useState("")
  const [titleEn, setTitleEn] = useState("")
  const [price, setPrice] = useState("")
  const [sku, setSku] = useState("")

  async function load() {
    try {
      const data = await apiFetch("/admin/threeweeq/products?limit=100")
      setProducts(data.items ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "load failed")
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    try {
      await apiFetch("/admin/threeweeq/products", {
        method: "POST",
        body: JSON.stringify({
          handle,
          title_ar: titleAr,
          title_en: titleEn,
          variants: [
            {
              title: "100 ml",
              sku: sku || undefined,
              price: Number(price),
              size_ml: 100,
              concentration: "extrait",
            },
          ],
        }),
      })

      setHandle("")
      setTitleAr("")
      setTitleEn("")
      setPrice("")
      setSku("")
      await load()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "create failed")
    } finally {
      setBusy(false)
    }
  }

  async function handlePublish(productId: string) {
    setBusy(true)
    setError(null)
    try {
      await apiFetch(`/admin/threeweeq/products/${productId}/publish`, {
        method: "POST",
        body: "{}",
      })
      await load()
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "publish failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1100px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "16px" }}>3WEEQ Catalog Studio</h1>

      {error && (
        <div
          style={{
            background: "#fde8e8",
            color: "#9b1c1c",
            padding: "10px 12px",
            borderRadius: "6px",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "24px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
        }}
      >
        <input placeholder="handle (rafid-2)" value={handle} onChange={(e) => setHandle(e.target.value)} style={inputStyle} />
        <input placeholder="العنوان عربي" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} style={inputStyle} />
        <input placeholder="Title (EN)" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} style={inputStyle} />
        <input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} style={inputStyle} />
        <input placeholder="السعر درهم (850)" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} />
        <button type="submit" disabled={busy} style={buttonStyle}>
          إنشاء منتج
        </button>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ padding: "8px" }}>العنوان</th>
            <th style={{ padding: "8px" }}>EN</th>
            <th style={{ padding: "8px" }}>الحالة</th>
            <th style={{ padding: "8px" }}>الإصدار</th>
            <th style={{ padding: "8px" }}></th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.product_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "8px" }}>{product.title_ar ?? "—"}</td>
              <td style={{ padding: "8px" }}>{product.title_en ?? "—"}</td>
              <td style={{ padding: "8px" }}>{product.status}</td>
              <td style={{ padding: "8px" }}>
                {product.is_serialized && product.edition_size
                  ? `${product.edition_size} مرقّم`
                  : "—"}
              </td>
              <td style={{ padding: "8px", textAlign: "right" }}>
                <button
                  type="button"
                  disabled={busy || product.status === "active"}
                  onClick={() => handlePublish(product.product_id)}
                  style={{ ...buttonStyle, background: product.status === "active" ? "#6b7280" : "#059669" }}
                >
                  {product.status === "active" ? "منشور" : "نشر"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default CatalogPage
