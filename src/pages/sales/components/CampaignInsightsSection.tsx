import { useEffect, useState } from 'react'
import { Sparkles, Loader2, AlertTriangle, ArrowUp, ArrowRight, ArrowDown, Minus, TrendingUp, TrendingDown, Scale, History } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { crmListCampaignInsights, crmAnalyzeCampaign } from '@/lib/crm/client'
import type { CrmCampaignInsight } from '@/lib/crm/types'

function verdictBadge(v: CrmCampaignInsight['verdict']) {
  const map: Record<CrmCampaignInsight['verdict'], { label: string; classes: string; icon: React.ReactNode }> = {
    winning: { label: 'Winning', classes: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: <TrendingUp className="h-3.5 w-3.5" /> },
    break_even: { label: 'Break even', classes: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: <Scale className="h-3.5 w-3.5" /> },
    losing: { label: 'Losing', classes: 'bg-rose-500/10 text-rose-600 border-rose-500/30', icon: <TrendingDown className="h-3.5 w-3.5" /> },
    unclear: { label: 'Unclear', classes: 'bg-muted text-muted-foreground border-border', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  }
  const m = map[v]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold ${m.classes}`}>
      {m.icon}
      {m.label}
    </span>
  )
}

function trendIcon(t: 'up' | 'flat' | 'down' | 'unknown') {
  switch (t) {
    case 'up': return <ArrowUp className="h-3.5 w-3.5 text-emerald-500" />
    case 'flat': return <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
    case 'down': return <ArrowDown className="h-3.5 w-3.5 text-rose-500" />
    default: return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
  }
}

function priorityBadge(p: 'high' | 'medium' | 'low') {
  const map = {
    high: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
    medium: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    low: 'bg-muted text-muted-foreground border-border',
  }
  return <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${map[p]}`}>{p}</span>
}

export function CampaignInsightsSection({ campaignId }: { campaignId: number }) {
  const [insights, setInsights] = useState<CrmCampaignInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [pickedId, setPickedId] = useState<number | null>(null)

  const refresh = () => {
    setLoading(true)
    crmListCampaignInsights(campaignId)
      .then((r) => {
        setInsights(r.insights)
        setPickedId(r.insights[0]?.id ?? null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [campaignId])

  const analyze = async () => {
    setAnalyzing(true)
    try {
      await crmAnalyzeCampaign(campaignId)
      toast.success('Analyzed — verdict updated')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const current = insights.find((i) => i.id === pickedId) ?? insights[0] ?? null

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gradient-to-r from-violet-500/5 via-fuchsia-500/5 to-amber-500/5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Insights</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {current
                ? <>Last analyzed {new Date(current.generatedAt).toLocaleString()}{current.generatedByName ? ` by ${current.generatedByName}` : ''}</>
                : 'Click Analyze to get a verdict + recommendations.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {insights.length > 1 ? (
            <Button size="sm" variant="ghost" onClick={() => setShowHistory((s) => !s)}>
              <History className="mr-1 h-3.5 w-3.5" /> {insights.length} runs
            </Button>
          ) : null}
          <Button size="sm" onClick={analyze} disabled={analyzing}>
            {analyzing
              ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Analyzing…</>
              : <><Sparkles className="mr-1.5 h-3.5 w-3.5" /> {current ? 'Re-analyze' : 'Analyze'}</>}
          </Button>
        </div>
      </div>

      {error ? <div className="px-4 py-2 text-sm text-rose-600">{error}</div> : null}
      {loading ? (
        <div className="flex items-center justify-center h-24 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
        </div>
      ) : !current ? (
        <div className="p-8 text-center text-sm text-muted-foreground italic">
          No insights yet. Make sure you've added at least some recharges, leads, or report rows, then click Analyze.
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* History switcher */}
          {showHistory ? (
            <div className="rounded-md border bg-muted/30 p-2 max-h-40 overflow-y-auto space-y-1">
              {insights.map((i) => (
                <button
                  key={i.id}
                  onClick={() => { setPickedId(i.id); setShowHistory(false) }}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between gap-2 ${i.id === current.id ? 'bg-primary/10' : 'hover:bg-background'}`}
                >
                  <div className="flex items-center gap-2">
                    {verdictBadge(i.verdict)}
                    <span className="truncate">{i.headline}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{new Date(i.generatedAt).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
          ) : null}

          {/* Verdict + headline */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {verdictBadge(current.verdict)}
              {current.provider ? <span className="text-[10px] font-mono text-muted-foreground">{current.model}</span> : null}
              {current.fallbackHops != null && current.fallbackHops > 0
                ? <span className="text-[10px] text-amber-500">{current.fallbackHops} fallback{current.fallbackHops > 1 ? 's' : ''}</span>
                : null}
              {current.durationMs ? <span className="text-[10px] text-muted-foreground">{(current.durationMs / 1000).toFixed(1)}s</span> : null}
            </div>
            <p className="text-lg font-semibold leading-snug">{current.headline}</p>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{current.reasoning}</p>
          </div>

          {/* Lead quality */}
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              {trendIcon(current.leadQuality.trend)}
              <span className="font-semibold">Lead quality — {current.leadQuality.trend}</span>
            </div>
            {current.leadQuality.note ? (
              <p className="text-sm mt-1.5">{current.leadQuality.note}</p>
            ) : null}
          </div>

          {/* Spend vs results */}
          <div className="rounded-md border bg-background p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5 font-semibold">Spend vs results</div>
            <p className="text-sm">{current.spendVsResults.summary}</p>
            {current.spendVsResults.spikes.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {current.spendVsResults.spikes.map((s, i) => (
                  <li key={i} className="text-xs flex items-start gap-2">
                    <span className="font-mono text-amber-600 flex-shrink-0">{s.date}</span>
                    <span className="text-muted-foreground">{s.note}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* Actions */}
          {current.actions.length > 0 ? (
            <div className="rounded-md border bg-background p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 font-semibold">Recommended actions</div>
              <ol className="space-y-2">
                {current.actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {priorityBadge(a.priority)}
                    <span>{a.action}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
