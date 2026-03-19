import * as SwitchPrimitive from '@radix-ui/react-switch'

import { cn } from '../../lib/utils'

type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root>

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-slate-700 bg-slate-900 transition-colors data-[state=checked]:border-cyan-400/60 data-[state=checked]:bg-cyan-400/25',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block h-5 w-5 translate-x-0.5 rounded-full bg-slate-200 shadow-lg transition-transform data-[state=checked]:translate-x-5" />
    </SwitchPrimitive.Root>
  )
}
