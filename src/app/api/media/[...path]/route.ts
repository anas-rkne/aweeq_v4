import { MEDUSA_BACKEND_URL } from "@/shared/lib/config"

/**
 * Same-origin proxy for the photographs Medusa serves from `/static`.
 *
 * The file module answers those URLs without an `Access-Control-Allow-Origin`
 * header, so a `<canvas>` that draws one of them (the store invitation turns
 * the hero-2 cut-outs into WebGL textures) is tainted and the texture is
 * dropped — which is why a freshly uploaded transparent cut-out never showed
 * up in the hero. Serving the bytes from our own origin removes the CORS
 * question entirely.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const base = MEDUSA_BACKEND_URL.replace(/\/+$/, "")

  if (!base || !path?.length) {
    return new Response("Not found", { status: 404 })
  }

  /* the file module only ever names flat (or one-folder) uploads; anything
     that could climb out of /static is refused rather than re-encoded */
  if (
    path.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("/") ||
        segment.includes("\\")
    )
  ) {
    return new Response("Not found", { status: 404 })
  }

  /* each segment arrives decoded, so it has to be re-encoded to ask the
     backend for the exact file (uploads keep their original names, spaces
     and all) */
  const upstream = `${base}/static/${path.map(encodeURIComponent).join("/")}`

  let response: Response
  try {
    response = await fetch(upstream, { cache: "force-cache" })
  } catch {
    return new Response("Bad gateway", { status: 502 })
  }

  if (!response.ok || !response.body) {
    return new Response("Not found", { status: 404 })
  }

  const headers = new Headers({
    "content-type":
      response.headers.get("content-type") ?? "application/octet-stream",
    /* uploads are named after their timestamp, so a URL always points at
       one immutable file */
    "cache-control": "public, max-age=31536000, immutable",
    "x-content-type-options": "nosniff",
  })
  const length = response.headers.get("content-length")
  if (length) {
    headers.set("content-length", length)
  }

  return new Response(response.body, { headers })
}
