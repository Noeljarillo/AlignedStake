import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5",
        destructive:
          "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md transform hover:-translate-y-0.5",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md transform hover:-translate-y-0.5",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white overflow-hidden shadow-md hover:shadow-lg transform hover:-translate-y-0.5 before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-500 before:via-indigo-500 before:to-purple-500 before:opacity-0 before:transition-opacity hover:before:opacity-100 before:duration-300 [&>span]:relative [&>span]:z-10",
        glowing: "relative bg-gray-800 text-white overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:shadow-[0_0_20px_rgba(59,130,246,0.7)] transform hover:-translate-y-0.5 after:absolute after:inset-0 after:border after:border-blue-500 after:rounded-md after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-300",
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
      >
        {variant === 'gradient' ? (
          <span className="relative z-10">{props.children}</span>
        ) : (
          props.children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
