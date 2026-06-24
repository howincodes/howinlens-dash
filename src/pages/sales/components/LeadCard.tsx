import { Link } from 'react-router-dom'
import { Phone, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtFollowupCountdown, fmtMoney } from '@/lib/crm/format'
import { formatStoredPhone } from '@/lib/phone'
import { TemperatureBadge } from './TemperatureBadge'
import { Avatar } from '@/components/ui/user-picker'
import type { CrmLeadListItem } from '@/lib/crm/types'

interface Props {
  lead: CrmLeadListItem
  onDragStart?: (id: number) => void
  isDragging?: boolean
}

export function LeadCard({ lead, onDragStart, isDragging }: Props) {
  const due = fmtFollowupCountdown(lead.nextFollowupAt)

  return (
    <Link
      to={`/sales/leads/${lead.id}`}
      draggable={!!onDragStart}
      onDragStart={() => onDragStart?.(lead.id)}
      className={cn(
        'group block rounded-lg border bg-card p-3 shadow-sm hover:shadow-md hover:border-primary/40 transition-all',
        isDragging && 'opacity-50 ring-2 ring-primary/40',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="font-medium text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {lead.title}
        </div>
        <TemperatureBadge value={lead.temperature} size="sm" showLabel={false} />
      </div>

      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2 min-w-0">
        <Avatar name={lead.contactName} size="sm" />
        <span className="truncate">{lead.contactName}</span>
        {lead.contactPhone ? (
          <span className="inline-flex items-center gap-0.5 opacity-70 tabular-nums shrink-0">
            <Phone className="h-3 w-3" />{formatStoredPhone(lead.contactPhone)}
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          {lead.sourceLabel}
        </span>
        {lead.value ? (
          <span className="font-mono font-medium text-foreground">
            {fmtMoney(lead.value, lead.currency)}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded',
            due.tone === 'overdue' && 'bg-rose-500/15 text-rose-600 font-semibold',
            due.tone === 'due_today' && 'bg-amber-500/15 text-amber-700 font-semibold',
            due.tone === 'soon' && 'bg-blue-500/10 text-blue-600',
            due.tone === 'later' && 'bg-muted',
            due.tone === 'none' && 'bg-muted/50 italic',
          )}
        >
          {due.tone !== 'none' ? <MessageSquare className="h-3 w-3" /> : null}
          {due.text}
        </span>
        {lead.ownerName ? (
          <span className="truncate max-w-[100px]">{lead.ownerName}</span>
        ) : (
          <span className="italic">unassigned</span>
        )}
      </div>
    </Link>
  )
}
