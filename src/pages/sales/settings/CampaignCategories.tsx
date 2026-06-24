import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Plus, Loader2, Pencil, Trash2, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { SideSheet } from '../components/SideSheet'
import { confirm } from '@/components/ui/confirm-dialog'
import {
  crmListCampaignCategories,
  crmCreateCampaignCategory,
  crmUpdateCampaignCategory,
  crmDeleteCampaignCategory,
} from '@/lib/crm/client'
import type { CrmCampaignCategory } from '@/lib/crm/types'

const DEFAULT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#14b8a6', '#ef4444', '#6366f1',
]

export default function CampaignCategoriesPage() {
  const [categories, setCategories] = useState<CrmCampaignCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<CrmCampaignCategory | null>(null)
  const [creating, setCreating] = useState(false)

  const refresh = () => {
    setLoading(true)
    crmListCampaignCategories()
      .then((r) => setCategories(r.categories))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const remove = async (cat: CrmCampaignCategory) => {
    const ok = await confirm({
      title: `Delete category "${cat.label}"?`,
      description: 'Existing campaigns in this category will be uncategorized. Soft-deleted — historical attribution preserved.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await crmDeleteCampaignCategory(cat.id)
      toast.success('Category deleted')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const toggleActive = async (cat: CrmCampaignCategory) => {
    try {
      await crmUpdateCampaignCategory(cat.id, { active: !cat.active })
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  }

  return (
    <div className="space-y-4">
      <Link to="/sales/campaigns" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ChevronLeft className="h-4 w-4" /> Back to campaigns
      </Link>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Campaign Categories</h1>
          <p className="text-sm text-muted-foreground">
            Brand / business groupings for campaigns (Howincloud Ads, Howin.ai Ads, Saltito, etc.)
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> New category
        </Button>
      </div>

      {error ? <div className="text-sm text-rose-600">{error}</div> : null}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-md border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          No categories yet. Add Howincloud Ads, Howin.ai Ads, etc. to group your campaigns.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-8" />
                <th className="px-3 py-2 font-medium">Label</th>
                <th className="px-3 py-2 font-medium">Key</th>
                <th className="px-3 py-2 font-medium">Color</th>
                <th className="px-3 py-2 font-medium text-center">Sort</th>
                <th className="px-3 py-2 font-medium text-center">Active</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-muted/40">
                  <td className="pl-3 text-muted-foreground"><GripVertical className="h-3.5 w-3.5" /></td>
                  <td className="px-3 py-2 font-medium">
                    <span className="inline-flex items-center gap-2">
                      {c.color ? <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} /> : <span className="h-3 w-3 rounded-full border" />}
                      {c.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{c.key}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{c.color ?? '—'}</td>
                  <td className="px-3 py-2 text-center text-xs">{c.sortOrder}</td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => toggleActive(c)}
                      className={`inline-block h-5 w-9 rounded-full transition ${c.active ? 'bg-emerald-500' : 'bg-muted'}`}
                    >
                      <span className={`block h-4 w-4 rounded-full bg-white mt-0.5 transition ${c.active ? 'ml-4' : 'ml-0.5'}`} />
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setEditing(c)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(c)} className="p-1 text-muted-foreground hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CategorySheet
        open={creating || !!editing}
        onClose={() => { setCreating(false); setEditing(null) }}
        editing={editing}
        onSaved={() => { setCreating(false); setEditing(null); refresh() }}
      />
    </div>
  )
}

function CategorySheet({
  open, onClose, editing, onSaved,
}: {
  open: boolean
  onClose: () => void
  editing: CrmCampaignCategory | null
  onSaved: () => void
}) {
  const [label, setLabel] = useState('')
  const [key, setKey] = useState('')
  const [color, setColor] = useState<string>('#3b82f6')
  const [sortOrder, setSortOrder] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (editing) {
      setLabel(editing.label)
      setKey(editing.key)
      setColor(editing.color ?? '#3b82f6')
      setSortOrder(editing.sortOrder)
    } else {
      setLabel(''); setKey(''); setColor('#3b82f6'); setSortOrder(0)
    }
  }, [open, editing])

  // Auto-derive key from label while creating
  useEffect(() => {
    if (editing) return
    setKey(label.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_|_$/g, '').slice(0, 40))
  }, [label, editing])

  const submit = async () => {
    if (!label.trim()) { setError('Label required'); return }
    if (!editing && !key) { setError('Key auto-derived from label cannot be empty'); return }
    setSubmitting(true)
    setError(null)
    try {
      if (editing) {
        await crmUpdateCampaignCategory(editing.id, {
          label: label.trim(),
          color,
          sortOrder,
        })
        toast.success('Category updated')
      } else {
        await crmCreateCampaignCategory({
          key,
          label: label.trim(),
          color,
          sortOrder,
        })
        toast.success('Category created')
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SideSheet open={open} onClose={onClose} title={editing ? 'Edit category' : 'New category'}>
      <div className="space-y-3">
        <Field label="Label" required>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Howincloud Ads"
            autoFocus
            maxLength={80}
            className="w-full h-9 rounded-md border bg-background px-2 text-sm"
          />
        </Field>
        <Field label="Key" hint={editing ? 'Key is immutable after creation' : 'Auto-derived from label. Used in URLs and the API.'}>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, '_'))}
            disabled={!!editing}
            placeholder="howincloud_ads"
            maxLength={40}
            className="w-full h-9 rounded-md border bg-background px-2 text-sm font-mono disabled:opacity-50"
          />
        </Field>
        <Field label="Color">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 rounded-md border bg-background cursor-pointer"
            />
            <input
              value={color}
              onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && setColor(e.target.value)}
              maxLength={7}
              className="flex-1 h-9 rounded-md border bg-background px-2 text-sm font-mono"
            />
          </div>
          <div className="flex gap-1.5 mt-1.5">
            {DEFAULT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="h-5 w-5 rounded-full border transition hover:scale-110"
                style={{ backgroundColor: c, outline: c === color ? `2px solid ${c}` : undefined, outlineOffset: 1 }}
              />
            ))}
          </div>
        </Field>
        <Field label="Sort order" hint="Lower numbers appear first">
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            className="w-full h-9 rounded-md border bg-background px-2 text-sm"
          />
        </Field>
        {error ? <div className="text-sm text-rose-600">{error}</div> : null}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting || !label.trim()}>
            {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            {submitting ? 'Saving…' : editing ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>
    </SideSheet>
  )
}
