// components/ui/separator.tsx
import * as React from "react"

export type SeparatorProps = React.HTMLAttributes<HTMLDivElement>

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`shrink-0 bg-gray-200 h-[1px] w-full ${className}`}
      {...props}
    />
  )
)
Separator.displayName = "Separator"

export { Separator }
