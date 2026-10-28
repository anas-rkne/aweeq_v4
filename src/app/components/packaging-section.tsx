"use client"

import { useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SectionFade } from "@/shared/ui/section-fade"

gsap.registerPlugin(ScrollTrigger)

/**
 * The Unboxing Ritual — the packaging section as the brand's own ceremony.
 *
 * The five renders already tell the story in order: the closed box in
 * three-quarter view, the closed box facing you, the half-open hero, the
 * fully-open box, and the handbag. The scroll is the hand that opens the
 * box: a sticky stage holds for 2.2 screens while the pieces pass in
 * sequence, each one settling, breathing, and giving way to the next, and at
 * the end the words arrive next to the open box.
 *
 * One scrubbed timeline owns the whole ceremony, so the playhead is the
 * scroll itself: stop the hand and the ritual stops. The stage is a plain
 * sticky element over a reserved height, exactly like the films above — the
 * document never grows, nothing below the section moves.
 */

const ASSET = {
  closed3d: "/images/packaging_images/img-a.webp",
  closedFront: "/images/packaging_images/img-b.webp",
  halfOpen: "/images/packaging_images/img-c.webp",
  openFront: "/images/packaging_images/img-d.webp",
  handbag: "/images/packaging_images/img-e.webp",
}

const BOX_SHADOW = "drop-shadow(0px 18px 20px rgba(0,0,0,0.55))"

