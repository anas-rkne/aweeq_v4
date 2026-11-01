import { useState } from "react"
import { absoluteMediaUrl, studioFetch, studioStyles, studioUpload } from "./api"

type MediaRow = {
  id: string
  url: string
  role?: string
  mime_type?: string
  alt_ar?: string | null
  alt_en?: string | null
}

type MediaAsset = {
  id: string
  url: string
  mime_type?: string
  alt_ar?: string | null
  alt_en?: string | null
}

/* The two kinds of image the storefront treats differently:
   - preview  → the product shots (the main gallery on the piece's page)
   - packaging → the packaging exhibition (its own wall on the piece's page)
   `hero` is not an upload bucket: it is a marker on any preview image. */
const PREVIEW_ROLES = ["gallery", "detail", "editorial", "hero"]
const PACKAGING_ROLES = ["packaging"]

export function MediaTab({
  productId,
  product,
  heroMediaId,
  onChanged,
  onError,
}: {
  productId: string
  product: { media?: MediaRow[] }
  heroMediaId: string | null
  onChanged: () => Promise<void> | void
  onError: (message: string | null) => void
}) {
  const [busy, setBusy] = useState(false)
  const media = product.media ?? []

  async function attach(input: {
    url: string
    mime_type?: string
    bytes?: number
    alt_ar?: string
    alt_en?: string
    role: string
  }) {
    await studioFetch("/admin/threeweeq/media", {
      method: "POST",
      body: JSON.stringify({
        product_id: productId,
        url: input.url,
        mime_type: input.mime_type,
        bytes: input.bytes,
        alt_ar: input.alt_ar || undefined,
        alt_en: input.alt_en || undefined,
        role: input.role,
      }),
    })
  }

  async function setHero(mediaId: string) {
    setBusy(true)
    onError(null)
    try {
      await studioFetch(`/admin/threeweeq/products/${productId}`, {
        method: "PUT",
        body: JSON.stringify({ hero_media_id: mediaId }),
      })
      await onChanged()
    } catch (error) {
      onError(error instanceof Error ? error.message : "تعذّر تعيين الصورة الرئيسية")
    } finally {
      setBusy(false)
    }
  }

  async function remove(mediaId: string, mediaRole?: string) {
    if (!window.confirm("إزالة هذه الصورة من المنتج؟")) {
      return
    }

    setBusy(true)
    onError(null)
    try {
      await studioFetch(
        `/admin/threeweeq/products/${productId}/media/${mediaId}${
          mediaRole ? `?role=${encodeURIComponent(mediaRole)}` : ""
        }`,
        { method: "DELETE" }
      )
      await onChanged()
    } catch (error) {
      onError(error instanceof Error ? error.message : "تعذّر حذف الصورة")
    } finally {
      setBusy(false)
    }
  }

  const preview = media.filter((item) => PREVIEW_ROLES.includes(item.role ?? ""))
  const packaging = media.filter((item) => PACKAGING_ROLES.includes(item.role ?? ""))
  const other = media.filter(
    (item) =>
      !PREVIEW_ROLES.includes(item.role ?? "") &&
      !PACKAGING_ROLES.includes(item.role ?? "")
  )

  return (
    <div>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 0 }}>
        صُور المعاينة تظهر في معرض المنتج، وصُور التغليف تظهر في قسم التغليف الخاص
        به. حدّد صورة المعاينة «رئيسية» لتكون غلاف القطعة.
      </p>

      <MediaGroup
        title="صور المعاينة (معرض المنتج)"
        subtitle="الصورة التي تحمل شارة «رئيسية» هي غلاف القطعة."
        role="gallery"
        rows={preview}
        heroMediaId={heroMediaId}
        showHeroButton
        busy={busy}
        onAttach={attach}
        onSetHero={setHero}
        onRemove={remove}
        onChanged={onChanged}
        onError={onError}
      />

      <MediaGroup
        title="صور التغليف"
        subtitle="العلبة والغلاف والتفاصيل التي تصل مع القطعة."
        role="packaging"
        rows={packaging}
        heroMediaId={null}
        showHeroButton={false}
        busy={busy}
        onAttach={attach}
        onSetHero={setHero}
        onRemove={remove}
        onChanged={onChanged}
        onError={onError}
      />

      {other.length > 0 && (
        <div style={studioStyles.card}>
          <h3 style={{ marginTop: 0 }}>وسائط أخرى</h3>
          <MediaGrid
            rows={other}
            heroMediaId={null}
            showHeroButton={false}
            busy={busy}
            onSetHero={setHero}
            onRemove={remove}
          />
        </div>
      )}
    </div>
  )
}

