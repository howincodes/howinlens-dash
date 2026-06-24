import { useEffect, useState } from 'react'
import { Loader2, Play, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { crmListPipelines, crmUpdatePipeline, crmRunAutoCool } from '@/lib/crm/client'
import type { CrmPipeline } from '@/lib/crm/types'

interface CoolResult {
  pipelinesProcessed: number
  leadsCooled: number
  leadsKilled: number
  errors: number
}

export default function CrmAutoCool() {
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [lastResult, setLastResult] = useState<CoolResult | null>(null)

  const refresh = () => {
    setLoading(true)
    crmListPipelines()
      .then((r) => setPipelines(r.pipelines))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const update = (id: number, days: number) => {
    setPipelines((cur) => cur.map((p) => p.id === id ? { ...p, autoCoolDays: days } : p))
  }

  const save = async (p: CrmPipeline) => {
    setSavingId(p.id)
    try {
      await crmUpdatePipeline(p.id, { autoCoolDays: p.autoCoolDays })
      toast.success(`${p.label}: auto-cool ${p.autoCoolDays === 0 ? 'disabled' : `set to ${p.autoCoolDays}d`}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setSavingId(null)
    }
  }

  const runNow = async () => {
    setRunning(true)
    setError(null)
    try {
      const r = await crmRunAutoCool() as CoolResult
      setLastResult(r)
      toast.success(`Auto-cool ran — ${r.leadsCooled} cooled, ${r.leadsKilled} dead`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <p className="font-medium mb-1">How auto-cool works</p>
        <p className="text-muted-foreground">
          Every hour we check open leads in each pipeline. If a lead has gone N days without an outreach event,
          its temperature drops one level (🔥 → 🌤 → ❄ → 💀). Logging any outreach immediately resets it to 🔥.
          Set <code className="bg-muted px-1 rounded font-mono">N = 0</code> to disable auto-cool for that pipeline.
        </p>
      </div>

      {error ? <div className="text-sm text-rose-600">{error}</div> : null}

      <div className="space-y-2">
        {pipelines.map((p) => (
          <div key={p.id} className="rounded-md border bg-card p-3 flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="font-medium text-sm">{p.label}</div>
              <div className="text-xs text-muted-foreground">{p.key}</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={p.autoCoolDays}
                onChange={(e) => update(p.id, Math.max(0, Number(e.target.value)))}
                className="w-20 h-9 rounded-md border bg-background px-2 text-sm text-right"
              />
              <span className="text-xs text-muted-foreground">days</span>
              <Button size="sm" onClick={() => save(p)} disabled={savingId === p.id}>
                {savingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-medium mb-2">Manual trigger</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Force-run the auto-cool sweep across every active pipeline (useful for testing).
        </p>
        <Button onClick={runNow} disabled={running} variant="outline">
          {running ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
          Run now
        </Button>
        {lastResult ? (
          <div className="mt-3 text-xs space-y-0.5 font-mono bg-muted/50 rounded p-2">
            <div>pipelines: {lastResult.pipelinesProcessed}</div>
            <div>leads cooled: {lastResult.leadsCooled}</div>
            <div>leads killed (→ dead): {lastResult.leadsKilled}</div>
            <div className={lastResult.errors > 0 ? 'text-rose-600' : ''}>errors: {lastResult.errors}</div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
