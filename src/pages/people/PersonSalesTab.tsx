import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Sparkles, UserCheck } from 'lucide-react'
import { crmListLeads } from '@/lib/crm/client'
import { fmtMoney, fmtDateShort, statusColor, statusLabel } from '@/lib/crm/format'
import { TemperatureBadge } from '@/pages/sales/components/TemperatureBadge'
import type { CrmLeadListItem } from '@/lib/crm/types'
import { cn } from '@/lib/utils'

interface Props {
  userId: number | string
}

/**
 * Sales tab on Person profile.
 * - Top: leads owned by this user
 * - Bottom: leads referred by this user (referrer_user_id)
 */
export default function PersonSalesTab({ userId }: Props) {
  const [owned, setOwned] = useState<CrmLeadListItem[]>([])
  const [referred, setReferred] = useState<CrmLeadListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      crmListLeads({ owner: String(userId), limit: 100 }),
      crmListLeads({ referrer: `user:${userId}`, limit: 100 }),
    ])
      .then(([o, r]) => {
        if (cancelled) return
        setOwned(o.leads)
        setReferred(r.leads)
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId])

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
  }
  if (error) {
    return <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-600">{error}</div>
  }

  return (
    <div className="space-y-5 mt-3">
      <Section
        icon={Sparkles}
        title="Owned leads"
        empty="No leads currently owned."
        leads={owned}
      />
      <Section
        icon={UserCheck}
        title="Referred-by leads"
        empty="No leads referred by this person."
        leads={referred}
      />
    </div>
  )
}

function Section({
  icon: Icon, title, empty, leads,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  empty: string
  leads: CrmLeadListItem[]
}) {
  const wonCount = leads.filter((l) => l.status === 'won').length
  const wonValue = leads.filter((l) => l.status === 'won').reduce((s, l) => s + Number(l.value ?? 0), 0)
  const openCount = leads.filter((l) => ['new', 'contacted', 'qualified', 'negotiating', 'on_followup'].includes(l.status)).length
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold inline-flex items-center gap-1.5">
          <Icon className="h-4 w-4 text-muted-foreground" /> {title}
        </h3>
        <span className="text-xs text-muted-foreground">
          {leads.length} total · {openCount} open · {wonCount} won · {fmtMoney(wonValue)} won-value
        </span>
      </div>
      {leads.length === 0 ? (
        <div className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground italic">{empty}</div>
      ) : (
        <ul className="space-y-2">
          {leads.slice(0, 10).map((l) => (
            <li key={l.id} className="rounded-md border bg-card p-2.5 hover:border-primary/40 transition">
              <Link to={`/sales/leads/${l.id}`} className="block">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm hover:text-primary truncate">{l.title}</span>
                  <span className={cn('inline-block px-1.5 py-0.5 rounded-full border text-[10px]', statusColor(l.status))}>
                    {statusLabel(l.status)}
                  </span>
                  <TemperatureBadge value={l.temperature} size="sm" showLabel={false} />
                  {l.value ? <span className="text-xs font-mono ml-auto">{fmtMoney(l.value, l.currency)}</span> : null}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {l.contactName} · {l.sourceLabel} · {fmtDateShort(l.createdAt)}
                </div>
              </Link>
            </li>
          ))}
          {leads.length > 10 ? (
            <li className="text-center text-xs text-muted-foreground italic">
              + {leads.length - 10} more
            </li>
          ) : null}
        </ul>
      )}
    </div>
  )
}
