/* Input Component - A component that displays an input - from shadcn/ui (exposes Input) */
import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 ring-offset-background placeholder:text-zinc-400 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 focus-visible:border-orange-400 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-colors',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
