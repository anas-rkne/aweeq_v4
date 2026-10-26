import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useState } from "react"
import { ProductsTab } from "../../components/studio/products-tab"
import {
  CivilizationsTab,
  CollectionsTab,
  TypesTab,
} from "../../components/studio/entities-tabs"

export const config = defineRouteConfig({
  label: "3WEEQ Studio",
})

function CatalogPage() {
  const [tab, setTab] = useState<"products" | "collections" | "civilizations" | "types">(
    "products"
  )

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "22px", marginBottom: "16px" }}>3WEEQ Catalog Studio</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(
          [
            ["products", "المنتجات"],
            ["collections", "المجموعات"],
            ["civilizations", "الحضارات"],
            ["types", "الأنواع"],
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
    </div>
  )
}

export default CatalogPage
