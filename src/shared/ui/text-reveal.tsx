"use client"

import { Fragment, useRef } from "react"
import { useGSAP } from "@gsap/react"
import { useLocale } from "next-intl"
import { gsap } from "@/shared/motion/gsap"
import { EASING } from "@/shared/motion/tokens"
import { useReducedMotion } from "@/shared/motion/use-reduced-motion"
import { cn } from "@/shared/lib/cn"

type Preset = "words" | "lines" | "block" | "eyebrow"

/**
 * A locale-aware text reveal.
 *
 *   words    — each word slides up out of its own mask (Word Pull Up), with
 *              optional blur-to-focus. Arabic is forced to `lines` so a word is
 *              never split into glyphs.
 *   lines    — each authored line rises as a whole (no mask, so tight Arabic
 *              leading never clips a descender).
 *   block    — a single fade + rise, for paragraphs.
 *   eyebrow  — a tiny scale + fade, for small labels.
 *
 * The hidden state is applied only when the animation will actually run, so
 * reduced motion and no-JS leave the text visible.
 */
export function TextReveal({
  children,
  preset = "words",
  blur = false,
  stagger = 0.05,
  start = "top 82%",
  once = true,
  className,
}: {
  children: string
  preset?: Preset
  blur?: boolean
  stagger?: number
  start?: string
  once?: boolean
  className?: string
}) {
  const scope = useRef<HTMLSpanElement>(null)
  const reducedMotion = useReducedMotion()
  const locale = useLocale()

  const reveal: Preset =
    preset === "words" && locale === "ar" ? "lines" : preset
  const shouldBlur = blur && locale !== "ar"

  const lines: string[] = children.split("\n")
  const wordsByLine: string[][] = lines.map((line) => line.split(" "))

  useGSAP(
    () => {
      if (reducedMotion) return

      const targets = gsap.utils.toArray<HTMLElement>(
        "[data-reveal]",
        scope.current
      )
      const scrollTrigger = { trigger: scope.current, start, once }

      if (reveal === "words") {
        targets.forEach((word) => {
          const mask = word.parentElement as HTMLElement | null
          gsap.set(word, {
            y: mask ? mask.offsetHeight : word.offsetHeight,
            opacity: 0,
            ...(shouldBlur ? { filter: "blur(10px)" } : {}),
          })
        })
        gsap.to(targets, {
          y: 0,
          opacity: 1,
          ...(shouldBlur ? { filter: "blur(0px)" } : {}),
          duration: 0.8,
          ease: EASING.outExpo,
          stagger,
          scrollTrigger,
        })
      } else if (reveal === "eyebrow") {
        gsap.fromTo(
          targets,
          { opacity: 0, y: 8, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            ease: EASING.outExpo,
            stagger,
            scrollTrigger,
          }
        )
      } else {
        gsap.fromTo(
          targets,
          { opacity: 0, y: 14 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: EASING.outExpo,
            stagger,
            scrollTrigger,
          }
        )
      }
    },
    {
      scope,
      dependencies: [reducedMotion, reveal, shouldBlur, stagger, start, once],
    }
  )

  if (reveal === "words") {
    return (
      <span ref={scope} className={cn("block", className)}>
        {wordsByLine.map((words, lineIndex) => (
          <span key={lineIndex} className="block">
            {words.map((word, wordIndex) => (
              <Fragment key={wordIndex}>
                <span className="inline-block overflow-hidden pb-[0.25em] -mb-[0.25em]">
                  <span data-reveal className="inline-block">
                    {word}
                  </span>
                </span>
                {wordIndex < words.length - 1 ? " " : null}
              </Fragment>
            ))}
          </span>
        ))}
      </span>
    )
  }

  if (reveal === "lines") {
    return (
      <span ref={scope} className={cn("block", className)}>
        {lines.map((line, lineIndex) => (
          <span key={lineIndex} data-reveal className="block">
            {line}
          </span>
        ))}
      </span>
    )
  }

  return (
    <span ref={scope} className={className}>
      <span data-reveal className="inline-block">
        {children}
      </span>
    </span>
  )
}
