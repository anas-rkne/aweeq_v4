import type { MedusaRequest } from "@medusajs/framework/http"
import { CatalogAdminService } from "./admin-service"

/**
 * Every `/admin/*` route is behind Medusa's admin authentication middleware, so
 * `auth_context.actor_id` is the signed-in admin user (when present) and is
 * what the studio writes to `ops.audit_log`.
 */
export function getActorId(req: MedusaRequest): string | null {
  const context = (req as unknown as { auth_context?: { actor_id?: string } })
    .auth_context

  return context?.actor_id ?? null
}

export function catalogAdminService(req: MedusaRequest) {
  return new CatalogAdminService(req.scope, getActorId(req))
}
