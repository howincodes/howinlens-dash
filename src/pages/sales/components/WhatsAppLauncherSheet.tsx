import { useEffect, useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SideSheet } from './SideSheet'
import {
  crmGetWhatsAppUrl, crmListTemplates, crmLogOutreach,
} from '@/lib/crm/client'
import type { CrmOutreachTemplate } from '@/lib/crm/types'

interface Props {
  open: boolean
  onClose: () => void
  leadId: number
  contactPhone: string | null
  pipelineKey?: string | null
  onLogged?: () => void
}

const FOLLOWUP_PRESETS = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 2 days', days: 2 },
  { label: 'In 3 days', days: 3 },
  { label: 'No follow-up', days: -1 },
] as const

function plusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(10, 0, 0, 0)
  return d.toISOString()
}

export function WhatsAppLauncherSheet({
  open, onClose, leadId, contactPhone, pipelineKey, onLogged,
}: Props) {
  const [templates, setTemplates] = useState<CrmOutreachTemplate[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [customText, setCustomText] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewText, setPreviewText] = useState<string>('')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [followupDays, setFollowupDays] = useState<number>(2)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelectedId(null)
    setCustomText('')
    setPreviewUrl(null)
    setPreviewText('')
    setFollowupDays(2)
    setError(null)
    crmListTemplates({ channel: 'whatsapp', pipeline: pipelineKey ?? undefined })
      .then((r) => setTemplates(r.templates))
      .catch(() => setTemplates([]))
  }, [open, pipelineKey])

  // Recompute preview when template or custom changes
  useEffect(() => {
    if (!open) return
    if (selectedId == null && !customText) {
      setPreviewUrl(null)
      setPreviewText('')
      return
    }
    let cancelled = false
    setLoadingPreview(true)
    crmGetWhatsAppUrl(leadId, {
      templateId: selectedId ?? undefined,
      customText: customText || undefined,
    })
      .then((r) => {
        if (cancelled) return
        setPreviewUrl(r.url)
        setPreviewText(r.text)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to build URL')
        setPreviewUrl(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false)
      })
    return () => { cancelled = true }
  }, [open, leadId, selectedId, customText])

  const openAndLog = async () => {
    if (!previewUrl) return
    setSubmitting(true)
    setError(null)
    try {
      window.open(previewUrl, '_blank', 'noopener,noreferrer')
      await crmLogOutreach(leadId, {
        kind: 'whatsapp',
        body: previewText,
        templateId: selectedId,
        nextFollowupAt: followupDays < 0 ? null : plusDays(followupDays),
      })
      toast.success('WhatsApp opened — outreach logged')
      onLogged?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log')
    } finally {
      setSubmitting(false)
    }
  }

  if (!contactPhone) {
    return (
      <SideSheet open={open} onClose={onClose} title="WhatsApp">
        <div className="rounded-md border bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            This contact has no phone or WhatsApp number set. Add one on the contact record to send WhatsApp messages.
          </p>
        </div>
      </SideSheet>
    )
  }

  return (
    <SideSheet open={open} onClose={onClose} title="Send WhatsApp" description={`To ${contactPhone}`}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium block mb-1.5">Template</label>
          {templates.length === 0 ? (
            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              No WhatsApp templates yet. Create some in <span className="font-mono">Settings → CRM → Templates</span>, or write a custom message below.
            </div>
          ) : (
            <div className="space-y-1.5">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(t.id)
                    setCustomText('')
                  }}
                  className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
                    selectedId === t.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.body}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-medium block mb-1.5">Or custom message</label>
          <textarea
            value={customText}
            onChange={(e) => {
              setCustomText(e.target.value)
              if (e.target.value) setSelectedId(null)
            }}
            rows={3}
            placeholder="Type a one-off message…"
            className="w-full rounded-md border bg-background p-2 text-sm resize-y"
          />
        </div>

        {previewUrl ? (
          <div className="rounded-md border bg-card p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Preview</div>
            <div className="text-sm whitespace-pre-wrap break-words">{previewText}</div>
          </div>
        ) : loadingPreview ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Building preview…
          </div>
        ) : null}

        <div className="rounded-md border-2 border-amber-500/30 bg-amber-500/5 p-3">
          <label className="text-xs font-semibold block mb-1.5">Next follow-up</label>
          <div className="flex flex-wrap gap-1.5">
            {FOLLOWUP_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setFollowupDays(p.days)}
                className={`h-7 px-2.5 rounded-full text-xs border transition-colors ${
                  followupDays === p.days
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background border-border hover:bg-muted'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
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
          <Button onClick={openAndLog} disabled={!previewUrl || submitting}>
            {submitting
              ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              : <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            }
            Open WhatsApp + Log
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center">
          We can't detect if you actually pressed Send in WhatsApp — edit the timeline if you didn't send.
        </p>
      </div>
    </SideSheet>
  )
}
