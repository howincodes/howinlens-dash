import { useEffect, useRef, useState } from 'react'
import { Loader2, Plus, Search, User as UserIcon, UserCircle, X } from 'lucide-react'
import { UserPicker, Avatar } from '@/components/ui/user-picker'
import { crmListContacts, crmCreateContact } from '@/lib/crm/client'
import type { CrmContact } from '@/lib/crm/types'
import { cn } from '@/lib/utils'

export interface ReferrerValue {
  kind: 'user' | 'contact' | null
  userId?: number | null
  contactId?: number | null
  contactPreview?: { name: string; phone?: string | null; email?: string | null } | null
}

interface Props {
  value: ReferrerValue
  onChange: (next: ReferrerValue) => void
  /** When true, marks as required (red border / asterisk handled by parent). */
  required?: boolean
  className?: string
}

export function ReferrerPicker({ value, onChange, required, className }: Props) {
  return (
    <div className={cn('space-y-2', className)}>
      <SegmentedToggle
        value={value.kind ?? 'user'}
        onChange={(k) =>
          onChange({ kind: k, userId: null, contactId: null, contactPreview: null })
        }
      />
      {value.kind === 'user' || value.kind == null ? (
        <UserPicker
          value={value.userId ?? null}
          onChange={(id) => onChange({ kind: 'user', userId: id, contactId: null, contactPreview: null })}
          placeholder={required ? 'Pick an internal team member *' : 'Pick a team member'}
          allowUnassigned={false}
        />
      ) : (
        <ExternalContactPicker
          contactId={value.contactId ?? null}
          preview={value.contactPreview ?? null}
          onChange={(c) =>
            onChange({
              kind: 'contact',
              userId: null,
              contactId: c?.id ?? null,
              contactPreview: c ? { name: c.name, phone: c.phone, email: c.email } : null,
            })
          }
          required={required}
        />
      )}
    </div>
  )
}

function SegmentedToggle({
  value, onChange,
}: { value: 'user' | 'contact'; onChange: (v: 'user' | 'contact') => void }) {
  return (
    <div className="inline-flex rounded-md border bg-background overflow-hidden">
      <button
        type="button"
        onClick={() => onChange('user')}
        className={cn(
          'h-8 px-3 text-xs inline-flex items-center gap-1.5 transition-colors',
          value === 'user' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
        )}
      >
        <UserIcon className="h-3.5 w-3.5" /> Internal team
      </button>
      <button
        type="button"
        onClick={() => onChange('contact')}
        className={cn(
          'h-8 px-3 text-xs inline-flex items-center gap-1.5 transition-colors border-l',
          value === 'contact' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
        )}
      >
        <UserCircle className="h-3.5 w-3.5" /> External person
      </button>
    </div>
  )
}

function ExternalContactPicker({
  contactId, preview, onChange, required,
}: {
  contactId: number | null
  preview: { name: string; phone?: string | null; email?: string | null } | null
  onChange: (c: { id: number; name: string; phone?: string | null; email?: string | null } | null) => void
  required?: boolean
}) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<CrmContact[]>([])
  const [searching, setSearching] = useState(false)
  const [creating, setCreating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Selected display
  const selectedLabel = preview
    ? `${preview.name}${preview.phone ? ` · ${preview.phone}` : preview.email ? ` · ${preview.email}` : ''}`
    : ''

  // Debounced search
  useEffect(() => {
    if (!open) return
    if (q.trim().length === 0) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const timer = setTimeout(() => {
      crmListContacts({ q, limit: 20 })
        .then((r) => setResults(r.contacts))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [q, open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const inlineCreate = async () => {
    const name = q.trim()
    if (!name) return
    setCreating(true)
    try {
      const r = await crmCreateContact({ name }) as { contact: CrmContact }
      onChange({ id: r.contact.id, name: r.contact.name, phone: r.contact.phone, email: r.contact.email })
      setOpen(false)
      setQ('')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      {contactId && preview ? (
        <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
          <Avatar name={preview.name} size="md" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{preview.name}</div>
            {preview.phone ? (
              <div className="text-[11px] text-muted-foreground truncate">{preview.phone}</div>
            ) : preview.email ? (
              <div className="text-[11px] text-muted-foreground truncate">{preview.email}</div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="p-1 text-muted-foreground hover:text-rose-600"
            aria-label="Clear referrer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="search"
              value={q}
              onChange={(e) => { setQ(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
              placeholder={required ? 'Search past students / referrers *' : 'Search by name, phone, or email'}
              className="w-full h-9 pl-8 pr-2 rounded-md border bg-background text-sm"
            />
          </div>
          {open ? (
            <div className="absolute z-30 mt-1 w-full rounded-md border bg-popover shadow-lg overflow-hidden">
              <ul className="max-h-60 overflow-y-auto py-1">
                {searching ? (
                  <li className="px-3 py-2 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" /> Searching…
                  </li>
                ) : null}
                {results.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange({ id: c.id, name: c.name, phone: c.phone, email: c.email })
                        setOpen(false)
                        setQ('')
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted text-left"
                    >
                      <Avatar name={c.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {c.phone || c.email || '—'}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
                {!searching && q.trim() && results.length === 0 ? (
                  <li>
                    <button
                      type="button"
                      onClick={inlineCreate}
                      disabled={creating}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left border-t"
                    >
                      {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      <span>Create new contact <strong>"{q.trim()}"</strong></span>
                    </button>
                  </li>
                ) : null}
                {!searching && !q.trim() ? (
                  <li className="px-3 py-2 text-xs text-muted-foreground italic">
                    Type a name, phone, or email to search
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </>
      )}
      <p className="text-[10px] text-muted-foreground mt-1">
        {selectedLabel || 'Pick an existing contact, or type a name to create a new one.'}
      </p>
    </div>
  )
}
