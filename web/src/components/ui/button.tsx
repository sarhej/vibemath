import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'

import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border-cyan-400/50 bg-cyan-400/15 px-4 py-2 text-cyan-50 hover:bg-cyan-400/25',
        ghost: 'border-slate-700 bg-slate-900/40 px-4 py-2 text-slate-200 hover:bg-slate-800/80',
        subtle: 'border-slate-800 bg-slate-950/60 px-4 py-2 text-slate-300 hover:bg-slate-900',
      },
      size: {
        default: 'h-10',
        sm: 'h-8 px-3 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export function Button({ className, size, variant, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
