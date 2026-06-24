import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SideSheet } from './SideSheet'
import { crmLogOutreach } from '@/lib/crm/client'
import type { CrmOutreachKind } from '@/lib/crm/types'

interface Props {
  open: boolean
  onClose: () => void
  leadId: number
  defaultKind?: CrmOutreachKind
  defaultFollowupDays?: number
  onLogged?: () => void
}

const KIND_OPTIONS: Array<{ key: CrmOutreachKind; label: string }> = [
  { key: 'note', label: 'Note' },
  { key: 'call', label: 'Call' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'Email' },
  { key: 'meeting', label: 'Meeting' },
  { key: 'sms', label: 'SMS' },
]

const FOLLOWUP_PRESETS = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 2 days', days: 2 },
  { label: 'In 3 days', days: 3 },
  { label: 'Next week', days: 7 },
  { label: 'In 2 weeks', days: 14 },
  { label: 'No follow-up', days: -1 },
] as const

function plusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(10, 0, 0, 0) // default 10am follow-up time
  return d.toISOString()
}

function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function LogOutreachSheet({
  open, onClose, leadId, defaultKind = 'note', defaultFollowupDays = 2, onLogged,
}: Props) {
  const [kind, setKind] = useState<CrmOutreachKind>(defaultKind)
  const [body, setBody] = useState('')
  const [outcome, setOutcome] = useState('')
  const [duration, setDuration] = useState<string>('')
  const [followup, setFollowup] = useState<string | null>(plusDays(defaultFollowupDays))
  const [presetIdx, setPresetIdx] = useState<number>(
    FOLLOWUP_PRESETS.findIndex((p) => p.days === defaultFollowupDays),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setKind(defaultKind)
      setBody('')
      setOutcome('')
      setDuration('')
      setFollowup(plusDays(defaultFollowupDays))
      setPresetIdx(FOLLOWUP_PRESETS.findIndex((p) => p.days === defaultFollowupDays))
      setError(null)
    }
  }, [open, defaultKind, defaultFollowupDays])

  const submit = async () => {
    setError(null)
    setSubmitting(true)
    try {
      await crmLogOutreach(leadId, {
        kind,
        body: body.trim() || null,
        outcome: outcome.trim() || null,
        durationSeconds: duration ? Math.round(Number(duration) * 60) : null,
        nextFollowupAt: followup,
      })
      toast.success(`Logged ${kind}`)
      onLogged?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SideSheet open={open} onClose={onClose} title="Log outreach" description="What happened? Set the next follow-up so this lead doesn't go silent.">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium block mb-1.5">Kind</label>
          <div className="flex flex-wrap gap-1.5">
            {KIND_OPTIONS.map((k) => (
              <button
                key={k.key}
                type="button"
                onClick={() => setKind(k.key)}
                className={`h-8 px-3 rounded-full text-xs border transition-colors ${
                  kind === k.key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border hover:bg-muted'
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="outreach-body" className="text-xs font-medium block mb-1.5">
            What happened?
          </label>
          <textarea
            id="outreach-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder={
              kind === 'call' ? 'Talked about fees, asked for weekend batch'
                : kind === 'whatsapp' ? 'Sent course brochure with fee structure'
                : 'Brief note…'
            }
            className="w-full rounded-md border bg-background p-2 text-sm resize-y"
          />
        </div>

        {(kind === 'call' || kind === 'meeting') ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium block mb-1.5">Duration (min)</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full h-9 rounded-md border bg-background px-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Outcome</label>
              <input
                type="text"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="interested / no_pickup / …"
                className="w-full h-9 rounded-md border bg-background px-2 text-sm"
              />
            </div>
          </div>
        ) : null}

        <div className="rounded-md border-2 border-amber-500/30 bg-amber-500/5 p-3">
          <label className="text-xs font-semibold block mb-1.5">
            Next follow-up <span className="text-amber-600">(required)</span>
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {FOLLOWUP_PRESETS.map((p, i) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setPresetIdx(i)
                  setFollowup(p.days < 0 ? null : plusDays(p.days))
                }}
                className={`h-7 px-2.5 rounded-full text-xs border transition-colors ${
                  presetIdx === i
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background border-border hover:bg-muted'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            type="datetime-local"
            value={followup ? isoToLocalInput(followup) : ''}
            disabled={followup === null}
            onChange={(e) => {
              setPresetIdx(-1)
              const v = e.target.value
              if (!v) {
                setFollowup(null)
                return
              }
              setFollowup(new Date(v).toISOString())
            }}
            className="w-full h-9 rounded-md border bg-background px-2 text-sm disabled:opacity-50"
          />
        </div>

        {error ? (
          <div className="text-sm text-rose-600 bg-rose-500/10 border border-rose-500/30 rounded-md p-2">
            {error}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Log
          </Button>
        </div>
      </div>
    </SideSheet>
  )
}
