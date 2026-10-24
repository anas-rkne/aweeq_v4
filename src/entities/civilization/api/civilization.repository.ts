import "server-only"
import { medusaFetch, MedusaApiError } from "@/shared/lib/medusa"
import { DEFAULT_LOCALE } from "@/shared/lib/config"
import type { CivilizationsResponse, CivilizationProfile } from "@/types"
import type { Result } from "@/entities/product/api/product.repository"

export async function fetchCivilizationsRepository(
  locale: "ar" | "en" = "ar"
): Promise<Result<CivilizationProfile[]>> {
  const search = new URLSearchParams({ locale })
  try {
    const data = await medusaFetch<CivilizationsResponse>(
      `/store/civilizations?${search.toString()}`,
      { next: { tags: ["civilizations"], revalidate: 3600 } }
    )
    return { ok: true, data: data.civilizations }
  } catch (error) {
    const status = error instanceof MedusaApiError ? error.status : 500
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unavailable",
      status,
    }
  }
}
