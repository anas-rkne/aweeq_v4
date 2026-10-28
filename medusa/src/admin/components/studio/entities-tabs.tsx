import { useEffect, useState, type FormEvent } from "react"
import { studioFetch, studioStyles } from "./api"

type Lookup = Record<string, any>

function useList<T>(path: string) {
  const [items, setItems] = useState<T[]>([])
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      const data = await studioFetch<Record<string, T[]>>(path)
      setItems((Object.values(data)[0] as T[]) ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "load failed")
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  return { items, setItems, error, setError, load }
}

function useDelete(resource: string) {
  const [busy, setBusy] = useState(false)

  async function remove(id: string, label: string, onDone: () => void, onError: (message: string) => void) {
    if (!window.confirm(`حذف "${label}"؟ لا يمكن التراجع.`)) {
      return
    }

    setBusy(true)
    try {
      await studioFetch(`/admin/threeweeq/${resource}/${id}`, { method: "DELETE" })
      onDone()
    } catch (error) {
      onError(error instanceof Error ? error.message : "تعذّر الحذف")
    } finally {
      setBusy(false)
    }
  }

  return { busy, remove }
}

function pick(data: FormData, names: string[]) {
  const result: Record<string, unknown> = {}
  for (const name of names) {
    const value = data.get(name)
    result[name] = value === null || value === "" ? null : value
  }
  return result
}

export function CivilizationsTab() {
  const { items, error, setError, load } = useList<Lookup>(
    "/admin/threeweeq/civilizations"
  )
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [editing, setEditing] = useState<Lookup | null>(null)
  const remove = useDelete("civilizations")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const payload = pick(data, [
      "code",
      "name_ar",
      "name_en",
      "subtitle_ar",
      "subtitle_en",
      "description_ar",
      "description_en",
      "story_ar",
      "story_en",
      "seo_title_ar",
      "seo_title_en",
      "seo_description_ar",
      "seo_description_en",
      "accent_color",
      "status",
    ])

    setBusy(true)
    setError(null)
    setSuccess(null)

    try {
      await studioFetch("/admin/threeweeq/civilizations", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          id: editing?.id ?? (data.get("id") || undefined),
          sort_order: Number(data.get("sort_order") ?? 0),
          status: data.get("status") ?? "draft",
        }),
      })
      setSuccess("تم الحفظ")
      setEditing(null)
      await load()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <EntityForm
      title="الحضارات"
      error={error}
      success={success}
      busy={busy}
      editing={editing}
      onEdit={setEditing}
      onCancelEdit={() => setEditing(null)}
      onDelete={(item) =>
        remove.remove(
          String(item.id),
          String(item.name_ar ?? item.name_en ?? item.id),
          () => {
            if (editing?.id === item.id) setEditing(null)
            void load()
          },
          (message) => setError(message)
        )
      }
      onSubmit={handleSubmit}
      fields={[
        { name: "code", label: "Code (babylon)" },
        { name: "name_ar", label: "الاسم عربي" },
        { name: "name_en", label: "Name (EN)" },
        { name: "subtitle_ar", label: "العنوان الفرعي عربي", optional: true },
        { name: "subtitle_en", label: "Subtitle (EN)", optional: true },
        { name: "description_ar", label: "الوصف عربي", area: true, optional: true },
        { name: "description_en", label: "Description (EN)", area: true, optional: true },
        { name: "story_ar", label: "الحكاية عربي", area: true, optional: true },
        { name: "story_en", label: "Story (EN)", area: true, optional: true },
        { name: "seo_title_ar", label: "SEO Title AR", optional: true },
        { name: "seo_title_en", label: "SEO Title EN", optional: true },
        { name: "seo_description_ar", label: "SEO Description AR", area: true, optional: true },
        { name: "seo_description_en", label: "SEO Description EN", area: true, optional: true },
        { name: "accent_color", label: "اللون (hex)", optional: true },
        { name: "sort_order", label: "الترتيب", optional: true },
        { name: "status", label: "الحالة", select: ["draft", "announced", "live", "archived"] },
      ]}
      columns={["name_ar", "name_en", "status", "sort_order"]}
      items={items}
    />
  )
}

