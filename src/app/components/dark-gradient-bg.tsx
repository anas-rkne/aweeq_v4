import type React from "react"

interface DarkGradientBgProps {
  children?: React.ReactNode
  className?: string
}

export function DarkGradientBg({ children, className }: DarkGradientBgProps) {
  return (
    <div
      className={`relative min-h-svh w-full overflow-hidden bg-royal-navy ${className ?? ""}`}
    >
      <div className="relative z-10">{children}</div>
    </div>
  )
}
