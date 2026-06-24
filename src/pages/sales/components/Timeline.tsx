import {
  StickyNote, Phone, MessageSquare, Mail, Users, ArrowRightCircle,
  Thermometer, UserPlus, Tag,
} from 'lucide-react'
import { fmtDateShort, outreachKindLabel } from '@/lib/crm/format'
import type { CrmOutreachEvent, CrmOutreachKind } from '@/lib/crm/types'

interface Props {
  events: CrmOutreachEvent[]
  emptyHint?: string
}

const KIND_ICON: Record<CrmOutreachKind, React.ComponentType<{ className?: string }>> = {
  note: StickyNote,
  call: Phone,
  whatsapp: MessageSquare,
  email: Mail,
  meeting: Users,
  sms: MessageSquare,
  status_change: ArrowRightCircle,
  temperature_change: Thermometer,
  assignment: UserPlus,
  source_change: Tag,
}

const SYSTEM_KINDS: CrmOutreachKind[] = ['status_change', 'temperature_change', 'assignment', 'source_change']

export function Timeline({ events, emptyHint }: Props) {
  if (events.length === 0) {
    return (
      <div className="rounded-md border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        {emptyHint ?? 'No activity yet — log a call, note, or WhatsApp to start the timeline.'}
      </div>
    )
  }
  return (
    <ul className="space-y-3">
      {events.map((ev) => {
        const Icon = KIND_ICON[ev.kind] ?? StickyNote
        const isSys = SYSTEM_KINDS.includes(ev.kind)
        return (
          <li
            key={ev.id}
            className={`flex gap-3 ${isSys ? 'opacity-80' : ''}`}
          >
            <div className={`mt-0.5 h-7 w-7 shrink-0 rounded-full flex items-center justify-center ${isSys ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-sm font-medium">
                  {outreachKindLabel(ev.kind)}
                </div>
                <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {fmtDateShort(ev.occurredAt)}
                </div>
              </div>
              {ev.body ? (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words mt-0.5">
                  {ev.body}
                </div>
              ) : null}
              {ev.byUserName ? (
                <div className="text-[11px] text-muted-foreground/80 mt-0.5">
                  by {ev.byUserName}
                  {ev.durationSeconds ? ` · ${Math.round(ev.durationSeconds / 60)} min` : ''}
                  {ev.outcome ? ` · ${ev.outcome}` : ''}
                </div>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
