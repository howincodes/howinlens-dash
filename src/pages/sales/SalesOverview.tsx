import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle, Calendar, Sparkles, Trophy, XCircle, Flame,
} from 'lucide-react'
import { crmReportOverview, crmListPipelines } from '@/lib/crm/client'
import { fmtMoney } from '@/lib/crm/format'
import { Button } from '@/components/ui/button'
import { TileSkeleton } from '@/components/ui/skeleton'
import type { CrmOverviewKpis, CrmPipeline } from '@/lib/crm/types'
import { cn } from '@/lib/utils'

interface TileProps {
  label: string
  value: React.ReactNode
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  tone?: 'default' | 'amber' | 'green' | 'rose' | 'blue'
  href?: string
}

function Tile({ label, value, hint, icon: Icon, tone = 'default', href }: TileProps) {
  const inner = (
    <div className={cn(
      'rounded-lg border bg-card p-4 hover:shadow-md transition-all hover:border-primary/40',
      'flex flex-col gap-1',
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <Icon className={cn(
          'h-4 w-4',
          tone === 'amber' && 'text-amber-500',
          tone === 'green' && 'text-green-500',
          tone === 'rose' && 'text-rose-500',
          tone === 'blue' && 'text-blue-500',
          tone === 'default' && 'text-muted-foreground',
        )} />
      </div>
      <div className="text-2xl font-bold font-mono">{value}</div>
      {hint ? <div className="text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  )
  if (href) return <Link to={href}>{inner}</Link>
  return inner
}

export default function SalesOverview() {
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([])
  const [pipelineKey, setPipelineKey] = useState<string>('')
  const [data, setData] = useState<CrmOverviewKpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    crmListPipelines().then((r) => setPipelines(r.pipelines)).catch(() => { /* */ })
  }, [])

  useEffect(() => {
    setLoading(true)
    crmReportOverview({ pipeline: pipelineKey || undefined })
      .then((r) => setData(r))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [pipelineKey])

  const totalSourceCount = useMemo(() => {
    return data?.bySource.reduce((s, x) => s + x.count, 0) ?? 0
  }, [data])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Sales overview</h1>
          <p className="text-sm text-muted-foreground">Hot pulse on the pipeline.</p>
        </div>
        <select
          value={pipelineKey}
          onChange={(e) => setPipelineKey(e.target.value)}
          className="h-9 px-2 rounded-md border bg-background text-sm"
        >
          <option value="">All pipelines</option>
          {pipelines.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-600 flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={() => { setError(null); setLoading(true); crmReportOverview({ pipeline: pipelineKey || undefined }).then(setData).catch((err) => setError(err instanceof Error ? err.message : 'Failed')).finally(() => setLoading(false)) }}>Retry</Button>
        </div>
      ) : null}
      {loading || !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <TileSkeleton key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Tile
              label="Follow-ups due"
              value={data.dueToday}
              hint="open + overdue or due today"
              icon={AlertCircle}
              tone={data.dueToday > 0 ? 'amber' : 'default'}
              href="/sales/leads?due=today_or_overdue"
            />
            <Tile
              label="New this week"
              value={data.newThisWeek}
              icon={Sparkles}
              tone="blue"
              href="/sales/leads"
            />
            <Tile
              label="Hot leads"
              value={data.hotLeads}
              hint="🔥 open"
              icon={Flame}
              tone={data.hotLeads > 0 ? 'rose' : 'default'}
              href="/sales/leads?temperature=hot&status=new,contacted,qualified,negotiating"
            />
            <Tile
              label="Won this month"
              value={data.wonThisMonth.count}
              hint={fmtMoney(data.wonThisMonth.value)}
              icon={Trophy}
              tone="green"
              href="/sales/leads?status=won"
            />
            <Tile
              label="Lost this month"
              value={data.lostThisMonth}
              icon={XCircle}
              tone={data.lostThisMonth > 0 ? 'rose' : 'default'}
              href="/sales/leads?status=lost"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Leads by source (last 30 days)</h2>
              {data.bySource.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">No leads yet.</div>
              ) : (
                <ul className="space-y-2">
                  {data.bySource.map((s) => {
                    const pct = totalSourceCount > 0 ? (s.count / totalSourceCount) * 100 : 0
                    return (
                      <li key={s.key} className="grid grid-cols-[1fr_auto] gap-2 items-center text-sm">
                        <div className="min-w-0">
                          <div className="flex items-center justify-between">
                            <span>{s.label}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">{s.count} · {pct.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-lg border bg-card p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Open by owner</h2>
              {data.byOwner.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">No open leads.</div>
              ) : (
                <ul className="space-y-1.5">
                  {data.byOwner.map((o) => (
                    <li key={`${o.ownerUserId ?? 'unassigned'}`} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                      <span className={o.ownerUserId == null ? 'italic text-muted-foreground' : ''}>{o.ownerName}</span>
                      <span className="text-xs font-mono">{o.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Quick links
            </h2>
            <div className="flex flex-wrap gap-2">
              <Link to="/sales/leads" className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-muted">Lead board</Link>
              <Link to="/sales/contacts" className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-muted">Contacts</Link>
              <Link to="/sales/campaigns" className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-muted">Campaigns</Link>
              <Link to="/sales/referrers" className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-muted">Referrers</Link>
              <Link to="/reports/sales/funnel" className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-muted">Funnel report</Link>
              <Link to="/reports/sales/source-roi" className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-muted">Source ROI</Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
