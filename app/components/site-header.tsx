"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useCart } from "./store/cart-provider";

const STORE_PREFIXES = ["/products", "/collections", "/cart", "/checkout"];

const NAV_LINKS = [
  { href: "#hero", label: "الرئيسية", current: true },
  { href: "#story", label: "قصتنا", current: false },
  { href: "#beyond", label: "المجموعات", current: false },
  { href: "#civilizations", label: "الحضارات", current: false },
  { href: "#journal", label: "المجلة", current: false },
] as const;

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="square"
      aria-hidden="true"
      className="h-[21px] w-[21px]"
    >
      <circle cx="10.75" cy="10.75" r="6.75" />
      <path d="M15.75 15.75 21 21" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="square"
      aria-hidden="true"
      className="h-[21px] w-[21px]"
    >
      <path d="M5 8h14l1 12.5H4L5 8Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </svg>
  );
}

function SimpleMenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function MobileNav({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const pictureRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<(HTMLAnchorElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    const ctx = gsap.context(() => {
      gsap
        .timeline()
        .fromTo(
          pictureRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.5, ease: "power2.out" },
          0,
        )
        .fromTo(
          linksRef.current,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.1,
            ease: "power2.out",
          },
          0.15,
        );
    }, shellRef);

    return () => ctx.revert();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={shellRef}
      role="dialog"
      aria-modal="true"
      aria-label="قائمة التنقل"
      className="fixed inset-0 z-[100] overflow-y-auto bg-[#0a1628]"
    >
      <div ref={pictureRef} className="absolute inset-0" aria-hidden="true">
        <Image
          src="/images/hero/mobile-menu-bg.jpg"
          alt=""
          fill
          sizes="100vw"
          quality={80}
          className="object-cover object-center brightness-[3.2] contrast-[1.1] saturate-[0.9]"
        />
      </div>

      <div className="absolute inset-0 bg-[#0a1628]/45" aria-hidden="true" />

      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(58% 44% at 50% 50%, rgba(10, 22, 40, 0.88) 0%, rgba(10, 22, 40, 0) 100%)",
        }}
      />

      <button
        type="button"
        onClick={onClose}
        aria-label="إغلاق القائمة"
        className="absolute left-6 top-6 z-10 text-sand/50 transition-colors duration-300 ease-out hover:text-gold"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          strokeLinecap="square"
          aria-hidden="true"
          className="h-6 w-6"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className="relative z-10 flex min-h-svh items-center justify-center px-6 py-24">
        <nav className="text-center">
          <ul className="flex flex-col gap-10">
            {NAV_LINKS.map((link, index) => (
              <li key={link.href}>
                <a
                  ref={(element) => {
                    linksRef.current[index] = element;
                  }}
                  href={link.href}
                  onClick={onClose}
                  aria-current={link.current ? "page" : undefined}
                  className={`inline-block font-primary text-4xl transition-colors duration-300 ease-out sm:text-5xl ${
                    link.current
                      ? "text-gold drop-shadow-[0_0_15px_rgba(205,158,97,0.5)]"
                      : "text-sand/50 hover:text-gold hover:drop-shadow-[0_0_15px_rgba(205,158,97,0.5)]"
                  }`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { itemCount, openCart } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isStoreRoute = STORE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isStoreRoute) {
    return null;
  }

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 px-4 pb-4 pt-5 transition-colors duration-300 sm:px-5 sm:pt-6 md:px-10 md:pb-5 md:pt-8 ${
          scrolled
            ? "bg-[#0a1628]/80 backdrop-blur-md"
            : "bg-transparent"
        }`}
      >
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-4 md:gap-6">
          {/* the tools, on the right side of the RTL bar */}
          <div className="flex shrink-0 items-center justify-start gap-2 sm:gap-3 md:gap-5">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="فتح القائمة"
              aria-expanded={isMenuOpen}
              className="p-1 text-sand/70 transition-colors duration-200 ease-out hover:text-gold md:hidden"
            >
              <SimpleMenuIcon />
            </button>

            <button
              type="button"
              aria-label="تبديل اللغة"
              className="whitespace-nowrap font-secondary text-[11px] tracking-[0.12em] text-sand/80 transition-colors duration-200 ease-out hover:text-gold sm:text-[12px] sm:tracking-[0.2em]"
            >
              AR<span className="mx-0.5 text-sand/30 sm:mx-1">/</span>
              <span className="text-sand/40">EN</span>
            </button>

            <button
              type="button"
              aria-label="بحث"
              className="shrink-0 p-1 text-sand/70 transition-colors duration-200 ease-out hover:text-gold"
            >
              <SearchIcon />
            </button>

            <button
              type="button"
              onClick={openCart}
              aria-label={
                itemCount > 0 ? `السلة، ${itemCount} قطعة` : "السلة"
              }
              className="relative shrink-0 p-1 text-sand/70 transition-colors duration-200 ease-out hover:text-gold"
            >
              <CartIcon />
              {itemCount > 0 && (
                <span className="absolute -end-1.5 -top-0.5 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-gold px-1 font-secondary text-[9px] leading-none text-royal-navy sm:-end-2 sm:-top-1.5">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </button>
          </div>

          {/* the five rooms, in the middle of the bar */}
          <nav
            aria-label="التنقل الرئيسي"
            className="hidden min-w-0 items-center justify-center gap-5 md:flex lg:gap-7"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                aria-current={link.current ? "page" : undefined}
                className={`group relative whitespace-nowrap font-primary text-[13px] transition-colors duration-300 ${
                  link.current
                    ? "text-gold"
                    : "text-sand/75 hover:text-gold"
                }`}
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 -bottom-2 h-px origin-right bg-gold transition-transform duration-300 ${
                    link.current
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </a>
            ))}
          </nav>

          {/* the mark, on the left side */}
          <div className="flex shrink-0 justify-end">
            <a
              href="#hero"
              aria-label="3WEEQ — الرئيسية"
              className="inline-flex w-fit items-center"
            >
              <Image
                src="/images/logo-mark.png"
                alt="3WEEQ"
                width={2785}
                height={841}
                quality={90}
                sizes="(min-width: 64rem) 7rem, 5rem"
                priority
                className="h-[20px] w-auto sm:h-[22px] md:h-8"
              />
            </a>
          </div>
        </div>
      </header>

      <MobileNav
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />
    </>
  );
}
