import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useEffect, useState } from "react"
import { ProductsTab } from "../../components/studio/products-tab"
import {
  CivilizationsTab,
  CollectionsTab,
  TypesTab,
} from "../../components/studio/entities-tabs"
import { TopexTab } from "../../components/studio/topex-tab"
import { studioFetch } from "../../components/studio/api"

export const config = defineRouteConfig({
  label: "3WEEQ Studio",
})

type LowStockItem = {
  variant_id: string
  product_title: string | null
  variant_title: string | null
  available: number
}

/* The owner asked to be told when a piece is down to its last few units.
   The threshold lives on the server (3) so it stays in one place. */
function LowStockBanner() {
  const [items, setItems] = useState<LowStockItem[]>([])
  const [threshold, setThreshold] = useState(3)

  async function load() {
    try {
      const data = await studioFetch<{
        items: LowStockItem[]
        threshold: number
      }>("/admin/threeweeq/inventory/low-stock")
      setItems(data.items ?? [])
      setThreshold(data.threshold ?? 3)
    } catch {
      /* the banner is a convenience: never block the catalog on it */
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (!items.length) {
    return null
  }

  const empty = items.filter((item) => item.available === 0)
  const low = items.filter((item) => item.available > 0)

  return (
    <div
      style={{
        border: "1px solid #f59e0b",
        background: "#fffbeb",
        color: "#7c2d12",
        padding: "10px 14px",
        borderRadius: 8,
        marginBottom: 16,
        fontSize: 13,
        lineHeight: 1.9,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <strong>تنبيه المخزون ({threshold} أو أقل)</strong>
        <button
          type="button"
          onClick={() => void load()}
          style={{
            border: "1px solid #f59e0b",
            background: "#ffffff",
            color: "#7c2d12",
            borderRadius: 6,
            padding: "2px 10px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          تحديث
        </button>
      </div>

      {empty.length > 0 && (
        <div>
          نفدت:{" "}
          {empty
            .map((item) =>
              [item.product_title, item.variant_title]
                .filter(Boolean)
                .join(" — ")
            )
            .join("، ")}
        </div>
      )}

      {low.length > 0 && (
        <div>
          على وشك النفاد:{" "}
          {low
            .map(
              (item) =>
                `${[item.product_title, item.variant_title]
                  .filter(Boolean)
                  .join(" — ")} (${item.available})`
            )
            .join("، ")}
        </div>
      )}
    </div>
  )
}

function CatalogPage() {
  const [tab, setTab] = useState<
    "products" | "collections" | "civilizations" | "types" | "topex"
  >("products")

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "16px" }}>3WEEQ Catalog Studio</h1>

      <LowStockBanner />

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(
          [
            ["products", "المنتجات"],
            ["collections", "المجموعات"],
            ["civilizations", "الحضارات"],
            ["types", "الأنواع"],
            ["topex", "توبكس"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            style={{
              padding: "8px 14px",
              border: "none",
              borderRadius: "6px",
              background: tab === key ? "#1c64f2" : "#e5e7eb",
              color: tab === key ? "#ffffff" : "#374151",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "products" && <ProductsTab />}
      {tab === "collections" && <CollectionsTab />}
      {tab === "civilizations" && <CivilizationsTab />}
      {tab === "types" && <TypesTab />}
      {tab === "topex" && <TopexTab />}
    </div>
  )
}

export default CatalogPage

