import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "btn-3d bg-gradient-to-r from-primary to-electric-blue text-primary-foreground hover:from-electric-blue hover:to-vibrant-purple transform-gpu",
        destructive:
          "btn-3d bg-gradient-to-r from-destructive to-red-600 text-destructive-foreground hover:from-red-600 hover:to-destructive",
        outline:
          "border-2 border-primary/20 bg-background/50 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/40 hover:shadow-glow",
        secondary:
          "btn-3d bg-gradient-to-r from-secondary to-muted text-secondary-foreground hover:from-muted hover:to-secondary/80",
        ghost: "hover:bg-primary/10 hover:text-primary hover:shadow-soft",
        link: "text-primary underline-offset-4 hover:underline hover:text-electric-blue",
        neon: "neon-glow bg-gradient-to-r from-electric-blue to-vibrant-purple text-white border-2 border-transparent hover:border-electric-blue/50",
        floating: "btn-3d bg-gradient-to-r from-neon-green to-electric-blue text-white animate-float hover:animate-bounce-3d",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
