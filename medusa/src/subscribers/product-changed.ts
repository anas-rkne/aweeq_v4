import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { CatalogAdminService } from "../lib/threeweeq/admin-service"

/**
 * Safety net for catalog changes that do not go through the Studio routes —
 * e.g. a price fix in Medusa's native product page, or a bulk import. The
 * Studio already revalidates synchronously on every mutation, so duplicate
 * calls are idempotent and cheap.
 *
 * Storefront catalog queries are tagged `products` (list *and* detail pages)
 * and `collections`, so one tag invalidates the whole tree.
 */
type Scope = {
  tags: string[]
  paths: string[]
  timer?: NodeJS.Timeout
}

const pending = new Map<string, Scope>()

function scopeFor(eventName: string): Scope {
  if (eventName.startsWith("product-collection.")) {
    return {
      tags: ["collections"],
      paths: ["/ar/collections", "/en/collections", "/ar", "/en"],
    }
  }

  return {
    tags: ["products"],
    paths: ["/ar/products", "/en/products", "/ar", "/en"],
  }
}

export default async function productChangedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const scope = scopeFor(event.name)

  // A price sync that touches 50 variants would otherwise fire 50 revalidate
  // requests in the same second; coalesce them per scope.
  const existing = pending.get(scope.tags[0])
  if (existing) {
    return
  }

  const entry: Scope = scope
  pending.set(scope.tags[0], entry)

  entry.timer = setTimeout(() => {
    pending.delete(entry.tags[0])

    void new CatalogAdminService(container)
      .revalidateStorefront(entry.tags, entry.paths)
      .catch(() => {
        // Cache misses are recoverable; never crash the worker over this.
      })
  }, 3000)

  // Do not keep the process alive just for a pending revalidation.
  entry.timer.unref?.()
}

export const config: SubscriberConfig = {
  event: [
    "product.created",
    "product.updated",
    "product.deleted",
    "product-variant.created",
    "product-variant.updated",
    "product-variant.deleted",
    "product-collection.created",
    "product-collection.updated",
    "product-collection.deleted",
  ],
}
