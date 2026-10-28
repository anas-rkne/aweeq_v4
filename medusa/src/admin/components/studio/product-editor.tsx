import { useEffect, useState } from "react"
import { studioFetch, studioStyles } from "./api"
import { MediaTab } from "./media-tab"
import { VariantsTab } from "./variants-tab"

type Translation = Record<string, any>
type MediaRow = Record<string, any>
type VariantRow = Record<string, any>

type CoreVariant = {
  id: string
  title?: string | null
  sku?: string | null
  prices?: Array<{ id?: string; amount?: number; currency_code?: string }>
}

type ProductAdmin = {
  profile: Record<string, any>
  translations: Translation[]
  variantProfiles: VariantRow[]
  media: MediaRow[]
  core?: {
    id: string
    title?: string
    handle?: string
    status?: string
    thumbnail?: string | null
    variants?: CoreVariant[]
    options?: Array<{ id: string; title: string; values?: Array<{ value: string }> }>
  } | null
}

type MediaAsset = {
  id: string
  url: string
  mime_type?: string
  alt_ar?: string | null
  alt_en?: string | null
}

type Lookup = { id: string; name_ar?: string; name_en?: string; title_ar?: string; title_en?: string }

export function ProductEditor({
  productId,
  onBack,
}: {
  productId: string
  onBack: () => void
}) {
  const [product, setProduct] = useState<ProductAdmin | null>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [tab, setTab] = useState<
    "basic" | "ar" | "en" | "edition" | "variants" | "media" | "serials"
  >("basic")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [civilizations, setCivilizations] = useState<Lookup[]>([])
  const [collections, setCollections] = useState<Lookup[]>([])
  const [productTypes, setProductTypes] = useState<Lookup[]>([])

  async function load() {
    try {
      const data = await studioFetch<ProductAdmin>(
        `/admin/threeweeq/products/${productId}`
      )
      setProduct(data)

      const translationByLocale: Record<string, Translation> = {}
      for (const translation of data.translations ?? []) {
        translationByLocale[translation.locale] = translation
      }

      setForm({
        ...data.profile,
        title_ar: translationByLocale.ar?.title ?? "",
        title_en: translationByLocale.en?.title ?? "",
        subtitle_ar: translationByLocale.ar?.subtitle ?? "",
        subtitle_en: translationByLocale.en?.subtitle ?? "",
        short_description_ar: translationByLocale.ar?.short_description ?? "",
        short_description_en: translationByLocale.en?.short_description ?? "",
        description_ar: translationByLocale.ar?.description ?? "",
        description_en: translationByLocale.en?.description ?? "",
        story_ar: translationByLocale.ar?.story ?? "",
        story_en: translationByLocale.en?.story ?? "",
        ingredients_ar: translationByLocale.ar?.ingredients ?? "",
        ingredients_en: translationByLocale.en?.ingredients ?? "",
        ritual_ar: translationByLocale.ar?.ritual ?? "",
        ritual_en: translationByLocale.en?.ritual ?? "",
        seo_title_ar: translationByLocale.ar?.seo_title ?? "",
        seo_title_en: translationByLocale.en?.seo_title ?? "",
        seo_description_ar: translationByLocale.ar?.seo_description ?? "",
        seo_description_en: translationByLocale.en?.seo_description ?? "",
        olfactory_pyramid:
          typeof data.profile.olfactory_pyramid === "string"
            ? JSON.parse(data.profile.olfactory_pyramid || "{}")
            : data.profile.olfactory_pyramid ?? {},
        specifications:
          typeof data.profile.specifications === "string"
            ? JSON.parse(data.profile.specifications || "{}")
            : data.profile.specifications ?? {},
      })

      const [civs, cols, types] = await Promise.all([
        studioFetch<{ civilizations: Lookup[] }>("/admin/threeweeq/civilizations"),
        studioFetch<{ collections: Lookup[] }>("/admin/threeweeq/collections"),
        studioFetch<{ product_types: Lookup[] }>("/admin/threeweeq/product-types"),
      ])

      setCivilizations(civs.civilizations ?? [])
      setCollections(cols.collections ?? [])
      setProductTypes(types.product_types ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "load failed")
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  function update(key: string, value: any) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  async function handleSave() {
    setBusy(true)
    setError(null)
    setSuccess(null)

    try {
      await studioFetch(`/admin/threeweeq/products/${productId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          olfactory_pyramid: form.olfactory_pyramid,
          specifications: form.specifications,
        }),
      })
      setSuccess("تم الحفظ")
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "save failed")
    } finally {
      setBusy(false)
    }
  }

  async function handlePublish() {
    setBusy(true)
    setError(null)
    try {
      await studioFetch(`/admin/threeweeq/products/${productId}/publish`, {
        method: "POST",
        body: "{}",
      })
      setSuccess("تم النشر")
      await load()
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "publish failed")
    } finally {
      setBusy(false)
    }
  }

  if (!product) {
    return (
      <div style={{ padding: 24 }}>
        <p>Loading…</p>
        <button type="button" onClick={onBack} style={studioStyles.buttonGray}>
          رجوع
        </button>
      </div>
    )
  }

  const pyramid = (form.olfactory_pyramid ?? {}) as Record<string, string[]>
  const specs = (form.specifications ?? {}) as Record<string, any>

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <button type="button" onClick={onBack} style={studioStyles.buttonGray}>
          ← رجوع
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" disabled={busy} onClick={handleSave} style={studioStyles.button}>
            حفظ
          </button>
          <button
            type="button"
            disabled={busy || form.status === "active"}
            onClick={handlePublish}
            style={studioStyles.buttonGreen}
          >
            {form.status === "active" ? "منشور" : "نشر"}
          </button>
        </div>
      </div>

      {error && <div style={studioStyles.error}>{error}</div>}
      {success && <div style={studioStyles.success}>{success}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(
          [
            ["basic", "أساسي"],
            ["ar", "عربي"],
            ["en", "English"],
            ["edition", "الإصدار"],
            ["variants", "الأسعار"],
            ["media", "الوسائط"],
            ["serials", "الأرقام"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            style={tab === key ? studioStyles.button : studioStyles.buttonGray}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "basic" && (
        <div style={studioStyles.card}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div>
              <label style={studioStyles.label}>الحضارة</label>
              <select
                value={form.civilization_id ?? ""}
                onChange={(e) => update("civilization_id", e.target.value || null)}
                style={studioStyles.input}
              >
                <option value="">—</option>
                {civilizations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name_ar ?? item.name_en ?? item.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={studioStyles.label}>المجموعة</label>
              <select
                value={form.collection_id ?? ""}
                onChange={(e) => update("collection_id", e.target.value || null)}
                style={studioStyles.input}
              >
                <option value="">—</option>
                {collections.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title_ar ?? item.title_en ?? item.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={studioStyles.label}>النوع</label>
              <select
                value={form.product_type_id ?? ""}
                onChange={(e) => update("product_type_id", e.target.value || null)}
                style={studioStyles.input}
              >
                <option value="">—</option>
                {productTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name_ar ?? item.name_en ?? item.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={Boolean(form.is_limited)}
              onChange={(e) => update("is_limited", e.target.checked)}
            />
            إصدار محدود
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={Boolean(form.is_serialized)}
              onChange={(e) => update("is_serialized", e.target.checked)}
            />
            مرقّم يدوياً
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div>
              <label style={studioStyles.label}>حجم الإصدار</label>
              <input
                type="number"
                value={form.edition_size ?? ""}
                onChange={(e) =>
                  update("edition_size", e.target.value ? Number(e.target.value) : null)
                }
                style={studioStyles.input}
              />
            </div>
            <div>
              <label style={studioStyles.label}>الحد لكل عميل</label>
              <input
                type="number"
                value={form.max_per_customer ?? ""}
                onChange={(e) =>
                  update("max_per_customer", e.target.value ? Number(e.target.value) : null)
                }
                style={studioStyles.input}
              />
            </div>
            <div>
              <label style={studioStyles.label}>تاريخ الإطلاق</label>
              <input
                type="datetime-local"
                value={
                  form.launch_at
                    ? String(form.launch_at).slice(0, 16)
                    : ""
                }
                onChange={(e) => update("launch_at", e.target.value || null)}
                style={studioStyles.input}
              />
            </div>
          </div>
        </div>
      )}

      {(tab === "ar" || tab === "en") && (
        <div style={studioStyles.card}>
          {[
            ["title", "العنوان", false],
            ["subtitle", "العنوان الفرعي", false],
            ["short_description", "الوصف المختصر", true],
            ["description", "الوصف", true],
            ["story", "الحكاية", true],
            ["ingredients", "المكونات", true],
            ["ritual", "طريقة الاستخدام", true],
            ["seo_title", "SEO Title", false],
            ["seo_description", "SEO Description", true],
          ].map(([key, label, multiline]) => (
            <div key={key}>
              <label style={studioStyles.label}>{label}</label>
              {multiline ? (
                <textarea
                  value={form[`${key}_${tab}`] ?? ""}
                  onChange={(e) => update(`${key}_${tab}`, e.target.value)}
                  style={studioStyles.textarea}
                />
              ) : (
                <input
                  value={form[`${key}_${tab}`] ?? ""}
                  onChange={(e) => update(`${key}_${tab}`, e.target.value)}
                  style={studioStyles.input}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "edition" && (
        <div style={studioStyles.card}>
          <h3 style={{ marginTop: 0 }}>الهرم العطري</h3>
          {(["top", "heart", "base"] as const).map((group) => (
            <div key={group}>
              <label style={studioStyles.label}>
                {group === "top" ? "المقدمة" : group === "heart" ? "القلب" : "القاعدة"}
              </label>
              <input
                value={(pyramid[group] ?? []).join(", ")}
                onChange={(e) =>
                  update("olfactory_pyramid", {
                    ...pyramid,
                    [group]: e.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                style={studioStyles.input}
                placeholder="saffron, incense, bergamot"
              />
            </div>
          ))}

          <h3>المواصفات</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div>
              <label style={studioStyles.label}>التركيز</label>
              <input
                value={specs.concentration ?? ""}
                onChange={(e) =>
                  update("specifications", { ...specs, concentration: e.target.value })
                }
                style={studioStyles.input}
              />
            </div>
            <div>
              <label style={studioStyles.label}>المصدر</label>
              <input
                value={specs.origin ?? ""}
                onChange={(e) =>
                  update("specifications", { ...specs, origin: e.target.value })
                }
                style={studioStyles.input}
              />
            </div>
            <div>
              <label style={studioStyles.label}>الإصدار</label>
              <input
                value={specs.edition ?? ""}
                onChange={(e) =>
                  update("specifications", { ...specs, edition: e.target.value })
                }
                style={studioStyles.input}
              />
            </div>
          </div>
        </div>
      )}

      {tab === "variants" && (
        <VariantsTab
          productId={productId}
          variants={product.core?.variants ?? []}
          onChanged={load}
          onError={setError}
        />
      )}

      {tab === "media" && (
        <MediaTab
          productId={productId}
          product={product}
          heroMediaId={form.hero_media_id ?? null}
          onChanged={load}
          onError={setError}
        />
      )}

      {tab === "serials" && (
        <div style={studioStyles.card}>
          <h3 style={{ marginTop: 0 }}>الأرقام التسلسلية</h3>
          {(product.variantProfiles ?? []).map((variant) => (
            <SerialRow key={variant.variant_id} variant={variant} />
          ))}
        </div>
      )}
    </div>
  )
}

function SerialRow({ variant }: { variant: VariantRow }) {
  const [editionSize, setEditionSize] = useState(variant.edition_size ?? 500)
  const [status, setStatus] = useState<Record<string, any>[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function loadStatus() {
    try {
      const data = await studioFetch<{ by_status: Record<string, any>[] }>(
        `/admin/threeweeq/serials?variant_id=${encodeURIComponent(variant.variant_id)}`
      )
      setStatus(data.by_status ?? [])
    } catch {}
  }

  useEffect(() => {
    void loadStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant.variant_id])

  async function generate() {
    setBusy(true)
    setError(null)
    try {
      await studioFetch("/admin/threeweeq/serials", {
        method: "POST",
        body: JSON.stringify({
          variant_id: variant.variant_id,
          edition_size: Number(editionSize),
        }),
      })
      await loadStatus()
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <p style={{ marginTop: 0 }}>
        <strong>{variant.variant_id}</strong> — size_ml: {variant.size_ml ?? "—"}
      </p>
      {status && status.length > 0 && (
        <p style={{ fontSize: 13 }}>
          {status.map((row) => `${row.status}: ${row.count}`).join(" · ")}
        </p>
      )}
      {error && <p style={{ color: "#9b1c1c", fontSize: 13 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="number"
          value={editionSize}
          onChange={(e) => setEditionSize(Number(e.target.value))}
          style={{ ...studioStyles.input, width: 120, marginBottom: 0 }}
        />
        <button type="button" disabled={busy} onClick={generate} style={studioStyles.button}>
          توليد الأرقام
        </button>
      </div>
    </div>
  )
}
