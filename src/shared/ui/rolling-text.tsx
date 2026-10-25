import { cn } from "@/shared/lib/cn"

/**
 * A label that rolls vertically on hover: two identical copies stacked inside
 * an `overflow: hidden` box, the top one sliding up as the bottom one slides
 * in. The whole word moves — never individual characters — so it stays safe
 * for Arabic joins. Triggered by the parent's `group-hover` / `group-focus`.
 */
export function RollingText({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "relative inline-block overflow-hidden align-baseline leading-[1.4]",
        className
      )}
    >
      <span className="block transition-transform duration-500 ease-out-expo group-hover:-translate-y-full group-focus-visible:-translate-y-full">
        {children}
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 block translate-y-full transition-transform duration-500 ease-out-expo group-hover:translate-y-0 group-focus-visible:translate-y-0"
      >
        {children}
      </span>
    </span>
  )
}
