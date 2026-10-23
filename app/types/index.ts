export interface ProductMedia {
  id: string
  product_id: string
  role: "hero" | "gallery" | "detail" | "packaging" | "editorial" | "video" | string
  sort_order?: number
  url: string
  mime_type?: string | null
  width?: number | null
  height?: number | null
  bytes?: number | null
  alt?: string | null
  alt_ar?: string | null
  alt_en?: string | null
  blurhash?: string | null
  focal_x?: number | null
  focal_y?: number | null
  metadata?: Record<string, unknown> | null
}

export interface ProductImage {
  id: string
  url: string
  rank?: number
}

export interface ProductPrice {
  amount: number
  currency_code: string
  min_quantity?: number
  max_quantity?: number | null
}

export interface ProductVariant {
  id: string
  title: string
  sku?: string | null
  size_ml?: number | null
  concentration?: string | null
  packaging?: string | null
  is_serialized?: boolean
  edition_size?: number | null
  available_serial_units?: number | null
  in_stock: boolean
  manage_inventory?: boolean
  allow_backorder?: boolean
  price: ProductPrice | null
  metadata?: Record<string, unknown>
}

export interface OlfactoryPyramid {
  top?: string[]
  heart?: string[]
  base?: string[]
  [key: string]: string[] | undefined
}

export interface ProductSpecifications {
  concentration?: string
  origin?: string
  edition?: string
  [key: string]: string | number | boolean | undefined
}

export interface ProductCivilization {
  id: string
  name: string | null
  subtitle: string | null
}

export interface ProductCollectionRef {
  id: string
  handle: string | null
  title: string | null
  subtitle: string | null
}

export interface ProductTypeRef {
  id: string
  code: string | null
  name: string | null
}

export interface Product {
  id: string
  handle: string
  title: string
  subtitle: string | null
  short_description: string | null
  description: string | null
  story: string | null
  ingredients: string | null
  ritual: string | null
  seo_title: string | null
  seo_description: string | null
  status: string
  thumbnail: string | null
  media: ProductMedia[]
  images: ProductImage[]
  civilization: ProductCivilization | null
  collection: ProductCollectionRef | null
  product_type: ProductTypeRef | null
  is_limited: boolean
  is_serialized: boolean
  edition_size: number | null
  max_per_customer: number | null
  olfactory_pyramid: OlfactoryPyramid
  specifications: ProductSpecifications
  launch_at: string | null
  metadata: Record<string, unknown>
  variants: ProductVariant[]
  price_range: { min: number; max: number } | null
  default_variant: ProductVariant | null
}

export interface CollectionProfile {
  id: string
  handle: string
  civilization_id: string | null
  product_type_id: string | null
  status: string
  sort_order: number | null
  launch_at: string | null
  metadata: Record<string, unknown> | null
  title: string | null
  subtitle: string | null
  description: string | null
  story: string | null
  seo_title: string | null
  seo_description: string | null
  civilization_name: string | null
  civilization_subtitle: string | null
  hero_url: string | null
  hero_alt_ar: string | null
  hero_alt_en: string | null
  product_count: number
}

export interface CivilizationProfile {
  id: string
  code: string
  status: string
  launch_at: string | null
  sort_order: number | null
  accent_color: string | null
  name: string
  subtitle: string | null
  description: string | null
  story: string | null
  seo_title: string | null
  seo_description: string | null
  hero_url: string | null
  alt_ar: string | null
  alt_en: string | null
}

export interface ProductListResponse {
  products: Product[]
  count: number
  limit: number
  offset: number
  locale: string
  currency_code: string
  error?: string
}

export interface ProductResponse {
  product: Product
  locale: string
  currency_code: string
}

export interface CollectionsResponse {
  collections: CollectionProfile[]
  count: number
  locale: string
}

export interface CivilizationsResponse {
  civilizations: CivilizationProfile[]
  count: number
  locale: string
}
