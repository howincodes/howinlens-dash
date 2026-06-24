import { useEffect, useRef, useState } from 'react'
import { Loader2, Upload, Trash2, FileSpreadsheet, AlertTriangle, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { confirm } from '@/components/ui/confirm-dialog'
import {
  crmListCampaignReportRows,
  crmListCampaignReportImports,
  crmUploadCampaignReport,
  crmDeleteCampaignReportImport,
} from '@/lib/crm/client'
import { fmtMoney, fmtDateShort } from '@/lib/crm/format'
import type { CrmCampaignReportImport, CrmCampaignReportRow, CrmCampaignReportDayAgg } from '@/lib/crm/types'

function humanSize(n: number | null): string {
  if (n == null) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function formatBadge(format: 'meta' | 'google' | 'unknown') {
  const colors: Record<string, string> = {
    meta: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
    google: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    unknown: 'bg-muted text-muted-foreground border-border',
  }
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase border ${colors[format]}`}>{format}</span>
}

export function CampaignReportsSection({
  campaignId,
  onRowCountChange,
}: {
  campaignId: number
  /** Lets the parent (CampaignDetail) know how many report rows exist, so it
   *  can warn that manual spend edits will get overwritten by next import. */
  onRowCountChange?: (n: number) => void
}) {
  const [imports, setImports] = useState<CrmCampaignReportImport[]>([])
  const [rows, setRows] = useState<CrmCampaignReportRow[]>([])
  const [byDay, setByDay] = useState<CrmCampaignReportDayAgg[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const refresh = () => {
    setLoading(true)
    Promise.all([crmListCampaignReportImports(campaignId), crmListCampaignReportRows(campaignId)])
      .then(([i, r]) => {
        setImports(i.imports)
        setRows(r.rows)
        setByDay(r.byDay)
        onRowCountChange?.(r.rows.length)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [campaignId])

  const onUpload = async (file: File) => {
    setUploading(true)
    try {
      const result = await crmUploadCampaignReport(campaignId, file)
      toast.success(
        `Imported ${result.upserted.inserted} new + ${result.upserted.replaced} replaced (${result.parsed.format})`,
      )
      if (result.parsed.warnings.length > 0) {
        toast.warning(result.parsed.warnings.join('; '))
      }
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) void onUpload(f)
    e.target.value = ''
  }

  const removeImport = async (imp: CrmCampaignReportImport) => {
    const ok = await confirm({
      title: `Delete import "${imp.filename}"?`,
      description: `${imp.rowCount} parsed rows from this batch will be removed. Other imports (and earlier overwrites) stay.`,
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await crmDeleteCampaignReportImport(campaignId, imp.id)
      toast.success('Import deleted')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  // Max for chart scaling
  const maxSpend = byDay.reduce((acc, d) => Math.max(acc, Number(d.spend)), 0)
  const maxResults = byDay.reduce((acc, d) => Math.max(acc, d.results), 0)

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reports</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {imports.length} import{imports.length !== 1 ? 's' : ''} · {rows.length} row{rows.length !== 1 ? 's' : ''}
            {byDay.length > 0 ? <span className="ml-2 text-xs">· {byDay.length} day{byDay.length !== 1 ? 's' : ''} of data</span> : null}
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.tsv"
            onChange={onFileChange}
            className="hidden"
          />
          <Button size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            {uploading
              ? <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Uploading…</>
              : <><Upload className="mr-1 h-3.5 w-3.5" /> Upload report</>}
          </Button>
        </div>
      </div>

      {error ? <div className="px-4 py-2 text-sm text-rose-600">{error}</div> : null}

      {loading ? (
        <div className="flex items-center justify-center h-24 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <>
          {/* Per-day chart */}
          {byDay.length > 0 ? (
            <div className="px-4 py-3 border-b">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Spend &amp; results per day</div>
              <div className="space-y-1">
                {byDay.slice(-30).map((d) => {
                  const spend = Number(d.spend)
                  const spendPct = maxSpend > 0 ? (spend / maxSpend) * 100 : 0
                  const resultsPct = maxResults > 0 ? (d.results / maxResults) * 100 : 0
                  return (
                    <div key={d.day} className="grid grid-cols-[90px_1fr_60px_60px] items-center gap-2 text-xs">
                      <span className="text-muted-foreground font-mono">{d.day}</span>
                      <div className="h-3 bg-muted/50 rounded relative overflow-hidden">
                        <div className="h-full bg-amber-500/60 absolute top-0 left-0" style={{ width: `${spendPct}%` }} />
                        <div className="h-full bg-emerald-500/60 absolute top-0 left-0" style={{ width: `${resultsPct}%`, marginTop: 0, height: '50%' }} />
                      </div>
                      <span className="font-mono text-right">{fmtMoney(d.spend)}</span>
                      <span className="font-mono text-right text-muted-foreground">{d.results} res</span>
                    </div>
                  )
                })}
              </div>
              <div className="text-[10px] text-muted-foreground mt-2 flex gap-3">
                <span><span className="inline-block w-2 h-2 bg-amber-500/60 mr-1" /> Spend</span>
                <span><span className="inline-block w-2 h-2 bg-emerald-500/60 mr-1" /> Results</span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground italic">
              No data yet. Upload a Meta Ads or Google Ads CSV/XLSX export to see daily spend &amp; results.
            </div>
          )}

          {/* Import history */}
          {imports.length > 0 ? (
            <div>
              <div className="px-4 py-2 border-b text-[11px] uppercase tracking-wide text-muted-foreground">Import history</div>
              <table className="w-full text-sm">
                <thead className="bg-muted/30 border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">When</th>
                    <th className="px-3 py-2 font-medium">Filename</th>
                    <th className="px-3 py-2 font-medium text-center">Format</th>
                    <th className="px-3 py-2 font-medium text-right">Rows</th>
                    <th className="px-3 py-2 font-medium text-right">Size</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">By</th>
                    <th className="px-3 py-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {imports.map((i) => (
                    <tr key={i.id} className="hover:bg-muted/40">
                      <td className="px-3 py-2 text-xs">{fmtDateShort(i.createdAt)}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <FileSpreadsheet className="h-3 w-3 text-muted-foreground" />
                          {i.filename}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">{formatBadge(i.format)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{i.rowCount}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{humanSize(i.sizeBytes)}</td>
                      <td className="px-3 py-2 text-xs">
                        {i.error ? (
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="h-3 w-3" /> {i.error.slice(0, 60)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <Check className="h-3 w-3" /> ok
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{i.byUserName || '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removeImport(i)} className="p-1 text-muted-foreground hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
