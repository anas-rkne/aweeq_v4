import { useState } from "react"
import { studioFetch, studioStyles } from "./api"

type CoreVariant = {
  id: string
  title?: string | null
  sku?: string | null
  manage_inventory?: boolean | null
  stock_quantity?: number | null
  stock_reserved?: number | null
  low_stock?: boolean | null
  prices?: Array<{ id?: string; amount?: number; currency_code?: string }>
}

function aedPrice(variant: CoreVariant) {
  const price = (variant.prices ?? []).find(
    (entry) => entry.currency_code === "aed"
  )
  return price?.amount ?? ""
}

function stockValue(variant: CoreVariant) {
  if (!variant.manage_inventory) {
    return ""
  }

  return variant.stock_quantity == null ? "" : String(variant.stock_quantity)
}

/**
 * Prices and variants must go through Medusa (not the custom catalog tables),
 * so this tab edits the core product directly and lets the API keep
 * `catalog.variant_profile` in sync. Shelf quantities live in Medusa's
 * Inventory module; the same save writes them.
 */
export function VariantsTab({
  productId,
  variants,
  serializedVariantIds = [],
  onChanged,
  onError,
}: {
  productId: string
  variants: CoreVariant[]
  serializedVariantIds?: string[]
  onChanged: () => Promise<void> | void
  onError: (message: string | null) => void
}) {
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<
    Record<string, { title?: string; price?: string; sku?: string; stock?: string }>
  >({})
  const [newTitle, setNewTitle] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [newSize, setNewSize] = useState("")
  const [newStock, setNewStock] = useState("")

  async function saveVariant(variant: CoreVariant) {
    const values = draft[variant.id] ?? {}
    const price = values.price ?? String(aedPrice(variant) ?? "")

    if (!price || Number(price) <= 0) {
      onError("السعر يجب أن يكون رقماً أكبر من صفر (بالدرهم).")
      return
    }

    const stock =
      values.stock === undefined ? stockValue(variant) : values.stock

    if (stock !== "" && (!/^\d+$/.test(stock.trim()) || Number(stock) < 0)) {
      onError("الكمية يجب أن تكون صفراً أو رقماً صحيحاً موجباً.")
      return
    }

    setBusy(true)
    onError(null)
    try {
      const isSerialized = serializedVariantIds.includes(variant.id)
      const body: Record<string, unknown> = {
        title: values.title ?? variant.title ?? undefined,
        sku: values.sku ?? variant.sku ?? undefined,
        price: Number(price),
      }

      // A serialized piece is sold by its numbers, not a shelf quantity.
      if (!isSerialized) {
        body.stock_quantity = stock.trim() === "" ? null : Number(stock)
      }

      await studioFetch(
        `/admin/threeweeq/products/${productId}/variants/${variant.id}`,
        {
          method: "PUT",
          body: JSON.stringify(body),
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

    if (newStock !== "" && (!/^\d+$/.test(newStock.trim()) || Number(newStock) < 0)) {
      onError("الكمية يجب أن تكون صفراً أو رقماً صحيحاً موجباً.")
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
          stock_quantity: newStock.trim() === "" ? undefined : Number(newStock),
        }),
      })
      setNewTitle("")
      setNewPrice("")
      setNewSize("")
      setNewStock("")
      await onChanged()
    } catch (error) {
      onError(error instanceof Error ? error.message : "تعذّر إضافة المتغير")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={studioStyles.card}>
      <h3 style={{ marginTop: 0 }}>الأسعار والمتغيرات والكمية</h3>
      <p style={{ fontSize: 13, color: "#6b7280" }}>
        السعر بالدرهم الإماراتي، شامل ضريبة القيمة المضافة. الكمية هي عدد
        القطع الموجودة فعلياً في المخزن: اكتبي رقماً ليبدأ العدّاد، ويظهر
        «نفدت الكمية» في المتجر عند وصوله إلى صفر. اتركيها فارغة إذا كانت
        القطعة تُباع بلا حد.
      </p>

      {variants.length === 0 && (
        <p style={{ color: "#9b1c1c", fontSize: 13 }}>
          لا توجد متغيرات في Medusa لهذا المنتج. أضف واحداً بالأسفل.
        </p>
      )}

      {variants.map((variant) => {
        const values = draft[variant.id] ?? {}
        const isSerialized = serializedVariantIds.includes(variant.id)
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
                gridTemplateColumns: "2fr 1fr 1fr 1fr auto auto",
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
              <div>
                <label style={studioStyles.label}>
                  {isSerialized ? "الكمية (بالأرقام)" : "الكمية بالمخزن"}
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  disabled={isSerialized}
                  value={
                    isSerialized
                      ? ""
                      : values.stock ?? stockValue(variant)
                  }
                  placeholder={isSerialized ? "—" : "بلا حد"}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      [variant.id]: {
                        ...previous[variant.id],
                        stock: event.target.value,
                      },
                    }))
                  }
                  style={{
                    ...studioStyles.input,
                    ...(variant.low_stock && !isSerialized
                      ? { borderColor: "#dc2626", background: "#fef2f2" }
                      : {}),
                  }}
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

            {isSerialized && (
              <p style={{ fontSize: 12, color: "#6b7280", margin: "8px 0 0" }}>
                هذه القطعة مرقّمة يدوياً: توفّرها يأتي من الأرقام المولّدة، لا
                من كمية المخزن.
              </p>
            )}

            {!isSerialized && variant.manage_inventory && (
              <p
                style={{
                  fontSize: 12,
                  margin: "8px 0 0",
                  color: variant.stock_quantity === 0 ? "#9b1c1c" : "#b45309",
                }}
              >
                {variant.stock_quantity === 0
                  ? "نفدت الكمية — يظهر في المتجر «نفدت الكمية» حتى تكتبي رقماً جديداً."
                  : `مخزون منخفض: متبقي ${variant.stock_quantity} قطع.`}
                {variant.stock_reserved
                  ? ` (${variant.stock_reserved} محجوزة لطلبات لم تُشحن بعد)`
                  : ""}
              </p>
            )}
          </div>
        )
      })}

      <h3>إضافة متغير</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
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
        <div>
          <label style={studioStyles.label}>الكمية بالمخزن</label>
          <input
            type="number"
            min={0}
            step={1}
            value={newStock}
            onChange={(event) => setNewStock(event.target.value)}
            placeholder="بلا حد"
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
