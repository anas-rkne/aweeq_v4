import { revalidatePath, revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET

  if (!secret) {
    return NextResponse.json(
      { error: "revalidate_secret_not_configured" },
      { status: 503 }
    )
  }

  const authorization = request.headers.get("authorization")
  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    tags?: unknown
    paths?: unknown
  } | null

  const tags = Array.isArray(body?.tags)
    ? body.tags.filter((tag): tag is string => typeof tag === "string")
    : []
  const paths = Array.isArray(body?.paths)
    ? body.paths.filter((path): path is string => typeof path === "string")
    : []

  if (tags.length === 0 && paths.length === 0) {
    return NextResponse.json(
      { error: "nothing_to_revalidate" },
      { status: 400 }
    )
  }

  for (const tag of tags) {
    revalidateTag(tag, "max")
  }

  for (const path of paths) {
    revalidatePath(path)
  }

  return NextResponse.json({ revalidated: true, tags, paths })
}