export function CollectionsTab() {
  const { items, error, setError, load } = useList<Lookup>(
    "/admin/threeweeq/collections"
  )
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [editing, setEditing] = useState<Lookup | null>(null)
  const remove = useDelete("collections")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const payload = pick(data, [
      "handle",
      "civilization_id",
      "title_ar",
      "title_en",
      "subtitle_ar",
      "subtitle_en",
      "description_ar",
      "description_en",
      "story_ar",
      "story_en",
      "seo_title_ar",
      "seo_title_en",
      "seo_description_ar",
      "seo_description_en",
      "status",
    ])

    setBusy(true)
    setError(null)
    setSuccess(null)

    try {
      await studioFetch("/admin/threeweeq/collections", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          id: editing?.id ?? (data.get("id") || undefined),
          sort_order: Number(data.get("sort_order") ?? 0),
          status: data.get("status") ?? "draft",
        }),
      })
      setSuccess("تم الحفظ")
      setEditing(null)
      await load()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <EntityForm
      title="المجموعات"
      error={error}
      success={success}
      busy={busy}
      editing={editing}
      onEdit={setEditing}
      onCancelEdit={() => setEditing(null)}
      onDelete={(item) =>
        remove.remove(
          String(item.id),
          String(item.title_ar ?? item.title_en ?? item.handle ?? item.id),
          () => {
            if (editing?.id === item.id) setEditing(null)
            void load()
          },
          (message) => setError(message)
        )
      }
      onSubmit={handleSubmit}
      fields={[
        { name: "handle", label: "Handle (rafid)" },
        { name: "civilization_id", label: "civilization_id (babylon)", optional: true },
        { name: "title_ar", label: "العنوان عربي" },
        { name: "title_en", label: "Title (EN)" },
        { name: "subtitle_ar", label: "العنوان الفرعي عربي", optional: true },
        { name: "subtitle_en", label: "Subtitle (EN)", optional: true },
        { name: "description_ar", label: "الوصف عربي", area: true, optional: true },
        { name: "description_en", label: "Description (EN)", area: true, optional: true },
        { name: "story_ar", label: "الحكاية عربي", area: true, optional: true },
        { name: "story_en", label: "Story (EN)", area: true, optional: true },
        { name: "seo_title_ar", label: "SEO Title AR", optional: true },
        { name: "seo_title_en", label: "SEO Title EN", optional: true },
        { name: "seo_description_ar", label: "SEO Description AR", area: true, optional: true },
        { name: "seo_description_en", label: "SEO Description EN", area: true, optional: true },
        { name: "sort_order", label: "الترتيب", optional: true },
        { name: "status", label: "الحالة", select: ["draft", "scheduled", "live", "archived"] },
      ]}
      columns={["title_ar", "title_en", "handle", "status"]}
      items={items}
    />
  )
}

export function TypesTab() {
  const { items, error, setError, load } = useList<Lookup>(
    "/admin/threeweeq/product-types"
  )
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [editing, setEditing] = useState<Lookup | null>(null)
  const remove = useDelete("product-types")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    setBusy(true)
    setError(null)
    setSuccess(null)

    try {
      await studioFetch("/admin/threeweeq/product-types", {
        method: "POST",
        body: JSON.stringify({
          id: editing?.id ?? (data.get("id") || undefined),
          code: data.get("code"),
          name_ar: data.get("name_ar"),
          name_en: data.get("name_en"),
          sort_order: Number(data.get("sort_order") ?? 0),
          is_active: editing ? editing.is_active : data.get("is_active") === "on",
        }),
      })
      setSuccess("تم الحفظ")
      setEditing(null)
      await load()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <EntityForm
      title="أنواع المنتجات"
      error={error}
      success={success}
      busy={busy}
      editing={editing}
      onEdit={setEditing}
      onCancelEdit={() => setEditing(null)}
      onDelete={(item) =>
        remove.remove(
          String(item.id),
          String(item.name_ar ?? item.name_en ?? item.code ?? item.id),
          () => {
            if (editing?.id === item.id) setEditing(null)
            void load()
          },
          (message) => setError(message)
        )
      }
      onSubmit={handleSubmit}
      fields={[
        { name: "code", label: "Code (fragrance)" },
        { name: "name_ar", label: "الاسم عربي" },
        { name: "name_en", label: "Name (EN)" },
        { name: "sort_order", label: "الترتيب", optional: true },
        { name: "is_active", label: "فعّال", checkbox: true },
      ]}
      columns={["name_ar", "name_en", "code", "is_active"]}
      items={items}
    />
  )
}