function MediaGroup({
  title,
  subtitle,
  role,
  rows,
  heroMediaId,
  showHeroButton,
  busy,
  onAttach,
  onSetHero,
  onRemove,
  onChanged,
  onError,
}: {
  title: string
  subtitle: string
  role: string
  rows: MediaRow[]
  heroMediaId: string | null
  showHeroButton: boolean
  busy: boolean
  onAttach: (input: {
    url: string
    mime_type?: string
    bytes?: number
    alt_ar?: string
    alt_en?: string
    role: string
  }) => Promise<void>
  onSetHero: (mediaId: string) => Promise<void>
  onRemove: (mediaId: string, mediaRole?: string) => Promise<void>
  onChanged: () => Promise<void> | void
  onError: (message: string | null) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [altAr, setAltAr] = useState("")
  const [altEn, setAltEn] = useState("")
  const [library, setLibrary] = useState<MediaAsset[] | null>(null)
  const [busyLocal, setBusyLocal] = useState(false)

  const busyAll = busy || busyLocal

  async function uploadAndAttach() {
    if (!file) {
      onError("اختر ملف صورة أولاً.")
      return
    }

    setBusyLocal(true)
    onError(null)
    try {
      const formData = new FormData()
      formData.append("files", file)

      const uploaded = await studioUpload<{
        files?: Array<{ url: string; key?: string; size?: number }>
      }>("/admin/uploads", formData)

      const created = uploaded.files?.[0]
      if (!created?.url) {
        throw new Error("لم يُرجع خادم الملفات رابطاً للصورة.")
      }

      await onAttach({
        url: absoluteMediaUrl(created.url),
        mime_type: file.type,
        bytes: created.size ?? file.size,
        alt_ar: altAr,
        alt_en: altEn,
        role,
      })

      setFile(null)
      setAltAr("")
      setAltEn("")
      await onChanged()
    } catch (error) {
      onError(error instanceof Error ? error.message : "تعذّر رفع الصورة")
    } finally {
      setBusyLocal(false)
    }
  }

  async function openLibrary() {
    setBusyLocal(true)
    onError(null)
    try {
      const data = await studioFetch<{ media: MediaAsset[] }>(
        "/admin/threeweeq/media?limit=40"
      )
      setLibrary(data.media ?? [])
    } catch (error) {
      onError(error instanceof Error ? error.message : "تعذّر تحميل المكتبة")
    } finally {
      setBusyLocal(false)
    }
  }

  async function attachFromLibrary(asset: MediaAsset) {
    setBusyLocal(true)
    onError(null)
    try {
      await onAttach({ url: asset.url, mime_type: asset.mime_type, role })
      await onChanged()
    } catch (error) {
      onError(error instanceof Error ? error.message : "تعذّر ربط الصورة")
    } finally {
      setBusyLocal(false)
    }
  }

  return (
    <div style={studioStyles.card}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: -6 }}>{subtitle}</p>

      <MediaGrid
        rows={rows}
        heroMediaId={showHeroButton ? heroMediaId : null}
        showHeroButton={showHeroButton}
        busy={busyAll}
        onSetHero={onSetHero}
        onRemove={onRemove}
      />

      <h4 style={{ marginBottom: 8 }}>إضافة صورة</h4>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <input
          type="file"
          accept="image/*"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          style={{ fontSize: 13 }}
        />
        <input
          value={altAr}
          onChange={(event) => setAltAr(event.target.value)}
          placeholder="وصف الصورة (عربي)"
          style={studioStyles.input}
        />
        <input
          value={altEn}
          onChange={(event) => setAltEn(event.target.value)}
          placeholder="Image description (EN)"
          style={studioStyles.input}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" disabled={busyAll || !file} onClick={uploadAndAttach} style={studioStyles.button}>
          رفع وإضافة
        </button>
        <button type="button" disabled={busyAll} onClick={openLibrary} style={studioStyles.buttonGray}>
          اختر من المكتبة
        </button>
      </div>

      {library && (
        <div style={{ marginTop: 16, borderTop: "1px solid #eee", paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0 }}>مكتبة الوسائط</h4>
            <button
              type="button"
              onClick={() => setLibrary(null)}
              style={{ ...studioStyles.buttonGray, padding: "4px 8px", fontSize: 12 }}
            >
              إغلاق
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#6b7280" }}>
            ستُضاف الصورة ضمن: <strong>{title}</strong>
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
              gap: 8,
            }}
          >
            {library.map((asset) => (
              <button
                key={asset.id}
                type="button"
                disabled={busyAll}
                onClick={() => attachFromLibrary(asset)}
                style={{ padding: 0, border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer", background: "none" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.url}
                  alt={asset.alt_ar ?? ""}
                  style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }}
                />
              </button>
            ))}
            {library.length === 0 && (
              <p style={{ fontSize: 12, color: "#6b7280" }}>المكتبة فارغة.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MediaGrid({
  rows,
  heroMediaId,
  showHeroButton,
  busy,
  onSetHero,
  onRemove,
}: {
  rows: MediaRow[]
  heroMediaId: string | null
  showHeroButton: boolean
  busy: boolean
  onSetHero: (mediaId: string) => Promise<void>
  onRemove: (mediaId: string, mediaRole?: string) => Promise<void>
}) {
  if (rows.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "#6b7280" }}>
        لا صور بعد — أضف صورة بالأسفل أو اختر من المكتبة.
      </p>
    )
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 12,
        marginBottom: 16,
      }}
    >
      {rows.map((item) => {
        const isHero = showHeroButton && heroMediaId === item.id
        return (
          <div
            key={`${item.id}-${item.role}`}
            style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={item.alt_ar ?? item.alt_en ?? ""}
              style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }}
            />
            <div style={{ padding: 8, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{roleLabel(item.role)}</span>
                {showHeroButton &&
                  (isHero ? (
                    <span style={{ color: "#059669" }}>رئيسية</span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onSetHero(item.id)}
                      style={{ ...studioStyles.buttonGray, padding: "2px 6px", fontSize: 11 }}
                    >
                      رئيسية
                    </button>
                  ))}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => onRemove(item.id, item.role)}
                style={{
                  marginTop: 6,
                  background: "none",
                  border: "none",
                  color: "#9b1c1c",
                  cursor: "pointer",
                  fontSize: 11,
                  padding: 0,
                }}
              >
                إزالة
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function roleLabel(role?: string) {
  switch (role) {
    case "packaging":
      return "تغليف"
    case "gallery":
      return "معاينة"
    case "detail":
      return "تفاصيل"
    case "editorial":
      return "تحريري"
    case "hero":
      return "رئيسية"
    case "video":
      return "فيديو"
    default:
      return role ?? "—"
  }
}
