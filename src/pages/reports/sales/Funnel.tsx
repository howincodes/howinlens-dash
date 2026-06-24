import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { crmReportFunnel, crmListPipelines } from '@/lib/crm/client'
import { CRM_LEAD_STATUSES, type CrmFunnelReport, type CrmPipeline } from '@/lib/crm/types'
import { statusLabel } from '@/lib/crm/format'

export default function SalesFunnel() {
  const [data, setData] = useState<CrmFunnelReport | null>(null)
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([])
  const [pipelineKey, setPipelineKey] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    crmListPipelines().then((r) => setPipelines(r.pipelines)).catch(() => { /* */ })
  }, [])

  useEffect(() => {
    setLoading(true)
    crmReportFunnel({ pipeline: pipelineKey || undefined })
      .then((r) => setData(r))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [pipelineKey])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Sales funnel</h1>
          <p className="text-sm text-muted-foreground">Lead counts per stage and stage-to-stage conversion.</p>
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

      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
      {loading || !data ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6">
          <div className="text-sm text-muted-foreground mb-4">Total leads: <span className="font-mono font-bold text-foreground">{data.total}</span></div>
          <ul className="space-y-2">
            {CRM_LEAD_STATUSES.map((status, i) => {
              const count = data.counts[status] ?? 0
              const pct = data.total > 0 ? (count / data.total) * 100 : 0
              const prevCount = i > 0 ? (data.counts[CRM_LEAD_STATUSES[i - 1]] ?? 0) : count
              const conv = i > 0 && prevCount > 0 ? `${((count / prevCount) * 100).toFixed(0)}%` : null
              return (
                <li key={status} className="grid grid-cols-[140px_1fr_60px] gap-3 items-center text-sm">
                  <span className="font-medium">{statusLabel(status)}</span>
                  <div className="h-7 bg-muted rounded overflow-hidden relative">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-2 text-xs font-mono text-foreground">
                      {count}
                      {conv ? <span className="ml-2 text-muted-foreground">↘ {conv}</span> : null}
                    </div>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground text-right">{pct.toFixed(0)}%</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