function EntityForm({
  title,
  error,
  success,
  busy,
  editing,
  onEdit,
  onCancelEdit,
  onDelete,
  onSubmit,
  fields,
  columns,
  items,
}: {
  title: string
  error: string | null
  success: string | null
  busy: boolean
  editing: Lookup | null
  onEdit: (item: Lookup) => void
  onCancelEdit: () => void
  onDelete: (item: Lookup) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  fields: Array<{
    name: string
    label: string
    optional?: boolean
    area?: boolean
    select?: string[]
    checkbox?: boolean
  }>
  columns: string[]
  items: Lookup[]
}) {
  function valueOf(name: string) {
    const value = editing?.[name]
    return value === null || value === undefined ? "" : String(value)
  }

  return (
    <div>
      {error && <div style={studioStyles.error}>{error}</div>}
      {success && <div style={studioStyles.success}>{success}</div>}

      <form
        key={editing?.id ?? "new"}
        onSubmit={onSubmit}
        style={{
          ...studioStyles.card,
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
        }}
      >
        <h3 style={{ gridColumn: "1 / -1", margin: 0 }}>
          {editing
            ? `تعديل: ${editing.name_ar ?? editing.title_ar ?? editing.id}`
            : title}
        </h3>
        {fields.map((field) => (
          <div key={field.name} style={field.area ? { gridColumn: "1 / -1" } : undefined}>
            <label style={studioStyles.label}>{field.label}</label>
            {field.select ? (
              <select
                name={field.name}
                defaultValue={valueOf(field.name) || field.select[0]}
                style={studioStyles.input}
              >
                {field.select.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.checkbox ? (
              <input
                type="checkbox"
                name={field.name}
                defaultChecked={
                  editing ? Boolean(editing[field.name]) : true
                }
                style={{ width: 18, height: 18 }}
              />
            ) : field.area ? (
              <textarea
                name={field.name}
                defaultValue={valueOf(field.name)}
                style={studioStyles.textarea}
              />
            ) : (
              <input
                name={field.name}
                defaultValue={valueOf(field.name)}
                style={studioStyles.input}
              />
            )}
          </div>
        ))}
        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
          <button type="submit" disabled={busy} style={studioStyles.button}>
            {editing ? "حفظ التعديل" : "حفظ"}
          </button>
          {editing && (
            <button type="button" onClick={onCancelEdit} style={studioStyles.buttonGray}>
              إلغاء
            </button>
          )}
        </div>
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
            {columns.map((column) => (
              <th key={column} style={{ padding: 8 }}>
                {column}
              </th>
            ))}
            <th style={{ padding: 8 }}>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id ?? index} style={{ borderBottom: "1px solid #f3f4f6" }}>
              {columns.map((column) => (
                <td key={column} style={{ padding: 8 }}>
                  {String(item[column] ?? "—")}
                </td>
              ))}
              <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  style={{ ...studioStyles.buttonGray, padding: "4px 8px", fontSize: 12, marginRight: 6 }}
                >
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#9b1c1c",
                    cursor: "pointer",
                    fontSize: 12,
                    padding: 0,
                  }}
                >
                  حذف
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
