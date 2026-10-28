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

const ROLES = ["hero", "gallery", "detail", "packaging", "editorial", "video"]

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
  const [role, setRole] = useState("gallery")
  const [file, setFile] = useState<File | null>(null)
  const [altAr, setAltAr] = useState("")
  const [altEn, setAltEn] = useState("")
  const [library, setLibrary] = useState<MediaAsset[] | null>(null)
  const media = product.media ?? []

  async function attach(input: {
    url: string
    mime_type?: string
    bytes?: number
    alt_ar?: string
    alt_en?: string
    role?: string
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
        role: input.role ?? role,
      }),
    })
  }

  async function uploadAndAttach() {
    if (!file) {
      onError("اختر ملف صورة أولاً.")
      return
    }

    setBusy(true)
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

      await attach({
        url: absoluteMediaUrl(created.url),
        mime_type: file.type,
        bytes: created.size ?? file.size,
        alt_ar: altAr,
        alt_en: altEn,
      })

      setFile(null)
      setAltAr("")
      setAltEn("")
      await onChanged()
    } catch (error) {
      onError(error instanceof Error ? error.message : "تعذّر رفع الصورة")
    } finally {
      setBusy(false)
    }
  }

  async function openLibrary() {
    setBusy(true)
    onError(null)
    try {
      const data = await studioFetch<{ media: MediaAsset[] }>(
        "/admin/threeweeq/media?limit=40"
      )
      setLibrary(data.media ?? [])
    } catch (error) {
      onError(error instanceof Error ? error.message : "تعذّر تحميل المكتبة")
    } finally {
      setBusy(false)
    }
  }

  async function attachFromLibrary(asset: MediaAsset) {
    setBusy(true)
    onError(null)
    try {
      await attach({ url: asset.url, mime_type: asset.mime_type })
      await onChanged()
    } catch (error) {
      onError(error instanceof Error ? error.message : "تعذّر ربط الصورة")
    } finally {
      setBusy(false)
    }
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

  return (
    <div style={studioStyles.card}>
      <h3 style={{ marginTop: 0 }}>صور المنتج</h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {media.map((item) => (
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
                <span>{item.role}</span>
                {heroMediaId === item.id ? (
                  <span style={{ color: "#059669" }}>رئيسية</span>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setHero(item.id)}
                    style={{ ...studioStyles.buttonGray, padding: "2px 6px", fontSize: 11 }}
                  >
                    رئيسية
                  </button>
                )}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(item.id, item.role)}
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
        ))}
        {media.length === 0 && (
          <p style={{ fontSize: 13, color: "#6b7280" }}>
            لا صور بعد. ارفع صورة أو اختر من المكتبة.
          </p>
        )}
      </div>

      <h3>رفع صورة</h3>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginBottom: 10 }}>
        <input
          type="file"
          accept="image/*"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          style={{ fontSize: 13 }}
        />
        <select value={role} onChange={(event) => setRole(event.target.value)} style={studioStyles.input}>
          {ROLES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
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
        <button type="button" disabled={busy || !file} onClick={uploadAndAttach} style={studioStyles.button}>
          رفع وإضافة
        </button>
        <button type="button" disabled={busy} onClick={openLibrary} style={studioStyles.buttonGray}>
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
            سيُضاف الوسيط بالدور المحدد: <strong>{role}</strong>
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
                disabled={busy}
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
