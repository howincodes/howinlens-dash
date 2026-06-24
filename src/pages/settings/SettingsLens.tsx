import { useEffect, useState } from 'react'
import { Loader2, Save, MonitorSmartphoneIcon, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getSystemSettings, updateSystemSetting } from '@/lib/api'

interface SettingRow { key: string; value: unknown }

export default function SettingsLens() {
  const [retention, setRetention] = useState('')
  const [maxChars, setMaxChars] = useState('')
  const [clientVersion, setClientVersion] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getSystemSettings('lens')
      .then((rows: SettingRow[]) => {
        if (cancelled) return
        const map = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value]))
        setRetention(String(map['lens.prompt_retention_days'] ?? 90))
        setMaxChars(String(map['lens.prompt_max_chars'] ?? 8000))
        setClientVersion(String(map['lens.client_version'] ?? '1.0.0'))
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const days = Math.max(0, Math.floor(Number(retention) || 0))
      const chars = Math.max(500, Math.floor(Number(maxChars) || 8000))
      await Promise.all([
        updateSystemSetting('lens.prompt_retention_days', days),
        updateSystemSetting('lens.prompt_max_chars', chars),
        updateSystemSetting('lens.client_version', clientVersion.trim() || '1.0.0'),
      ])
      setRetention(String(days))
      setMaxChars(String(chars))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <MonitorSmartphoneIcon className="w-5 h-5 text-primary" />
          Lens client
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure Claude Code prompt tracking. Devs install the client from their own profile and see their own prompts.
        </p>
      </div>

      {error && <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-2.5 text-sm text-rose-600">{error}</div>}

      <div className="space-y-4">
        <Field
          label="Prompt retention (days)"
          hint="Auto-purge prompts older than this. Set 0 to keep forever."
        >
          <Input type="number" min={0} value={retention} onChange={(e) => setRetention(e.target.value)} className="w-32" />
        </Field>

        <Field
          label="Max prompt characters"
          hint="Prompt text longer than this is truncated on the server (the true length is still recorded)."
        >
          <Input type="number" min={500} value={maxChars} onChange={(e) => setMaxChars(e.target.value)} className="w-32" />
        </Field>

        <Field
          label="Published client version"
          hint="Clients compare against this on heartbeat to notice updates."
        >
          <Input value={clientVersion} onChange={(e) => setClientVersion(e.target.value)} className="w-32" />
        </Field>
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        <span className="ml-1.5">{saved ? 'Saved' : 'Save'}</span>
      </Button>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5 max-w-xs">{hint}</div>
      </div>
      {children}
    </div>
  )
}
