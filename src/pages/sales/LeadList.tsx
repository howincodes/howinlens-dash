import { Link } from 'react-router-dom'
import { Phone, Mail } from 'lucide-react'
import { fmtMoney, fmtFollowupCountdown, statusColor, statusLabel } from '@/lib/crm/format'
import { formatStoredPhone } from '@/lib/phone'
import { TemperatureBadge } from './components/TemperatureBadge'
import { Avatar } from '@/components/ui/user-picker'
import type { CrmLeadListItem } from '@/lib/crm/types'
import { cn } from '@/lib/utils'

interface Props {
  leads: CrmLeadListItem[]
}

export function LeadList({ leads }: Props) {
  if (leads.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 p-12 text-center">
        <p className="text-sm text-muted-foreground">No leads match these filters.</p>
      </div>
    )
  }
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Lead</th>
            <th className="px-3 py-2 font-medium">Contact</th>
            <th className="px-3 py-2 font-medium">Source</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Temp</th>
            <th className="px-3 py-2 font-medium text-right">Value</th>
            <th className="px-3 py-2 font-medium">Owner</th>
            <th className="px-3 py-2 font-medium">Follow-up</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {leads.map((lead) => {
            const due = fmtFollowupCountdown(lead.nextFollowupAt)
            return (
              <tr key={lead.id} className="hover:bg-muted/40">
                <td className="px-3 py-2">
                  <Link to={`/sales/leads/${lead.id}`} className="font-medium hover:text-primary">
                    {lead.title}
                  </Link>
                  {lead.courseOrService ? (
                    <div className="text-[11px] text-muted-foreground">{lead.courseOrService}</div>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-xs">
                  <div className="font-medium inline-flex items-center gap-1.5">
                    <Avatar name={lead.contactName} size="sm" /> {lead.contactName}
                  </div>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                    {lead.contactPhone ? (
                      <a href={`tel:${lead.contactPhone}`} className="inline-flex items-center gap-1 hover:underline tabular-nums">
                        <Phone className="h-3 w-3" />{formatStoredPhone(lead.contactPhone)}
                      </a>
                    ) : null}
                    {lead.contactEmail ? (
                      <a href={`mailto:${lead.contactEmail}`} className="inline-flex items-center gap-1 hover:underline">
                        <Mail className="h-3 w-3" />{lead.contactEmail}
                      </a>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {lead.sourceLabel}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">
                  <span className={cn('inline-block px-2 py-0.5 rounded-full border', statusColor(lead.status))}>
                    {statusLabel(lead.status)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <TemperatureBadge value={lead.temperature} size="sm" showLabel={false} />
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {fmtMoney(lead.value, lead.currency)}
                </td>
                <td className="px-3 py-2 text-xs">
                  {lead.ownerName ?? <span className="italic text-muted-foreground">unassigned</span>}
                </td>
                <td className="px-3 py-2 text-xs">
                  <span
                    className={cn(
                      'inline-block px-1.5 py-0.5 rounded',
                      due.tone === 'overdue' && 'bg-rose-500/15 text-rose-600 font-semibold',
                      due.tone === 'due_today' && 'bg-amber-500/15 text-amber-700 font-semibold',
                      due.tone === 'soon' && 'bg-blue-500/10 text-blue-600',
                      due.tone === 'later' && 'bg-muted',
                      due.tone === 'none' && 'text-muted-foreground italic',
                    )}
                  >
                    {due.text}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
