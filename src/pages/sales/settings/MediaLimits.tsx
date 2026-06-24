import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { crmGetMediaLimits, crmSaveMediaLimits } from '@/lib/crm/client'
import type { CrmMediaLimits } from '@/lib/crm/types'

export default function MediaLimitsPage() {
  const [data, setData] = useState<CrmMediaLimits | null>(null)
  const [maxMb, setMaxMb] = useState<number>(20)
  const [allowed, setAllowed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = () => {
    setLoading(true)
    crmGetMediaLimits()
      .then((l) => {
        setData(l)
        setMaxMb(l.maxMb)
        setAllowed(new Set(l.allowedMime))
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const save = async () => {
    if (!Number.isFinite(maxMb) || maxMb < 1 || maxMb > 500) {
      toast.error('Max MB must be between 1 and 500')
      return
    }
    if (allowed.size === 0) {
      toast.error('Allow at least one MIME type')
      return
    }
    setSaving(true)
    try {
      const updated = await crmSaveMediaLimits({
        maxMb,
        allowedMime: Array.from(allowed),
      })
      setData(updated)
      toast.success('Limits saved — applies to next upload')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const dirty = data
    ? data.maxMb !== maxMb
      || data.allowedMime.length !== allowed.size
      || data.allowedMime.some((m) => !allowed.has(m))
    : false

  return (
    <div className="space-y-4 max-w-3xl">
      <Link to="/sales/campaigns" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ChevronLeft className="h-4 w-4" /> Back to campaigns
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Media Upload Limits</h1>
        <p className="text-sm text-muted-foreground">
          Controls every campaign media upload across the CRM. Changes take effect on the next upload — no restart needed.
        </p>
      </div>

      {error ? <div className="text-sm text-rose-600">{error}</div> : null}

      {loading || !data ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <Field label="Max file size (MB)" hint="Anything bigger is rejected at the upload endpoint. Recommended: 20 for mixed images+video, 100 if you upload raw video.">
              <input
                type="number"
                min={1}
                max={500}
                value={maxMb}
                onChange={(e) => setMaxMb(Number(e.target.value) || 0)}
                className="w-32 h-9 rounded-md border bg-background px-2 text-sm font-mono"
              />
              <span className="text-xs text-muted-foreground ml-2">MB</span>
            </Field>
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-3">
            <Field label="Allowed MIME types" hint="Files outside this list are rejected. Linked external URLs are not affected by this list.">
              <div className="grid grid-cols-2 gap-2">
                {data.knownMime.map((mime) => {
                  const checked = allowed.has(mime)
                  return (
                    <label key={mime} className="inline-flex items-center gap-2 px-2 py-1.5 border rounded-md cursor-pointer hover:bg-muted/40 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = new Set(allowed)
                          if (checked) next.delete(mime); else next.add(mime)
                          setAllowed(next)
                        }}
                      />
                      <span className="font-mono text-xs">{mime}</span>
                    </label>
                  )
                })}
              </div>
            </Field>

            {allowed.size === 0 ? (
              <p className="text-xs text-rose-600">No MIME types selected — uploads will be impossible until you allow at least one.</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 sticky bottom-2 bg-card/95 backdrop-blur border rounded-lg p-2">
            <Button variant="outline" onClick={refresh} disabled={saving || !dirty}>Reset</Button>
            <Button onClick={save} disabled={saving || !dirty}>
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              {saving ? 'Saving…' : dirty ? 'Save changes' : 'No changes'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
