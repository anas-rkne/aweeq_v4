"use client"

import type { ReactNode } from "react"
import { trackContact } from "@/lib/meta-pixel"

/**
 * A contact/social link that reports the Meta `Contact` event when clicked.
 * Lives in its own client component so server components (the store footer)
 * can use it without becoming client components themselves.
 */
export function MetaContactLink({
  href,
  label,
  className,
  children,
}: {
  href: string
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={className}
      onClick={() => trackContact()}
    >
      {children}
    </a>
  )
}
