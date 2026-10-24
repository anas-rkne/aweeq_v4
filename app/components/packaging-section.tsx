"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export function PackagingSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const section = sectionRef.current
    const bg = bgRef.current
    const text = textRef.current
    if (!section || !bg || !text) return

    gsap.set(bg, { scale: 1.18, opacity: 0 })
    gsap.set(text, { opacity: 0, y: 40 })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top bottom",
        end: "top 25%",
        scrub: 1,
      },
    })

    tl.to(bg, {
      scale: 1,
      opacity: 1,
      ease: "none",
    }).to(
      text,
      {
        opacity: 1,
        y: 0,
        ease: "power2.out",
      },
      "-=0.5"
    )

    return () => {
      tl.scrollTrigger?.kill()
      tl.kill()
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="packaging-experience"
      className="relative flex min-h-screen flex-col overflow-hidden bg-[#0a1628] md:block md:h-screen"
    >
      <div
        ref={bgRef}
        className="relative aspect-[768/1376] w-full shrink-0 will-change-transform md:absolute md:inset-0 md:aspect-auto"
      >
        <Image
          src="/images/packaging_images/main_bg_packaing.webp"
          alt="تغليف عطر رافد"
          fill
          quality={90}
          sizes="100vw"
          className="hidden object-cover md:block"
        />

        <img
          src="/images/packaging_images/main_bg_packaing_mobile.webp"
          alt="تغليف عطر رافد"
          className="block h-full w-full object-cover md:hidden"
          loading="lazy"
        />
      </div>

      {/* scrim on the right for readability */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 hidden md:block"
        style={{
          backgroundImage:
            "linear-gradient(to left, #0a1628 0%, rgba(10, 22, 40, 0.94) 38%, rgba(10, 22, 40, 0.62) 66%, rgba(10, 22, 40, 0) 100%)",
        }}
      />

      {/* receives the gradient from the film above, so the two images meet in
          the same midnight with no seam */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-10 h-32 w-full md:h-64"
        style={{
          background:
            "linear-gradient(to bottom, #0a1628 0%, transparent 100%)",
        }}
      />

      {/* the same divider used between the sections, so the image melts into
          the content below */}
      <div
        aria-hidden="true"
        className="pointer-events-none relative z-10 -mt-32 h-32 w-full md:hidden"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, #0a1628 100%)",
        }}
      />

      {/* the foot of the section melts into the midnight of the section that
          follows — a gradient only, no space, no divider */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 z-10 hidden h-32 w-full md:block md:h-64"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, #0a1628 100%)",
        }}
      />

      <div
        ref={textRef}
        className="relative z-20 mx-auto flex w-full max-w-[84rem] flex-col items-start justify-center px-5 pb-16 pt-8 text-right sm:px-8 md:h-full md:px-16 md:pb-0 md:pt-0"
      >
        <div className="w-full max-w-xl">
          <p className="font-secondary text-[12px] tracking-[0.34em] text-gold">
            THE ART OF UNBOXING
          </p>

          <h2 className="mt-5 font-secondary text-[clamp(2rem,4.2vw,4rem)] leading-[1.08] tracking-[-0.015em] text-sand">
            إرثٌ يُغلّف بين بيديك
            <span className="mt-2 block text-[clamp(1.6rem,3vw,3rem)] text-sand/90">
              A Legacy in Your Hands
            </span>
          </h2>

          <p className="mt-6 max-w-[32rem] font-primary text-[clamp(1rem,1.2vw,1.2rem)] leading-[1.9] text-sand/90">
            في 3WEEQ، لا نكتفي بصناعة العطر، بل نصنع التجربة. كل صندوق هو قطعة
            فنية مستوحاة من نقوش بابل، مصنوع من أجود المواد ليعكس فخامة الحضارات
            العريقة. من لحظة فتح الغلاف، تبدأ رحلتك في عالم من التفاصيل الملكية.
          </p>

          <p className="mt-5 max-w-[32rem] font-primary text-[clamp(0.98rem,1vw,1.1rem)] leading-[1.9] text-sand/70">
            At 3WEEQ, we don&apos;t just craft fragrances; we craft experiences.
            Every box is a work of art inspired by Babylonian engravings, made
            with the finest materials to reflect the luxury of ancient
            civilizations. From the moment you unbox it, your journey into a
            world of royal details begins.
          </p>

          <div className="mt-10">
            <a
              href="#packaging-experience"
              className="group relative inline-flex h-10 items-center overflow-hidden whitespace-nowrap bg-gold px-6 font-primary text-[13px] text-royal-navy transition-transform duration-[250ms] ease-out-expo hover:scale-[1.01] active:scale-[0.99] md:h-[44px] md:px-7 md:text-[14px]"
            >
              <span aria-hidden="true" className="cta-sheen" />
              <span className="relative">اكتشف فن التغليف</span>
              <span className="relative ms-2 text-[12px] opacity-70 md:ms-3">
                Explore the Art of Packaging
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.2}
                strokeLinecap="square"
                aria-hidden="true"
                className="relative ms-2 h-3.5 w-3.5 -translate-x-1 opacity-0 transition-[transform,opacity] duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 md:ms-3 md:h-4 md:w-4"
              >
                <path d="M19 12H5" />
                <path d="M11 6l-6 6 6 6" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
