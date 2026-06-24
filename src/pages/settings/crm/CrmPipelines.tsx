import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { crmListPipelines, crmUpdatePipeline } from '@/lib/crm/client'
import type { CrmPipeline } from '@/lib/crm/types'

export default function CrmPipelines() {
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = () => {
    setLoading(true)
    crmListPipelines()
      .then((r) => setPipelines(r.pipelines))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const update = (id: number, patch: Partial<CrmPipeline>) => {
    setPipelines((cur) => cur.map((p) => p.id === id ? { ...p, ...patch } : p))
  }

  const save = async (p: CrmPipeline) => {
    setSavingId(p.id)
    setError(null)
    try {
      await crmUpdatePipeline(p.id, {
        label: p.label,
        defaultCurrency: p.defaultCurrency,
        autoCoolDays: p.autoCoolDays,
        active: p.active,
      })
      toast.success(`Pipeline "${p.label}" saved`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setSavingId(null)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
  }

  return (
    <div className="space-y-3">
      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
      {pipelines.map((p) => (
        <div key={p.id} className="rounded-lg border bg-card p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-mono text-xs text-muted-foreground">{p.key}</div>
              <input
                value={p.label}
                onChange={(e) => update(p.id, { label: e.target.value })}
                className="text-lg font-semibold bg-transparent focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 -ml-1"
              />
            </div>
            <Button size="sm" onClick={() => save(p)} disabled={savingId === p.id}>
              {savingId === p.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              Save
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1.5">Default currency</label>
              <input
                value={p.defaultCurrency}
                onChange={(e) => update(p.id, { defaultCurrency: e.target.value.toUpperCase() })}
                maxLength={3}
                className="w-full h-9 rounded-md border bg-background px-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Auto-cool days (0 disables)</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={p.autoCoolDays}
                onChange={(e) => update(p.id, { autoCoolDays: Math.max(0, Number(e.target.value)) })}
                className="w-full h-9 rounded-md border bg-background px-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm h-9">
                <input
                  type="checkbox"
                  checked={p.active}
                  onChange={(e) => update(p.id, { active: e.target.checked })}
                />
                Active
              </label>
            </div>
          </div>

          <div className="mt-3">
            <h3 className="text-xs font-medium mb-1.5">Stages</h3>
            <div className="flex flex-wrap gap-1.5">
              {p.stages.map((s) => (
                <span
                  key={s.key}
                  className="text-xs px-2 py-1 rounded-full border"
                  style={{ borderColor: s.color, color: s.color }}
                >
                  {s.label}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Stage editing UI is read-only in v1. Stage keys are fixed; rename labels via direct DB update if needed.
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
