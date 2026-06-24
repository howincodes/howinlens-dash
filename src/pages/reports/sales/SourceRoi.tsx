import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { crmReportSourceRoi, crmListPipelines } from '@/lib/crm/client'
import { fmtMoney } from '@/lib/crm/format'
import type { CrmSourceRoiRow, CrmPipeline } from '@/lib/crm/types'

export default function SalesSourceRoi() {
  const [rows, setRows] = useState<CrmSourceRoiRow[]>([])
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([])
  const [pipelineKey, setPipelineKey] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    crmListPipelines().then((r) => setPipelines(r.pipelines)).catch(() => { /* */ })
  }, [])

  useEffect(() => {
    setLoading(true)
    crmReportSourceRoi({ pipeline: pipelineKey || undefined })
      .then((r) => setRows(r.rows.sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [pipelineKey])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Source ROI</h1>
          <p className="text-sm text-muted-foreground">Where leads come from + how each source converts to revenue.</p>
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
      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          No leads yet — once leads start flowing, ROI per source will show here.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium text-right">Leads</th>
                <th className="px-3 py-2 font-medium text-right">Won</th>
                <th className="px-3 py-2 font-medium text-right">Win %</th>
                <th className="px-3 py-2 font-medium text-right">Won value</th>
                <th className="px-3 py-2 font-medium text-right">Spend</th>
                <th className="px-3 py-2 font-medium text-right">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.sourceId} className="hover:bg-muted/40">
                  <td className="px-3 py-2 font-medium">{r.sourceLabel}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{r.leadsCount}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{r.wonCount}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {r.leadsCount > 0 ? `${((r.wonCount / r.leadsCount) * 100).toFixed(0)}%` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{fmtMoney(r.wonValue)}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{r.spend > 0 ? fmtMoney(r.spend) : '—'}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs font-bold">
                    {r.roi == null ? '—' : `${r.roi.toFixed(1)}×`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
