import { cn } from "@/shared/lib/cn"

/**
 * The one gradient seam between sections: a band of `royal-navy` that fades to
 * transparent, so the two sections on either side hand off cinematically
 * instead of hard-cutting. 32px on a phone, 64px from the desktop breakpoint,
 * never black.
 */
export function SectionDivider({
  className,
  from = "top",
}: {
  className?: string
  from?: "top" | "bottom"
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none relative h-8 md:h-16", className)}
      style={{
        background:
          from === "top"
            ? "linear-gradient(to bottom, var(--color-royal-navy) 0%, transparent 100%)"
            : "linear-gradient(to top, var(--color-royal-navy) 0%, transparent 100%)",
      }}
    />
  )
}
