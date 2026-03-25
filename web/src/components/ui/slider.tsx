import * as SliderPrimitive from '@radix-ui/react-slider'

import { cn } from '../../lib/utils'

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root>

export function Slider({ className, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root
      className={cn('relative flex w-full touch-none select-none items-center', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-800">
        <SliderPrimitive.Range className="absolute h-full bg-cyan-400" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="slider-thumb-touch block h-5 w-5 rounded-full border border-cyan-200/70 bg-cyan-300 shadow-lg ring-offset-slate-950 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200" />
    </SliderPrimitive.Root>
  )
}
