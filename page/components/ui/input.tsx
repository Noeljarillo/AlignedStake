import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<
  HTMLInputElement, 
  React.ComponentProps<"input"> & { 
    variant?: "default" | "modern" | "minimal" | "glow" 
  }
>(
  ({ className, type, variant = "default", ...props }, ref) => {
    const baseStyles = "flex h-10 w-full rounded-md px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200";
    
    const variantStyles = {
      default: "border border-input bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      modern: "border border-gray-700 bg-gray-800/80 backdrop-blur-sm text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20",
      minimal: "border-0 border-b-2 border-gray-700 bg-transparent rounded-none px-0 focus:border-blue-500",
      glow: "border border-gray-700 bg-gray-800 text-white focus:shadow-[0_0_10px_rgba(59,130,246,0.5)] focus:border-blue-500"
    };

    return (
      <input
        type={type}
        className={cn(
          baseStyles,
          variantStyles[variant as keyof typeof variantStyles],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
