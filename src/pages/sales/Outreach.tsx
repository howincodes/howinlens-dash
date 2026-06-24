import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  StickyNote, Phone, MessageSquare, Mail, Users as UsersIcon,
} from 'lucide-react'
import { TimelineSkeleton } from '@/components/ui/skeleton'
import { crmListLeads, crmListOutreach } from '@/lib/crm/client'
import { fmtDateShort, outreachKindLabel } from '@/lib/crm/format'
import type { CrmOutreachEvent, CrmOutreachKind } from '@/lib/crm/types'
import { cn } from '@/lib/utils'

interface FeedItem extends CrmOutreachEvent {
  leadTitle: string
  contactName: string
}

const KIND_ICON: Record<CrmOutreachKind, React.ComponentType<{ className?: string }>> = {
  note: StickyNote,
  call: Phone,
  whatsapp: MessageSquare,
  email: Mail,
  meeting: UsersIcon,
  sms: MessageSquare,
  status_change: StickyNote,
  temperature_change: StickyNote,
  assignment: StickyNote,
  source_change: StickyNote,
}

const FILTER_KINDS: Array<CrmOutreachKind | 'all'> = [
  'all', 'note', 'call', 'whatsapp', 'email', 'meeting', 'sms',
]

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function Outreach() {
  const [date, setDate] = useState(todayIso())
  const [items, setItems] = useState<FeedItem[]>([])
  const [filter, setFilter] = useState<CrmOutreachKind | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    // Strategy: fetch all open + recent leads, then for each fetch outreach.
    // Acceptable for early v1 volume; will be optimized server-side later.
    crmListLeads({ limit: 500 })
      .then(async (r) => {
        if (cancelled) return
        const leads = r.leads
        const allEvents: FeedItem[] = []
        for (const lead of leads) {
          try {
            const er = await crmListOutreach(lead.id, { limit: 50 })
            for (const e of er.events) {
              const day = e.occurredAt.slice(0, 10)
              if (day === date) {
                allEvents.push({ ...e, leadTitle: lead.title, contactName: lead.contactName })
              }
            }
          } catch { /* skip lead on error */ }
          if (cancelled) return
        }
        allEvents.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
        if (!cancelled) setItems(allEvents)
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [date])

  const filtered = useMemo(
    () => filter === 'all' ? items : items.filter((i) => i.kind === filter),
    [items, filter],
  )

  const counts = useMemo(() => {
    const c: Partial<Record<CrmOutreachKind, number>> = {}
    for (const i of items) c[i.kind] = (c[i.kind] ?? 0) + 1
    return c
  }, [items])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Outreach feed</h1>
        <p className="text-sm text-muted-foreground">All sales activity logged across leads.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setDate(shiftDate(date, -1))}
          className="h-8 px-2 rounded-md border bg-background hover:bg-muted text-xs inline-flex items-center"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <div className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border bg-background">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent text-sm outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setDate(shiftDate(date, 1))}
          className="h-8 px-2 rounded-md border bg-background hover:bg-muted text-xs inline-flex items-center"
          disabled={date >= todayIso()}
          aria-label="Next day"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setDate(todayIso())}
          className="h-8 px-2 rounded-md border bg-background hover:bg-muted text-xs"
        >
          Today
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {FILTER_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={cn(
              'h-7 px-2.5 rounded-full text-xs border inline-flex items-center gap-1',
              filter === k
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background border-border hover:bg-muted text-muted-foreground',
            )}
          >
            {k === 'all' ? `All (${items.length})` : `${outreachKindLabel(k as CrmOutreachKind)} (${counts[k as CrmOutreachKind] ?? 0})`}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-600">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-lg border bg-card p-4">
          <TimelineSkeleton rows={6} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          No outreach for this day.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((ev) => {
            const Icon = KIND_ICON[ev.kind] ?? StickyNote
            return (
              <li key={ev.id} className="rounded-md border bg-card p-3 flex gap-3">
                <div className="h-7 w-7 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <Link to={`/sales/leads/${ev.leadId}`} className="font-medium text-sm hover:text-primary truncate">
                      {ev.leadTitle}
                    </Link>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {fmtDateShort(ev.occurredAt)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {outreachKindLabel(ev.kind)} · {ev.contactName}
                    {ev.byUserName ? ` · by ${ev.byUserName}` : ''}
                  </div>
                  {ev.body ? (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{ev.body}</p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
