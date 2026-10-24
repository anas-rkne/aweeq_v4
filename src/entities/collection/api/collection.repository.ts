import "server-only"
import { medusaFetch, MedusaApiError } from "@/shared/lib/medusa"
import { DEFAULT_LOCALE } from "@/shared/lib/config"
import type { CollectionsResponse, CollectionProfile } from "@/types"
import type { Result } from "@/entities/product/api/product.repository"

export async function fetchCollectionsRepository(
  locale: "ar" | "en" = "ar"
): Promise<Result<CollectionProfile[]>> {
  const search = new URLSearchParams({ locale })
  try {
    const data = await medusaFetch<CollectionsResponse>(
      `/store/threeweeq/collections?${search.toString()}`,
      { next: { tags: ["collections"], revalidate: 3600 } }
    )
    return { ok: true, data: data.collections }
  } catch (error) {
    const status = error instanceof MedusaApiError ? error.status : 500
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unavailable",
      status,
    }
  }
}
