import Image from "next/image"
import Link from "next/link"

const NAV_LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/products", label: "المتجر" },
  { href: "/collections", label: "المجموعات" },
  { href: "/#story", label: "قصتنا" },
] as const

export function StoreHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-sand/10 bg-[#020A14]/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-6 px-5 md:h-24 md:px-10">
        <Link
          href="/"
          aria-label="3WEEQ — الرئيسية"
          className="inline-flex shrink-0 items-center"
        >
          <Image
            src="/images/logo-mark.png"
            alt="3WEEQ"
            width={160}
            height={48}
            priority
            className="h-6 w-auto md:h-8"
          />
        </Link>

        <nav aria-label="تنقل المتجر" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-primary text-sm text-sand/65 transition-colors duration-300 hover:text-gold"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/products"
            aria-label="ابحث في المتجر"
            className="p-1 text-sand/70 transition-colors duration-300 hover:text-gold"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.2}
              strokeLinecap="round"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" />
            </svg>
          </Link>

          <button
            type="button"
            disabled
            aria-label="السلة — قريباً"
            title="السلة قريباً"
            className="relative cursor-not-allowed p-1 text-sand/40"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-5 w-5"
            >
              <path d="M6 7h12l-1 13H7L6 7Z" />
              <path d="M9 7a3 3 0 0 1 6 0" />
            </svg>
          </button>
        </div>
      </div>

      <nav
        aria-label="تنقل المتجر للجوال"
        className="border-t border-sand/10 px-5 py-3 md:hidden"
      >
        <ul className="flex items-center justify-between gap-4">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="font-primary text-xs text-sand/65 transition-colors duration-300 hover:text-gold"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
