import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Phone, Mail, MessageSquare, Loader2 } from 'lucide-react'
import { crmGetContact, crmListLeads } from '@/lib/crm/client'
import { fmtDateShort, fmtMoney, statusColor, statusLabel } from '@/lib/crm/format'
import { TemperatureBadge } from './components/TemperatureBadge'
import type { CrmContact, CrmLeadListItem } from '@/lib/crm/types'
import { cn } from '@/lib/utils'

export default function ContactDetail() {
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const [contact, setContact] = useState<CrmContact | null>(null)
  const [leads, setLeads] = useState<CrmLeadListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!Number.isFinite(id)) return
    setLoading(true)
    Promise.all([
      crmGetContact(id).then((r) => setContact(r.contact)),
      crmListLeads({ limit: 200 }).then((r) => setLeads(r.leads.filter((l) => l.contactId === id))),
    ])
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading && !contact) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
  }
  if (error || !contact) {
    return <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-600">{error ?? 'Contact not found'}</div>
  }

  const wonCount = leads.filter((l) => l.status === 'won').length
  const wonValue = leads
    .filter((l) => l.status === 'won')
    .reduce((sum, l) => sum + Number(l.value ?? 0), 0)

  return (
    <div className="space-y-4">
      <Link to="/sales/contacts" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ChevronLeft className="h-4 w-4" /> Back to contacts
      </Link>

      <div className="rounded-lg border bg-card p-4">
        <h1 className="text-2xl font-bold">{contact.name}</h1>
        {contact.companyName ? <div className="text-sm text-muted-foreground mt-0.5">{contact.companyName}</div> : null}
        <div className="flex flex-wrap gap-3 text-sm mt-3 text-muted-foreground">
          {contact.phone ? <div className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4" />{contact.phone}</div> : null}
          {contact.email ? <div className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" />{contact.email}</div> : null}
          {contact.whatsapp ? <div className="inline-flex items-center gap-1.5"><MessageSquare className="h-4 w-4" />{contact.whatsapp}</div> : null}
        </div>
        {contact.notes ? <div className="text-sm text-muted-foreground italic mt-3">{contact.notes}</div> : null}
        <div className="flex gap-6 mt-4 text-xs text-muted-foreground">
          <div><span className="text-foreground font-bold text-base">{leads.length}</span> total leads</div>
          <div><span className="text-foreground font-bold text-base">{wonCount}</span> won</div>
          <div><span className="text-foreground font-bold text-base">{fmtMoney(wonValue, 'INR')}</span> won value</div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-2">Leads ({leads.length})</h2>
        {leads.length === 0 ? (
          <div className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">No leads yet.</div>
        ) : (
          <ul className="space-y-2">
            {leads.map((l) => (
              <li key={l.id} className="rounded-md border bg-card p-3 hover:border-primary/40 transition">
                <Link to={`/sales/leads/${l.id}`} className="block">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium hover:text-primary">{l.title}</div>
                    <TemperatureBadge value={l.temperature} size="sm" />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn('inline-block px-1.5 py-0.5 rounded-full border text-[11px]', statusColor(l.status))}>
                      {statusLabel(l.status)}
                    </span>
                    <span className="text-xs text-muted-foreground">{l.sourceLabel} · {fmtDateShort(l.createdAt)}</span>
                    {l.value ? <span className="text-xs font-mono ml-auto">{fmtMoney(l.value, l.currency)}</span> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
