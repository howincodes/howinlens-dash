import { useEffect, useState } from 'react'
import { Loader2, Plus, Pencil, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { crmListSources, crmCreateSource, crmUpdateSource } from '@/lib/crm/client'
import type { CrmLeadSource, CrmSourceKind } from '@/lib/crm/types'

const KINDS: CrmSourceKind[] = ['ad', 'referral', 'inbound', 'offline', 'other']

export default function CrmSources() {
  const [sources, setSources] = useState<CrmLeadSource[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState<Partial<CrmLeadSource>>({})
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = () => {
    setLoading(true)
    crmListSources()
      .then((r) => setSources(r.sources))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const startEdit = (s: CrmLeadSource) => {
    setEditingId(s.id)
    setDraft({ label: s.label, kind: s.kind, sortOrder: s.sortOrder, active: s.active })
  }

  const saveEdit = async () => {
    if (editingId == null) return
    try {
      await crmUpdateSource(editingId, draft as never)
      toast.success('Source saved')
      setEditingId(null)
      refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed'
      setError(msg)
      toast.error(msg)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setCreating(true); setDraft({ label: '', kind: 'other', sortOrder: 99, active: true }) }}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add source
        </Button>
      </div>
      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Key</th>
                <th className="px-3 py-2 font-medium">Label</th>
                <th className="px-3 py-2 font-medium">Kind</th>
                <th className="px-3 py-2 font-medium text-right">Sort</th>
                <th className="px-3 py-2 font-medium">Active</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {creating ? (
                <NewSourceRow draft={draft} setDraft={setDraft} onCancel={() => setCreating(false)} onSave={async () => {
                  try {
                    await crmCreateSource({ key: (draft.key as string) || (draft.label as string)?.toLowerCase().replace(/\W+/g, '_') || 'src', label: draft.label as string, kind: draft.kind as string, sortOrder: draft.sortOrder, active: draft.active })
                    toast.success('Source added')
                    setCreating(false)
                    refresh()
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : 'Failed'
                    setError(msg)
                    toast.error(msg)
                  }
                }} />
              ) : null}
              {sources.map((s) => {
                const editing = editingId === s.id
                return (
                  <tr key={s.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{s.key}</td>
                    <td className="px-3 py-2">
                      {editing ? (
                        <input value={(draft.label as string) ?? ''} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className="h-7 px-2 rounded border bg-background text-sm w-full" />
                      ) : s.label}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {editing ? (
                        <select value={(draft.kind as string) ?? ''} onChange={(e) => setDraft({ ...draft, kind: e.target.value as CrmSourceKind })} className="h-7 px-2 rounded border bg-background text-sm">
                          {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
                        </select>
                      ) : s.kind}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {editing ? (
                        <input type="number" value={(draft.sortOrder as number) ?? 0} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} className="w-16 h-7 px-2 rounded border bg-background text-sm text-right" />
                      ) : s.sortOrder}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {editing ? (
                        <input type="checkbox" checked={(draft.active as boolean) ?? false} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
                      ) : s.active ? '✓' : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {editing ? (
                        <>
                          <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-muted rounded"><Check className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground hover:bg-muted rounded"><X className="h-3.5 w-3.5" /></button>
                        </>
                      ) : (
                        <button onClick={() => startEdit(s)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function NewSourceRow({
  draft, setDraft, onCancel, onSave,
}: {
  draft: Partial<CrmLeadSource>
  setDraft: (d: Partial<CrmLeadSource>) => void
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <tr className="bg-muted/30">
      <td className="px-3 py-2">
        <input
          value={(draft.key as string) ?? ''}
          onChange={(e) => setDraft({ ...draft, key: e.target.value })}
          placeholder="auto"
          className="h-7 px-2 rounded border bg-background text-xs font-mono w-24"
        />
      </td>
      <td className="px-3 py-2">
        <input
          value={(draft.label as string) ?? ''}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          placeholder="Label"
          className="h-7 px-2 rounded border bg-background text-sm w-full"
        />
      </td>
      <td className="px-3 py-2">
        <select value={(draft.kind as string) ?? 'other'} onChange={(e) => setDraft({ ...draft, kind: e.target.value as CrmSourceKind })} className="h-7 px-2 rounded border bg-background text-sm">
          {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </td>
      <td className="px-3 py-2 text-right">
        <input type="number" value={(draft.sortOrder as number) ?? 99} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} className="w-16 h-7 px-2 rounded border bg-background text-sm text-right" />
      </td>
      <td className="px-3 py-2">
        <input type="checkbox" checked={(draft.active as boolean) ?? true} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
      </td>
      <td className="px-3 py-2 text-right">
        <button onClick={onSave} className="p-1 text-green-600 hover:bg-muted rounded"><Check className="h-3.5 w-3.5" /></button>
        <button onClick={onCancel} className="p-1 text-muted-foreground hover:bg-muted rounded"><X className="h-3.5 w-3.5" /></button>
      </td>
    </tr>
  )
}
