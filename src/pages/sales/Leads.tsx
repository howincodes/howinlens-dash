import { useEffect, useMemo, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Kanban, List as ListIcon, Flame, Skull, Calendar, Trophy, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CardSkeleton, TableRowSkeleton } from '@/components/ui/skeleton'
import { useHasPermission } from '@/store/authStore'
import { LeadKanban } from './LeadKanban'
import { LeadList } from './LeadList'
import { LeadFilters } from './components/LeadFilters'
import { CreateLeadSheet } from './components/CreateLeadSheet'
import { crmListLeads, crmListPipelines, crmListSources, type CrmLeadFilters } from '@/lib/crm/client'
import { CRM_LEAD_STATUSES, type CrmLeadListItem, type CrmPipeline, type CrmLeadSource, type CrmLeadStatus, type CrmLeadTemperature } from '@/lib/crm/types'
import { statusLabel } from '@/lib/crm/format'
import { cn } from '@/lib/utils'

interface Lens {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  apply: (current: CrmLeadFilters) => CrmLeadFilters
  isActive: (f: CrmLeadFilters) => boolean
}

const LENSES: Lens[] = [
  {
    key: 'follow_today',
    label: 'Follow up today',
    icon: Calendar,
    apply: (c) => ({ pipeline: c.pipeline, due: 'today_or_overdue' }),
    isActive: (f) => f.due === 'today_or_overdue',
  },
  {
    key: 'hot',
    label: 'Hot leads',
    icon: Flame,
    apply: (c) => ({
      pipeline: c.pipeline,
      temperature: ['hot'],
      status: ['new', 'contacted', 'qualified', 'negotiating', 'on_followup'],
    }),
    isActive: (f) => Array.isArray(f.temperature) && (f.temperature as string[]).length === 1 && (f.temperature as string[])[0] === 'hot',
  },
  {
    key: 'reactivate',
    label: 'Reactivate',
    icon: Skull,
    apply: (c) => ({
      pipeline: c.pipeline,
      temperature: ['cold', 'dead'],
      status: ['qualified', 'negotiating', 'on_followup'],
    }),
    isActive: (f) =>
      Array.isArray(f.temperature) && (f.temperature as string[]).includes('cold') && (f.temperature as string[]).includes('dead'),
  },
  {
    key: 'won',
    label: 'Won this month',
    icon: Trophy,
    apply: (c) => ({ pipeline: c.pipeline, status: ['won'] }),
    isActive: (f) =>
      Array.isArray(f.status) && (f.status as string[]).length === 1 && (f.status as string[])[0] === 'won',
  },
]

