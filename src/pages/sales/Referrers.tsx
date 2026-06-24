import { useEffect, useState } from 'react'
import { Loader2, Users, UserCircle } from 'lucide-react'
import { crmReportReferrerLeaderboard } from '@/lib/crm/client'
import { fmtMoney } from '@/lib/crm/format'
import type { CrmReferrerLeaderboard } from '@/lib/crm/types'
import { cn } from '@/lib/utils'

export default function Referrers() {
  const [data, setData] = useState<CrmReferrerLeaderboard | null>(null)
  const [tab, setTab] = useState<'internal' | 'external'>('internal')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    crmReportReferrerLeaderboard()
      .then((r) => setData(r))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false))
  }, [])

  const rows = tab === 'internal' ? data?.internal ?? [] : data?.external ?? []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Referrers</h1>
        <p className="text-sm text-muted-foreground">Who's bringing leads in.</p>
      </div>

      <div className="inline-flex rounded-md border bg-background overflow-hidden">
        <button
          onClick={() => setTab('internal')}
          className={cn('px-3 h-9 text-sm inline-flex items-center gap-2', tab === 'internal' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}
        >
          <Users className="h-3.5 w-3.5" /> Internal team
        </button>
        <button
          onClick={() => setTab('external')}
          className={cn('px-3 h-9 text-sm inline-flex items-center gap-2 border-l', tab === 'external' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}
        >
          <UserCircle className="h-3.5 w-3.5" /> External (past students etc.)
        </button>
      </div>

      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border bg-muted/30 p-12 text-center text-sm text-muted-foreground">
          No {tab} referrers yet.
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium text-right">Leads referred</th>
                <th className="px-3 py-2 font-medium text-right">Won</th>
                <th className="px-3 py-2 font-medium text-right">Win rate</th>
                <th className="px-3 py-2 font-medium text-right">Won value</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-muted/40">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{r.leadsCount}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{r.wonCount}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{(r.winRate * 100).toFixed(0)}%</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{fmtMoney(r.wonValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
