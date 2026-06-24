import { cn } from '@/lib/utils'
import { tempBg, tempDot, tempLabel } from '@/lib/crm/format'
import type { CrmLeadTemperature } from '@/lib/crm/types'

interface Props {
  value: CrmLeadTemperature
  size?: 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

export function TemperatureBadge({ value, size = 'md', showLabel = true, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs',
        tempBg(value),
        className,
      )}
      title={`${tempLabel(value)} lead`}
    >
      <span aria-hidden>{tempDot(value)}</span>
      {showLabel ? tempLabel(value) : null}
    </span>
  )
}
