import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Loader2, Plus, Phone, Mail, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { PhoneInput } from '@/components/ui/phone-input'
import { Avatar } from '@/components/ui/user-picker'
import { TableRowSkeleton } from '@/components/ui/skeleton'
import { useHasPermission } from '@/store/authStore'
import { crmListContacts, crmCreateContact } from '@/lib/crm/client'
import { fmtDateShort, fmtMoney } from '@/lib/crm/format'
import { formatStoredPhone } from '@/lib/phone'
import { email as validateEmail } from '@/lib/forms/validate'
import { SideSheet } from './components/SideSheet'
import type { CrmContact } from '@/lib/crm/types'

export default function Contacts() {
  const [contacts, setContacts] = useState<CrmContact[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const canWrite = useHasPermission('crm.contacts.write')

  const refresh = () => {
    setLoading(true)
    crmListContacts({ q: q || undefined, limit: 200 })
      .then((r) => setContacts(r.contacts))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const t = setTimeout(refresh, q ? 250 : 0)
    return () => clearTimeout(t)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-sm text-muted-foreground">{contacts.length} people in your CRM</p>
        </div>
        {canWrite ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New contact
          </Button>
        ) : null}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search name, phone, email, company…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full h-9 pl-8 pr-2 rounded-md border bg-background text-sm"
        />
      </div>

      {error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-600 flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={refresh}>Retry</Button>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Phone / Email</th>
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium text-right">Leads</th>
                <th className="px-3 py-2 font-medium text-right">Won</th>
                <th className="px-3 py-2 font-medium">Last contacted</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)}
            </tbody>
          </table>
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-md border bg-muted/30 p-12 text-center space-y-3">
          {q ? (
            <>
              <p className="text-sm text-muted-foreground">No contacts match "{q}".</p>
              <Button size="sm" variant="outline" onClick={() => setQ('')}>Clear search</Button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">No contacts yet.</p>
              <p className="text-xs text-muted-foreground">
                Contacts are auto-created when you create a lead. You can also add one manually.
              </p>
              {canWrite ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add contact
                </Button>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Phone / Email</th>
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium text-right">Leads</th>
                <th className="px-3 py-2 font-medium text-right">Won value</th>
                <th className="px-3 py-2 font-medium">Last contacted</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => window.location.assign(`/sales/contacts/${c.id}`)}>
                  <td className="px-3 py-2">
                    <Link to={`/sales/contacts/${c.id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-primary inline-flex items-center gap-2">
                      <Avatar name={c.name} size="md" /> {c.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {c.phone ? (
                      <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 hover:underline tabular-nums">
                        <Phone className="h-3 w-3" />{formatStoredPhone(c.phone)}
                      </a>
                    ) : null}
                    {c.email ? (
                      <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} className="block mt-0.5 hover:underline">
                        <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>
                      </a>
                    ) : null}
                    {c.whatsapp && c.whatsapp !== c.phone ? (
                      <a href={`https://wa.me/${(c.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="block mt-0.5 hover:underline">
                        <span className="inline-flex items-center gap-1"><MessageSquare className="h-3 w-3" />{formatStoredPhone(c.whatsapp)}</span>
                      </a>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs">{c.companyName ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{c.leadsCount ?? 0}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {c.wonCount ? `${c.wonCount} won` : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {c.lastContactedAt ? fmtDateShort(c.lastContactedAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateContactSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); refresh() }}
      />
    </div>
  )
}

function CreateContactSheet({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) { setName(''); setPhone(''); setEmail(''); setCompany(''); setNotes(''); setError(null) }
  }, [open])

  const submit = async () => {
    if (!name.trim()) { setError('Name required'); return }
    setSubmitting(true)
    setError(null)
    try {
      await crmCreateContact({
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        companyName: company.trim() || null,
        notes: notes.trim() || null,
      })
      toast.success(`Contact "${name.trim()}" created`)
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  const emailErr = email.trim() ? validateEmail(email) : null
  const canSubmit = !!name.trim() && !emailErr

  return (
    <SideSheet open={open} onClose={onClose} title="New contact">
      <div className="space-y-3">
        <Field label="Name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Riya Sharma"
            autoFocus
            maxLength={200}
            className="w-full h-9 rounded-md border bg-background px-2 text-sm"
          />
        </Field>
        <Field label="Phone">
          <PhoneInput value={phone} onChange={setPhone} />
        </Field>
        <Field label="Email" error={emailErr}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="riya@example.com"
            maxLength={255}
            className="w-full h-9 rounded-md border bg-background px-2 text-sm"
          />
        </Field>
        <Field label="Company">
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Corp (optional)"
            className="w-full h-9 rounded-md border bg-background px-2 text-sm"
          />
        </Field>
        <Field label="Notes">
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-md border bg-background p-2 text-sm resize-y"
          />
        </Field>
        {error ? <div className="text-sm text-rose-600">{error}</div> : null}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting || !canSubmit}>
            {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </SideSheet>
  )
}

// Suppress unused-warning for fmtMoney (kept for future use)
void fmtMoney
