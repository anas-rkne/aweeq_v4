"use client"

import { useState } from "react"
import { Product, ProductVariant } from "@/types"

interface VariantSelectorProps {
  product: Product
  onVariantChange?: (variant: ProductVariant) => void
}

export function VariantSelector({ product, onVariantChange }: VariantSelectorProps) {
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants?.[0]?.id || ""
  )

  const handleVariantChange = (variant: ProductVariant) => {
    setSelectedVariantId(variant.id)
    if (onVariantChange) {
      onVariantChange(variant)
    }
  }

  if (!product.variants || product.variants.length === 0) {
    return null
  }

  if (product.variants.length === 1) {
    return null
  }

  return (
    <div className="space-y-3" dir="rtl">
      <label className="block font-primary text-sm text-sand/80">
        الحجم / الخيار
      </label>
      <div className="flex flex-wrap gap-2">
        {product.variants.map((variant) => (
          <button
            key={variant.id}
            onClick={() => handleVariantChange(variant)}
            className={`px-4 py-2 border font-primary text-sm transition-all duration-300 ${
              selectedVariantId === variant.id
                ? "border-gold bg-gold/10 text-gold"
                : "border-sand/30 text-sand/70 hover:border-gold/50 hover:text-sand"
            }`}
          >
            {variant.title}
          </button>
        ))}
      </div>
    </div>
  )
}
