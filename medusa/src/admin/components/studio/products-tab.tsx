import { useEffect, useState, type CSSProperties, type FormEvent } from "react"
import { studioFetch, studioStyles } from "./api"
import { ProductEditor } from "./product-editor"

type ProductRow = {
  product_id: string
  title_ar: string | null
  title_en: string | null
  status: string
  is_serialized: boolean
  edition_size: number | null
  collection_handle: string | null
}

export function ProductsTab() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [handle, setHandle] = useState("")
  const [titleAr, setTitleAr] = useState("")
  const [titleEn, setTitleEn] = useState("")
  const [price, setPrice] = useState("")
  const [sku, setSku] = useState("")

  async function load() {
    try {
      const data = await studioFetch<{ items: ProductRow[] }>(
        "/admin/threeweeq/products?limit=100"
      )
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
      await studioFetch("/admin/threeweeq/products", {
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
      await studioFetch(`/admin/threeweeq/products/${productId}/publish`, {
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

  if (editingId) {
    return (
      <ProductEditor
        productId={editingId}
        onBack={() => {
          setEditingId(null)
          void load()
        }}
      />
    )
  }

  return (
    <div>
      {error && <div style={studioStyles.error}>{error}</div>}

      <form
        onSubmit={handleCreate}
        style={{
          ...studioStyles.card,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
        }}
      >
        <div>
          <label style={studioStyles.label}>handle</label>
          <input placeholder="rafid-2" value={handle} onChange={(e) => setHandle(e.target.value)} style={studioStyles.input} />
        </div>
        <div>
          <label style={studioStyles.label}>العنوان عربي</label>
          <input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} style={studioStyles.input} />
        </div>
        <div>
          <label style={studioStyles.label}>Title (EN)</label>
          <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} style={studioStyles.input} />
        </div>
        <div>
          <label style={studioStyles.label}>SKU</label>
          <input value={sku} onChange={(e) => setSku(e.target.value)} style={studioStyles.input} />
        </div>
        <div>
          <label style={studioStyles.label}>السعر درهم</label>
          <input placeholder="850" value={price} onChange={(e) => setPrice(e.target.value)} style={studioStyles.input} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button type="submit" disabled={busy} style={studioStyles.button}>
            إنشاء منتج
          </button>
        </div>
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
              <td style={{ padding: "8px", textAlign: "right", whiteSpace: "nowrap" }}>
                <button
                  type="button"
                  onClick={() => setEditingId(product.product_id)}
                  style={studioStyles.buttonGray}
                >
                  تعديل
                </button>{" "}
                <button
                  type="button"
                  disabled={busy || product.status === "active"}
                  onClick={() => handlePublish(product.product_id)}
                  style={{
                    ...studioStyles.buttonGreen,
                    opacity: product.status === "active" ? 0.5 : 1,
                    cursor: product.status === "active" ? "default" : "pointer",
                  } as CSSProperties}
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
