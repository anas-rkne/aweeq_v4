import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/shared/lib/cn"

export const buttonVariants = cva(
  "inline-flex items-center justify-center font-primary transition-transform duration-[250ms] ease-out-expo focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-3 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary:
          "bg-gold text-royal-navy hover:bg-gold/85 hover:scale-[1.01] active:scale-[0.99]",
        ghost: "text-sand/80 hover:text-gold",
        outline: "border border-sand/20 text-sand hover:border-gold/60",
      },
      size: {
        sm: "h-9 px-4 text-[13px]",
        md: "h-11 px-6 text-sm",
        lg: "h-12 px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export type ButtonProps = React.ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"