export function PackagingSection() {
  const t = useTranslations("Packaging")
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      /* the resting states: every scene after the first is hidden, the bag
         waits off its mark, the words wait. painted now, so nothing flashes
         before the trigger finds them. */
      gsap.set(".ritual-scene-2, .ritual-scene-3, .ritual-scene-4", {
        autoAlpha: 0,
      })
      gsap.set(".ritual-bag", { autoAlpha: 0, x: -90 })
      gsap.set(".ritual-text", { autoAlpha: 0 })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.8,
        },
      })

      /* ===== the hand-over: while the film's black gives way to this
         section, the first box descends into the frame from above. it is
         driven by the approach, so the box arrives with the section itself
         and not after it. ===== */
      gsap.fromTo(
        ".ritual-s1-drop",
        { y: -320, autoAlpha: 0.25 },
        {
          y: 0,
          autoAlpha: 1,
          ease: "power1.out",
          scrollTrigger: {
            trigger: section,
            start: "top 90%",
            end: "top 35%",
            scrub: 0.6,
          },
        }
      )

      /* ===== scene 1 · the closed box, three-quarter view =====
         it settles onto its mark, breathes a little, then steps back. */
      tl.fromTo(
        ".ritual-s1box",
        { rotation: -6 },
        { rotation: 0, ease: "none", duration: 0.12 },
        0
      )
        .to(
          ".ritual-s1box",
          { scale: 1.05, ease: "none", duration: 0.18 },
          0.06
        )
        .to(
          ".ritual-scene-1",
          { autoAlpha: 0, y: -40, ease: "none", duration: 0.14 },
          0.14
        )

      /* ===== scene 2 · the box turns to face you ===== */
      tl.fromTo(
        ".ritual-scene-2",
        { autoAlpha: 0, y: 40 },
        { autoAlpha: 1, y: 0, ease: "none", duration: 0.14 },
        0.14
      )
        .fromTo(
          ".ritual-s2box",
          { scale: 0.92 },
          { scale: 1, ease: "none", duration: 0.24 },
          0.14
        )
        .to(
          ".ritual-scene-2",
          { autoAlpha: 0, y: -40, ease: "none", duration: 0.14 },
          0.36
        )

      /* ===== scene 3 · half open: the golden moment, the longest hold =====
         the box grows toward the visitor while the glow behind it swells. */
      tl.fromTo(
        ".ritual-scene-3",
        { autoAlpha: 0, y: 40 },
        { autoAlpha: 1, y: 0, ease: "none", duration: 0.14 },
        0.36
      )
        .fromTo(
          ".ritual-s3box",
          { scale: 0.96 },
          { scale: 1.08, ease: "none", duration: 0.36 },
          0.36
        )
        .fromTo(
          ".ritual-glow",
          { scale: 0.92, opacity: 0.7 },
          { scale: 1.06, opacity: 1, ease: "none", duration: 0.36 },
          0.36
        )
        .to(
          ".ritual-scene-3",
          { autoAlpha: 0, y: -40, ease: "none", duration: 0.14 },
          0.72
        )

      /* ===== scene 4 · fully open, the bag steps up beside it ===== */
      tl.fromTo(
        ".ritual-scene-4",
        { autoAlpha: 0, y: 40 },
        { autoAlpha: 1, y: 0, ease: "none", duration: 0.14 },
        0.72
      )
        .to(
          ".ritual-bag",
          { autoAlpha: 1, x: 0, ease: "none", duration: 0.16 },
          0.76
        )
        .to(".ritual-scene-4", { y: -50, ease: "none", duration: 0.14 }, 0.84)

      /* ===== the words: the invitation, once the box stands open ===== */
      tl.fromTo(
        ".ritual-text",
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, ease: "none", duration: 0.12 },
        0.88
      )
    }, section)

    ScrollTrigger.refresh()

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="packaging-experience"
      data-cuneiform-surface
      // the shared ground shows through: the wall of impressed cuneiform is
      // the room this ritual is performed in. 2.2 screens belong to the
      // document from the first paint; the stage inside is what sticks
      className="relative h-[220svh] motion-reduce:h-svh"
    >
      <div className="sticky top-0 h-svh overflow-hidden motion-reduce:relative">
        {/* the fog the film leaves behind */}
        <SectionFade edge="top" />

        {/* ===== the gold glow over the shared wall of cuneiform ===== */}
        <div
          aria-hidden="true"
          className="ritual-glow pointer-events-none absolute inset-0 z-[1] will-change-transform"
          style={{
            background:
              "radial-gradient(ellipse 58% 52% at 50% 46%, rgba(205,158,97,0.12) 0%, rgba(205,158,97,0.035) 46%, rgba(5,10,31,0) 76%)",
          }}
        />

        {/* ===== scene 1 · the closed box, three-quarter view ===== */}
        <div className="ritual-scene ritual-scene-1 pointer-events-none absolute inset-0 z-10 flex items-center justify-center motion-reduce:hidden">
          <div className="ritual-s1-drop will-change-transform">
            <div className="ritual-s1box relative w-52 will-change-transform sm:w-64 lg:w-[340px]">
              <img
                src={ASSET.closed3d}
                alt=""
                loading="lazy"
                decoding="async"
                className="relative h-auto w-full"
                style={{ filter: BOX_SHADOW }}
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-8 left-1/2 h-8 w-2/3 -translate-x-1/2 rounded-[100%] bg-black/45 blur-md"
              />
            </div>
          </div>
        </div>

        {/* ===== scene 2 · the box faces you ===== */}
        <div className="ritual-scene ritual-scene-2 pointer-events-none absolute inset-0 z-10 flex items-center justify-center motion-reduce:hidden">
          <div className="ritual-s2box relative w-56 will-change-transform sm:w-72 lg:w-[380px]">
            <img
              src={ASSET.closedFront}
              alt=""
              loading="lazy"
              decoding="async"
              className="relative h-auto w-full"
              style={{ filter: BOX_SHADOW }}
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-8 left-1/2 h-8 w-2/3 -translate-x-1/2 rounded-[100%] bg-black/45 blur-md"
            />
          </div>
        </div>

        {/* ===== scene 3 · half open: the golden moment ===== */}
        <div className="ritual-scene ritual-scene-3 pointer-events-none absolute inset-0 z-20 flex items-center justify-center motion-reduce:hidden">
          <div className="ritual-s3box relative w-64 will-change-transform sm:w-80 lg:w-[440px]">
            <img
              src={ASSET.halfOpen}
              alt=""
              loading="lazy"
              decoding="async"
              className="relative h-auto w-full"
              style={{ filter: BOX_SHADOW }}
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-8 left-1/2 h-8 w-2/3 -translate-x-1/2 rounded-[100%] bg-black/45 blur-md"
            />
          </div>
        </div>

        {/* ===== scene 4 · fully open, the bag beside it, the words on the
            reading side ===== */}
        <div className="ritual-scene ritual-scene-4 pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-10 px-6 md:flex-row md:gap-16 lg:gap-24">
          <div className="relative flex items-center justify-center gap-5 sm:gap-8 lg:gap-10">
            <div className="ritual-bag relative w-24 will-change-transform sm:w-32 lg:w-[190px]">
              <img
                src={ASSET.handbag}
                alt=""
                loading="lazy"
                decoding="async"
                className="relative h-auto w-full"
                style={{ filter: BOX_SHADOW }}
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-8 left-1/2 h-8 w-2/3 -translate-x-1/2 rounded-[100%] bg-black/45 blur-md"
              />
            </div>

            <div className="relative w-56 will-change-transform sm:w-72 lg:w-[380px]">
              <img
                src={ASSET.openFront}
                alt=""
                loading="lazy"
                decoding="async"
                className="relative h-auto w-full"
                style={{ filter: BOX_SHADOW }}
              />
              <div
                aria-hidden="true"
                className="absolute -bottom-8 left-1/2 h-8 w-2/3 -translate-x-1/2 rounded-[100%] bg-black/45 blur-md"
              />
            </div>
          </div>

          {/* the words: only the invitation is interactive */}
          <div className="ritual-text pointer-events-auto max-w-md text-center md:text-start">
            <p className="font-secondary text-[11px] uppercase tracking-[0.3em] text-gold/80">
              {t("eyebrow")}
            </p>

            <h2 className="mt-3 font-primary text-3xl font-bold leading-[1.25] text-gold sm:text-4xl lg:text-5xl">
              {t("title")}
            </h2>

            <p className="mt-5 font-primary text-[15px] leading-[1.9] text-sand/75">
              {t("body")}
            </p>

            <Link
              href="/products/rafid"
              className="group relative mt-8 inline-flex h-11 items-center overflow-hidden whitespace-nowrap bg-gold px-6 font-primary text-[14px] text-royal-navy transition-transform duration-[250ms] ease-out-expo hover:scale-[1.01] active:scale-[0.99] md:h-[44px] md:px-7"
            >
              <span aria-hidden="true" className="cta-sheen" />
              <span className="relative">{t("cta")}</span>
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
            </Link>
          </div>
        </div>

        {/* the fog the civilizations rise out of */}
        <SectionFade edge="bottom" />
      </div>
    </section>
  )
}

export default PackagingSection