export default function Leads() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo<CrmLeadFilters>(() => {
    const f: CrmLeadFilters = {}
    const pipeline = searchParams.get('pipeline')
    const status = searchParams.get('status')
    const temperature = searchParams.get('temperature')
    const source = searchParams.get('source')
    const owner = searchParams.get('owner')
    const due = searchParams.get('due') as CrmLeadFilters['due']
    const q = searchParams.get('q')
    if (pipeline) f.pipeline = pipeline
    if (status) f.status = status.split(',') as CrmLeadStatus[]
    if (temperature) f.temperature = temperature.split(',') as CrmLeadTemperature[]
    if (source) f.source = source.split(',')
    if (owner) f.owner = owner
    if (due) f.due = due
    if (q) f.q = q
    f.limit = 200
    return f
  }, [searchParams])

  const setFilters = useCallback((next: CrmLeadFilters) => {
    const params = new URLSearchParams()
    if (next.pipeline) params.set('pipeline', next.pipeline)
    if (next.status) params.set('status', Array.isArray(next.status) ? next.status.join(',') : next.status)
    if (next.temperature) params.set('temperature', Array.isArray(next.temperature) ? next.temperature.join(',') : next.temperature)
    if (next.source) params.set('source', Array.isArray(next.source) ? next.source.join(',') : next.source)
    if (next.owner) params.set('owner', next.owner)
    if (next.due) params.set('due', next.due)
    if (next.q) params.set('q', next.q)
    const view = searchParams.get('view')
    if (view) params.set('view', view)
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams])

  const view = (searchParams.get('view') as 'kanban' | 'list') ?? 'kanban'
  const setView = (v: 'kanban' | 'list') => {
    const params = new URLSearchParams(searchParams)
    params.set('view', v)
    setSearchParams(params, { replace: true })
  }

  const canWrite = useHasPermission('crm.leads.write')

  const [pipelines, setPipelines] = useState<CrmPipeline[]>([])
  const [sources, setSources] = useState<CrmLeadSource[]>([])
  const [leads, setLeads] = useState<CrmLeadListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  // Bootstrap pipelines/sources. Default = all pipelines (no filter applied).
  useEffect(() => {
    Promise.all([crmListPipelines(), crmListSources()])
      .then(([p, s]) => {
        setPipelines(p.pipelines)
        setSources(s.sources)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load CRM config'))
  }, [])

  // Fetch leads when filters change
  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await crmListLeads(filters)
      setLeads(r.leads)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">
            {pipelines.find((p) => p.key === filters.pipeline)?.label ?? 'All pipelines'} · {leads.length} matching
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border bg-background overflow-hidden">
            <button
              type="button"
              onClick={() => setView('kanban')}
              className={cn('px-3 h-8 text-xs inline-flex items-center gap-1.5', view === 'kanban' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}
            >
              <Kanban className="h-3.5 w-3.5" /> Kanban
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn('px-3 h-8 text-xs inline-flex items-center gap-1.5 border-l', view === 'list' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}
            >
              <ListIcon className="h-3.5 w-3.5" /> List
            </button>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchLeads} disabled={loading} title="Refresh">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
          {canWrite ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New lead
            </Button>
          ) : null}
        </div>
      </div>

      {/* Lenses */}
      <div className="flex flex-wrap gap-1.5">
        {LENSES.map((lens) => {
          const Icon = lens.icon
          const active = lens.isActive(filters)
          return (
            <button
              key={lens.key}
              type="button"
              onClick={() => setFilters(lens.apply(filters))}
              className={cn(
                'h-8 px-3 rounded-full text-xs border inline-flex items-center gap-1.5 transition-colors',
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-muted',
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {lens.label}
            </button>
          )
        })}
      </div>

      <LeadFilters
        pipelines={pipelines}
        sources={sources}
        filters={filters}
        onChange={setFilters}
      />

      {error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-600 flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchLeads}>Retry</Button>
        </div>
      ) : null}

      {loading ? (
        view === 'kanban' ? (
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
            {CRM_LEAD_STATUSES.map((s) => (
              <div key={s} className="flex-1 min-w-[260px] rounded-lg border bg-muted/30 flex flex-col">
                <div className="px-3 py-2 border-b">
                  <span className="text-xs font-semibold uppercase tracking-wide">{statusLabel(s)}</span>
                </div>
                <div className="flex-1 p-2 space-y-2">
                  <CardSkeleton /><CardSkeleton /><CardSkeleton />
                </div>
              </div>
            ))}
          </div>
        ) : (
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
                {Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={8} />)}
              </tbody>
            </table>
          </div>
        )
      ) : leads.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-12 text-center space-y-3">
          {Object.keys(filters).filter((k) => k !== 'pipeline' && k !== 'limit').length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">No leads match these filters.</p>
              <Button size="sm" variant="outline" onClick={() => setFilters({ pipeline: filters.pipeline })}>
                Clear filters
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">No leads yet.</p>
              <p className="text-xs text-muted-foreground">
                {canWrite ? 'Capture your first lead — it takes 30 seconds.' : 'Ask an admin to create the first lead.'}
              </p>
              {canWrite ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Create your first lead
                </Button>
              ) : null}
            </>
          )}
        </div>
      ) : view === 'kanban' ? (
        <LeadKanban leads={leads} onChanged={fetchLeads} />
      ) : (
        <LeadList leads={leads} />
      )}

      <CreateLeadSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultPipelineKey={filters.pipeline}
        onCreated={() => fetchLeads()}
      />
    </div>
  )
}
