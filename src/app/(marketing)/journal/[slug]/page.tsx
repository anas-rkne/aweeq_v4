import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { JOURNAL_POSTS } from "@/components/journal-posts"

export function generateStaticParams() {
  return JOURNAL_POSTS.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = JOURNAL_POSTS.find((item) => item.slug === slug)

  if (!post) {
    return { title: "المجلة | 3WEEQ" }
  }

  return {
    title: `${post.titleAr} | 3WEEQ`,
    description: post.excerpt,
    openGraph: {
      title: post.titleAr,
      description: post.excerpt,
      images: [{ url: post.image }],
      type: "article",
    },
  }
}

export default async function JournalPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = JOURNAL_POSTS.find((item) => item.slug === slug)

  if (!post) {
    notFound()
  }

  return (
    <main className="min-h-svh bg-royal-navy pb-24 pt-28">
      <div className="mx-auto w-full max-w-5xl px-5 sm:px-8 md:px-12" dir="rtl">
        <nav
          aria-label="مسار التنقل"
          className="mb-8 flex flex-wrap items-center gap-2 font-primary text-xs text-sand/40"
        >
          <Link href="/" className="transition-colors hover:text-gold">
            الرئيسية
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/journal" className="transition-colors hover:text-gold">
            المجلة
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-sand/65">{post.titleAr}</span>
        </nav>

        <p className="font-secondary text-xs tracking-[0.28em] text-gold/70">
          {post.titleEn}
        </p>
        <h1 className="mt-4 font-secondary text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.1] text-gold">
          {post.titleAr}
        </h1>

        <div className="relative mt-10 aspect-[16/9] w-full overflow-hidden border border-sand/10">
          <Image
            src={post.image}
            alt={post.alt}
            fill
            priority
            quality={88}
            sizes="(min-width: 64rem) 60rem, 100vw"
            className="object-cover object-center"
          />
        </div>

        <article className="mx-auto mt-12 max-w-3xl space-y-6">
          {post.body.map((paragraph) => (
            <p
              key={paragraph.slice(0, 32)}
              className="font-primary text-base leading-loose text-sand/75"
            >
              {paragraph}
            </p>
          ))}
        </article>

        <div className="mx-auto mt-14 flex max-w-3xl flex-col gap-4 border-t border-sand/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/journal"
            className="font-primary text-sm text-sand/60 transition-colors hover:text-gold"
          >
            → كل المقالات
          </Link>
          <Link
            href="/products"
            className="inline-flex w-fit items-center border border-gold/40 px-6 py-3 font-primary text-sm text-gold transition-colors hover:bg-gold hover:text-royal-navy"
          >
            استكشف المتجر
          </Link>
        </div>
      </div>
    </main>
  )
}
