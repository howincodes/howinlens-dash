import { cn } from '@/lib/utils'
import { CRM_LEAD_STATUSES, type CrmLeadStatus } from '@/lib/crm/types'
import { statusLabel } from '@/lib/crm/format'

interface Props {
  current: CrmLeadStatus
  onTransition?: (status: CrmLeadStatus) => void
  disabled?: boolean
}

export function StageStepper({ current, onTransition, disabled }: Props) {
  const idx = CRM_LEAD_STATUSES.indexOf(current)
  const failed = current === 'lost' || current === 'dropped'
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {CRM_LEAD_STATUSES.map((s, i) => {
        const isCurrent = s === current
        const isTerminal = s === 'won' || s === 'lost' || s === 'dropped'
        // Only the open stages before the current one count as "past"; a failed
        // lead (lost/dropped) has no progression to show, and terminal stages
        // are never lit as past regardless of their position in the list.
        const isPast = i < idx && !failed && !isTerminal
        return (
          <button
            key={s}
            type="button"
            disabled={disabled || isCurrent}
            onClick={() => onTransition?.(s)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors whitespace-nowrap',
              isCurrent && 'bg-primary text-primary-foreground border-primary cursor-default',
              !isCurrent && isPast && 'bg-muted text-foreground border-border',
              !isCurrent && !isPast && 'bg-background text-muted-foreground border-border hover:bg-muted',
              isTerminal && !isCurrent && 'opacity-60 hover:opacity-100',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <span
              className={cn(
                'inline-block h-1.5 w-1.5 rounded-full',
                isCurrent ? 'bg-primary-foreground' : isPast ? 'bg-foreground/60' : 'bg-muted-foreground/40',
              )}
            />
            {statusLabel(s)}
          </button>
        )
      })}
    </div>
  )
}
