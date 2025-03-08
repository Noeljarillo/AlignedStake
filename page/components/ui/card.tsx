import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    variant?: "default" | "glass" | "gradient" | "outline" | "glow" 
  }
>(({ className, variant = "default", ...props }, ref) => {
  const baseStyles = "rounded-lg border shadow-sm transition-all duration-300";
  const variantStyles = {
    default: "bg-card text-card-foreground",
    glass: "bg-gray-800/60 backdrop-blur-md border-gray-700/50 text-white",
    gradient: "bg-gradient-to-br from-gray-800 via-gray-900 to-gray-950 text-white border-gray-700/50",
    outline: "bg-transparent border-gray-700 text-white hover:bg-gray-800/10",
    glow: "bg-gray-800 text-white border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
  };

  return (
    <div
      ref={ref}
      className={cn(
        baseStyles,
        variantStyles[variant as keyof typeof variantStyles],
        className
      )}
      {...props}
    />
  );
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight font-poppins",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground/90", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
