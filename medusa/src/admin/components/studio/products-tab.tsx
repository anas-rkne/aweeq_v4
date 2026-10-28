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

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  active: "منشور",
  archived: "مؤرشف",
}

export function ProductsTab() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [count, setCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")

  const [handle, setHandle] = useState("")
  const [titleAr, setTitleAr] = useState("")
  const [titleEn, setTitleEn] = useState("")
  const [price, setPrice] = useState("")
  const [sku, setSku] = useState("")

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: "100" })
      if (q.trim()) params.set("q", q.trim())
      if (status) params.set("status", status)

      const data = await studioFetch<{ items: ProductRow[]; count: number }>(
        `/admin/threeweeq/products?${params.toString()}`
      )
      setProducts(data.items ?? [])
      setCount(data.count ?? data.items?.length ?? 0)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "load failed")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void load()
    }, q ? 300 : 0)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setSuccess(null)

    if (!handle.trim() || !titleAr.trim() || !titleEn.trim()) {
      setError("handle والعنوان العربي والإنجليزي مطلوبة.")
      setBusy(false)
      return
    }

    if (!price || Number(price) <= 0) {
      setError("السعر مطلوب بالدرهم (أكبر من صفر).")
      setBusy(false)
      return
    }

    try {
      const created = await studioFetch<{ product: { profile: { product_id: string } } }>(
        "/admin/threeweeq/products",
        {
          method: "POST",
          body: JSON.stringify({
            handle: handle.trim().toLowerCase(),
            title_ar: titleAr.trim(),
            title_en: titleEn.trim(),
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
        }
      )

      setHandle("")
      setTitleAr("")
      setTitleEn("")
      setPrice("")
      setSku("")
      setSuccess("تم إنشاء المنتج — أكمل الصور والنشر من صفحته.")
      await load()

      const newId = created?.product?.profile?.product_id
      if (newId) {
        setEditingId(newId)
      }
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "create failed")
    } finally {
      setBusy(false)
    }
  }

  async function handlePublish(productId: string) {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await studioFetch(`/admin/threeweeq/products/${productId}/publish`, {
        method: "POST",
        body: "{}",
      })
      setSuccess("تم النشر — سيظهر في المتجر خلال ثوانٍ.")
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
      {success && <div style={studioStyles.success}>{success}</div>}

      <form
        onSubmit={handleCreate}
        style={{
          ...studioStyles.card,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
        }}
      >
        <h3 style={{ gridColumn: "1 / -1", margin: 0 }}>منتج جديد</h3>
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

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <label style={studioStyles.label}>بحث</label>
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="اسم المنتج عربي أو إنجليزي"
            style={{ ...studioStyles.input, marginBottom: 0 }}
          />
        </div>
        <div style={{ width: 180 }}>
          <label style={studioStyles.label}>الحالة</label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            style={{ ...studioStyles.input, marginBottom: 0 }}
          >
            <option value="">الكل</option>
            <option value="draft">مسودة</option>
            <option value="active">منشور</option>
            <option value="archived">مؤرشف</option>
          </select>
        </div>
        <span style={{ fontSize: 13, color: "#6b7280", paddingBottom: 8 }}>
          {loading ? "…" : `${count} منتج`}
        </span>
      </div>

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
              <td style={{ padding: "8px" }}>
                {STATUS_LABELS[product.status] ?? product.status}
              </td>
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
          {products.length === 0 && !loading && (
            <tr>
              <td colSpan={5} style={{ padding: 12, color: "#6b7280" }}>
                لا منتجات مطابقة.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
