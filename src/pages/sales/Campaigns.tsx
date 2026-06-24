import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Loader2, Pencil, Trash2, Settings2, TrendingUp, TrendingDown, Scale, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { MoneyInput } from '@/components/ui/money-input'
import { SideSheet } from './components/SideSheet'
import { confirm } from '@/components/ui/confirm-dialog'
import {
  crmListCampaigns, crmCreateCampaign, crmUpdateCampaign, crmDeleteCampaign,
  crmListSources, crmListPipelines, crmListCampaignCategories,
} from '@/lib/crm/client'
import { fmtMoney } from '@/lib/crm/format'
import type { CrmCampaign, CrmLeadSource, CrmPipeline, CrmCampaignCategory } from '@/lib/crm/types'

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<CrmCampaign[]>([])
  const [sources, setSources] = useState<CrmLeadSource[]>([])
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([])
  const [categories, setCategories] = useState<CrmCampaignCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<CrmCampaign | null>(null)
  const [creating, setCreating] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('')  // '' = all, '__none' = uncategorized

  const refresh = () => {
    setLoading(true)
    Promise.all([crmListCampaigns(), crmListSources(), crmListPipelines(), crmListCampaignCategories()])
      .then(([c, s, p, cats]) => {
        setCampaigns(c.campaigns)
        setSources(s.sources)
        setPipelines(p.pipelines)
        setCategories(cats.categories)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const filtered = useMemo(() => {
    if (!categoryFilter) return campaigns
    if (categoryFilter === '__none') return campaigns.filter((c) => !c.categoryId)
    return campaigns.filter((c) => c.categoryKey === categoryFilter)
  }, [campaigns, categoryFilter])

  const remove = async (id: number, name: string) => {
    const ok = await confirm({
      title: `Delete campaign "${name}"?`,
      description: 'Soft-deleted — historical lead attribution preserved.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await crmDeleteCampaign(id)
      toast.success('Campaign deleted')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} of {campaigns.length} campaigns · track ad spend + ROI</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/sales/settings/categories">
            <Button variant="outline" size="sm">
              <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Categories
            </Button>
          </Link>
          <Link to="/sales/settings/limits">
            <Button variant="outline" size="sm">
              <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Limits
            </Button>
          </Link>
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New campaign
          </Button>
        </div>
      </div>

      {/* Category chips */}
      {categories.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          <CategoryChip active={categoryFilter === ''} onClick={() => setCategoryFilter('')} label="All" count={campaigns.length} />
          {categories.map((cat) => {
            const count = campaigns.filter((c) => c.categoryKey === cat.key).length
            return (
              <CategoryChip
                key={cat.key}
                active={categoryFilter === cat.key}
                color={cat.color}
                onClick={() => setCategoryFilter(cat.key)}
                label={cat.label}
                count={count}
              />
            )
          })}
          {campaigns.some((c) => !c.categoryId) ? (
            <CategoryChip
              active={categoryFilter === '__none'}
              onClick={() => setCategoryFilter('__none')}
              label="Uncategorized"
              count={campaigns.filter((c) => !c.categoryId).length}
            />
          ) : null}
        </div>
      ) : null}

      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          {campaigns.length === 0
            ? 'No campaigns yet. Add one to track Meta/Google ad spend per source.'
            : 'No campaigns in this category.'}
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">AI</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Pipeline</th>
                <th className="px-3 py-2 font-medium text-right">Budget</th>
                <th className="px-3 py-2 font-medium text-right">Recharged</th>
                <th className="px-3 py-2 font-medium text-right">Spend</th>
                <th className="px-3 py-2 font-medium text-right">Leads / Won</th>
                <th className="px-3 py-2 font-medium text-right">ROI</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((c) => {
                const wv = Number(c.wonValue || 0)
                const sp = Number(c.spend || 0)
                const roi = sp > 0 ? (wv / sp).toFixed(1) + '×' : '—'
                return (
                  <tr key={c.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2 font-medium">
                      <Link to={`/sales/campaigns/${c.id}`} className="hover:text-primary">{c.name}</Link>
                    </td>
                    <td className="px-3 py-2">
                      <VerdictBadge v={c.latestVerdict} />
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {c.categoryLabel ? (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[11px]"
                          style={c.categoryColor ? { borderColor: c.categoryColor + '66', color: c.categoryColor } : undefined}
                        >
                          {c.categoryColor ? <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.categoryColor }} /> : null}
                          {c.categoryLabel}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">{c.sourceLabel ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2 text-xs">{c.pipelineKey ?? <span className="text-muted-foreground">all</span>}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{fmtMoney(c.budget)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {Number(c.totalRecharged) > 0
                        ? <span className="font-semibold">{fmtMoney(c.totalRecharged)}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{fmtMoney(c.spend)}</td>
                    <td className="px-3 py-2 text-right text-xs">
                      {c.leadsCount} / {c.wonCount}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{roi}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => setEditing(c)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => remove(c.id, c.name)} className="p-1 text-muted-foreground hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <CampaignSheet
        open={creating || !!editing}
        onClose={() => { setCreating(false); setEditing(null) }}
        editing={editing}
        sources={sources}
        pipelines={pipelines}
        categories={categories}
        onSaved={() => { setCreating(false); setEditing(null); refresh() }}
      />
    </div>
  )
}

function VerdictBadge({ v }: { v: CrmCampaign['latestVerdict'] }) {
  if (!v) {
    return <span className="text-[10px] text-muted-foreground italic">—</span>
  }
  const map = {
    winning: { label: 'Win', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', Icon: TrendingUp },
    break_even: { label: 'Even', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/30', Icon: Scale },
    losing: { label: 'Lose', cls: 'bg-rose-500/10 text-rose-600 border-rose-500/30', Icon: TrendingDown },
    unclear: { label: '???', cls: 'bg-muted text-muted-foreground border-border', Icon: AlertTriangle },
  } as const
  const cfg = map[v.verdict]
  if (!cfg) return null
  const { Icon } = cfg
  return (
    <span
      title={`${v.headline}\nAnalyzed ${new Date(v.generatedAt).toLocaleString()}`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${cfg.cls}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

function CategoryChip({
  active, color, label, count, onClick,
}: { active: boolean; color?: string | null; label: string; count: number; onClick: () => void }) {
  const baseStyle = active
    ? 'border-primary bg-primary/10 text-primary'
    : 'border-border bg-card text-muted-foreground hover:bg-muted/60'
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${baseStyle}`}
      style={active && color ? { borderColor: color, color } : undefined}
    >
      {color ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /> : null}
      {label}
      <span className="text-[10px] opacity-70">{count}</span>
    </button>
  )
}

function CampaignSheet({
  open, onClose, editing, sources, pipelines, categories, onSaved,
}: {
  open: boolean
  onClose: () => void
  editing: CrmCampaign | null
  sources: CrmLeadSource[]
  pipelines: CrmPipeline[]
  categories: CrmCampaignCategory[]
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [categoryKey, setCategoryKey] = useState<string>('')
  const [sourceKey, setSourceKey] = useState<string>('')
  const [pipelineKey, setPipelineKey] = useState<string>('')
  const [budget, setBudget] = useState('')
  const [spend, setSpend] = useState('')
  const [startedAt, setStartedAt] = useState('')
  const [endedAt, setEndedAt] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (editing) {
      setName(editing.name)
      setCategoryKey(editing.categoryKey ?? '')
      setSourceKey(editing.sourceKey ?? '')
      setPipelineKey(editing.pipelineKey ?? '')
      setBudget(editing.budget ?? '')
      setSpend(editing.spend ?? '0')
      setStartedAt(editing.startedAt ? editing.startedAt.slice(0, 10) : '')
      setEndedAt(editing.endedAt ? editing.endedAt.slice(0, 10) : '')
      setNotes(editing.notes ?? '')
    } else {
      setName(''); setCategoryKey(''); setSourceKey(''); setPipelineKey(''); setBudget(''); setSpend(''); setStartedAt(''); setEndedAt(''); setNotes('')
    }
  }, [open, editing])

  const submit = async () => {
    if (!name.trim()) { setError('Name required'); return }
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        name: name.trim(),
        categoryKey: categoryKey || null,
        sourceKey: sourceKey || undefined,
        pipelineKey: pipelineKey || undefined,
        budget: budget || null,
        spend: spend || '0',
        startedAt: startedAt ? new Date(startedAt).toISOString() : null,
        endedAt: endedAt ? new Date(endedAt).toISOString() : null,
        notes: notes.trim() || null,
      }
      if (editing) {
        await crmUpdateCampaign(editing.id, payload as never)
        toast.success('Campaign updated')
      } else {
        await crmCreateCampaign(payload as never)
        toast.success('Campaign created')
      }
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SideSheet open={open} onClose={onClose} title={editing ? 'Edit campaign' : 'New campaign'}>
      <div className="space-y-3">
        <Field label="Name" required>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Diwali Promo 2026" autoFocus maxLength={200} className="w-full h-9 rounded-md border bg-background px-2 text-sm" />
        </Field>
        <Field label="Category" hint={categories.length === 0 ? 'No categories yet — manage in Sales → Settings → Categories' : undefined}>
          <select value={categoryKey} onChange={(e) => setCategoryKey(e.target.value)} className="w-full h-9 rounded-md border bg-background px-2 text-sm">
            <option value="">— Uncategorized —</option>
            {categories.filter((c) => c.active).map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Source">
            <select value={sourceKey} onChange={(e) => setSourceKey(e.target.value)} className="w-full h-9 rounded-md border bg-background px-2 text-sm">
              <option value="">—</option>
              {sources.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Pipeline">
            <select value={pipelineKey} onChange={(e) => setPipelineKey(e.target.value)} className="w-full h-9 rounded-md border bg-background px-2 text-sm">
              <option value="">All</option>
              {pipelines.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Budget">
            <MoneyInput amount={budget} currency="INR" onChange={(amt) => setBudget(amt)} />
          </Field>
          <Field label="Spend">
            <MoneyInput amount={spend} currency="INR" onChange={(amt) => setSpend(amt)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Start date">
            <input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} className="w-full h-9 rounded-md border bg-background px-2 text-sm" />
          </Field>
          <Field label="End date" error={endedAt && startedAt && new Date(endedAt) < new Date(startedAt) ? 'Must be after start' : null}>
            <input type="date" value={endedAt} min={startedAt || undefined} onChange={(e) => setEndedAt(e.target.value)} className="w-full h-9 rounded-md border bg-background px-2 text-sm" />
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-md border bg-background p-2 text-sm resize-y" />
        </Field>
        {error ? <div className="text-sm text-rose-600">{error}</div> : null}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting || !name.trim()}>
            {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            {submitting ? 'Saving…' : editing ? 'Save' : 'Create'}
          </Button>
        </div>
      </div>
    </SideSheet>
  )
}
