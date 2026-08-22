/* Badge Component primitives - A component that displays a badge - from shadcn/ui (exposes Badge, badgeVariants) */
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100',
        secondary: 'border-zinc-200 bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
        destructive: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
        outline: 'border-zinc-200 text-zinc-700 hover:bg-zinc-50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
