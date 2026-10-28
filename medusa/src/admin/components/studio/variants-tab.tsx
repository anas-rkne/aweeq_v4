import { useState } from "react"
import { studioFetch, studioStyles } from "./api"

type CoreVariant = {
  id: string
  title?: string | null
  sku?: string | null
  prices?: Array<{ id?: string; amount?: number; currency_code?: string }>
}

function aedPrice(variant: CoreVariant) {
  const price = (variant.prices ?? []).find(
    (entry) => entry.currency_code === "aed"
  )
  return price?.amount ?? ""
}

/**
 * Prices and variants must go through Medusa (not the custom catalog tables),
 * so this tab edits the core product directly and lets the API keep
 * `catalog.variant_profile` in sync.
 */
export function VariantsTab({
  productId,
  variants,
  onChanged,
  onError,
}: {
  productId: string
  variants: CoreVariant[]
  onChanged: () => Promise<void> | void
  onError: (message: string | null) => void
}) {
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<Record<string, { title?: string; price?: string; sku?: string }>>({})
  const [newTitle, setNewTitle] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [newSize, setNewSize] = useState("")

  async function saveVariant(variant: CoreVariant) {
    const values = draft[variant.id] ?? {}
    const price = values.price ?? String(aedPrice(variant) ?? "")

    if (!price || Number(price) <= 0) {
      onError("السعر يجب أن يكون رقماً أكبر من صفر (بالدرهم).")
      return
    }

    setBusy(true)
    onError(null)
    try {
      await studioFetch(
        `/admin/threeweeq/products/${productId}/variants/${variant.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            title: values.title ?? variant.title ?? undefined,
            sku: values.sku ?? variant.sku ?? undefined,
            price: Number(price),
          }),
        }
      )
      setDraft((previous) => {
        const next = { ...previous }
        delete next[variant.id]
        return next
      })
      await onChanged()
    } catch (error) {
      onError(error instanceof Error ? error.message : "تعذّر حفظ السعر")
    } finally {
      setBusy(false)
    }
  }

  async function removeVariant(variant: CoreVariant) {
    if (variants.length <= 1) {
      onError("لا يمكن حذف المتغير الوحيد. أضف بديلاً أولاً.")
      return
    }

    if (
      !window.confirm(
        `حذف المتغير "${variant.title ?? variant.id}"؟ لا يمكن التراجع.`
      )
    ) {
      return
    }

    setBusy(true)
    onError(null)
    try {
      await studioFetch(
        `/admin/threeweeq/products/${productId}/variants/${variant.id}`,
        { method: "DELETE" }
      )
      await onChanged()
    } catch (error) {
      onError(error instanceof Error ? error.message : "تعذّر حذف المتغير")
    } finally {
      setBusy(false)
    }
  }

  async function addVariant() {
    if (!newTitle.trim()) {
      onError("اسم المتغير مطلوب (مثال: 100 ml).")
      return
    }

    if (!newPrice || Number(newPrice) <= 0) {
      onError("السعر مطلوب بالدرهم.")
      return
    }

    setBusy(true)
    onError(null)
    try {
      await studioFetch(`/admin/threeweeq/products/${productId}/variants`, {
        method: "POST",
        body: JSON.stringify({
          title: newTitle.trim(),
          price: Number(newPrice),
          size_ml: newSize ? Number(newSize) : undefined,
        }),
      })
      setNewTitle("")
      setNewPrice("")
      setNewSize("")
      await onChanged()
    } catch (error) {
      onError(error instanceof Error ? error.message : "تعذّر إضافة المتغير")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={studioStyles.card}>
      <h3 style={{ marginTop: 0 }}>الأسعار والمتغيرات</h3>
      <p style={{ fontSize: 13, color: "#6b7280" }}>
        السعر بالدرهم الإماراتي، شامل ضريبة القيمة المضافة. تعديل السعر هنا
        يُحدّث المتجر مباشرة بعد الحفظ.
      </p>

      {variants.length === 0 && (
        <p style={{ color: "#9b1c1c", fontSize: 13 }}>
          لا توجد متغيرات في Medusa لهذا المنتج. أضف واحداً بالأسفل.
        </p>
      )}

      {variants.map((variant) => {
        const values = draft[variant.id] ?? {}
        return (
          <div
            key={variant.id}
            style={{
              border: "1px solid #eee",
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr auto auto",
                gap: 10,
                alignItems: "end",
              }}
            >
              <div>
                <label style={studioStyles.label}>الاسم</label>
                <input
                  value={values.title ?? variant.title ?? ""}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      [variant.id]: {
                        ...previous[variant.id],
                        title: event.target.value,
                      },
                    }))
                  }
                  style={studioStyles.input}
                />
              </div>
              <div>
                <label style={studioStyles.label}>السعر (AED)</label>
                <input
                  type="number"
                  step="0.01"
                  value={values.price ?? String(aedPrice(variant))}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      [variant.id]: {
                        ...previous[variant.id],
                        price: event.target.value,
                      },
                    }))
                  }
                  style={studioStyles.input}
                />
              </div>
              <div>
                <label style={studioStyles.label}>SKU</label>
                <input
                  value={values.sku ?? variant.sku ?? ""}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      [variant.id]: {
                        ...previous[variant.id],
                        sku: event.target.value,
                      },
                    }))
                  }
                  style={studioStyles.input}
                />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => saveVariant(variant)}
                style={studioStyles.button}
              >
                حفظ
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => removeVariant(variant)}
                style={{ ...studioStyles.buttonGray, color: "#9b1c1c" }}
              >
                حذف
              </button>
            </div>
          </div>
        )
      })}

      <h3>إضافة متغير</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr auto",
          gap: 10,
          alignItems: "end",
        }}
      >
        <div>
          <label style={studioStyles.label}>الاسم</label>
          <input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="100 ml"
            style={studioStyles.input}
          />
        </div>
        <div>
          <label style={studioStyles.label}>السعر (AED)</label>
          <input
            type="number"
            step="0.01"
            value={newPrice}
            onChange={(event) => setNewPrice(event.target.value)}
            placeholder="850"
            style={studioStyles.input}
          />
        </div>
        <div>
          <label style={studioStyles.label}>الحجم (ml)</label>
          <input
            type="number"
            value={newSize}
            onChange={(event) => setNewSize(event.target.value)}
            placeholder="100"
            style={studioStyles.input}
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={addVariant}
          style={studioStyles.buttonGreen}
        >
          إضافة
        </button>
      </div>
    </div>
  )
}
