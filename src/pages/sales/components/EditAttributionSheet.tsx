import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { SideSheet } from './SideSheet'
import {
  crmUpdateLead, crmListSources, crmListCampaigns,
} from '@/lib/crm/client'
import type { CrmLead, CrmLeadSource, CrmCampaign } from '@/lib/crm/types'
import { ensureScheme } from '@/lib/forms/validate'

interface Props {
  open: boolean
  onClose: () => void
  lead: CrmLead
  onSaved: () => void
}

export function EditAttributionSheet({ open, onClose, lead, onSaved }: Props) {
  const [sources, setSources] = useState<CrmLeadSource[]>([])
  const [campaigns, setCampaigns] = useState<CrmCampaign[]>([])
  const [campaignId, setCampaignId] = useState<number | null>(lead.campaignId)
  const [utmSource, setUtmSource] = useState(lead.utmSource ?? '')
  const [utmMedium, setUtmMedium] = useState(lead.utmMedium ?? '')
  const [utmCampaign, setUtmCampaign] = useState(lead.utmCampaign ?? '')
  const [utmTerm, setUtmTerm] = useState(lead.utmTerm ?? '')
  const [utmContent, setUtmContent] = useState(lead.utmContent ?? '')
  const [landingUrl, setLandingUrl] = useState(lead.landingUrl ?? '')
  const [sourceCampaignText, setSourceCampaignText] = useState(lead.sourceCampaignText ?? '')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    Promise.all([crmListSources(), crmListCampaigns()])
      .then(([s, c]) => { setSources(s.sources); setCampaigns(c.campaigns) })
      .catch(() => { /* */ })
    setCampaignId(lead.campaignId)
    setUtmSource(lead.utmSource ?? '')
    setUtmMedium(lead.utmMedium ?? '')
    setUtmCampaign(lead.utmCampaign ?? '')
    setUtmTerm(lead.utmTerm ?? '')
    setUtmContent(lead.utmContent ?? '')
    setLandingUrl(lead.landingUrl ?? '')
    setSourceCampaignText(lead.sourceCampaignText ?? '')
  }, [open, lead])

  const submit = async () => {
    setSubmitting(true)
    try {
      await crmUpdateLead(lead.id, {
        campaignId,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        utmTerm: utmTerm || null,
        utmContent: utmContent || null,
        landingUrl: landingUrl ? ensureScheme(landingUrl) : null,
        sourceCampaignText: sourceCampaignText || null,
      } as Partial<CrmLead>)
      toast.success('Attribution updated')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SideSheet open={open} onClose={onClose} title="Edit attribution" description="UTMs, campaign, and landing URL." width="md">
      <div className="space-y-3">
        <Field label="Campaign" hint="Pick a campaign or leave blank.">
          <select
            value={campaignId ?? ''}
            onChange={(e) => setCampaignId(e.target.value ? Number(e.target.value) : null)}
            className="w-full h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">— None —</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Free-text campaign note" hint="Use when there's no formal campaign row.">
          <input
            type="text"
            value={sourceCampaignText}
            onChange={(e) => setSourceCampaignText(e.target.value)}
            placeholder="e.g. Diwali Promo 2026 — manual ledger"
            className="w-full h-9 rounded-md border bg-background px-2 text-sm"
          />
        </Field>
        <Field label="Landing URL">
          <input
            type="url"
            value={landingUrl}
            onChange={(e) => setLandingUrl(e.target.value)}
            placeholder="https://howinai.example/python"
            className="w-full h-9 rounded-md border bg-background px-2 text-sm font-mono text-xs"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="utm_source"><U value={utmSource} onChange={setUtmSource} /></Field>
          <Field label="utm_medium"><U value={utmMedium} onChange={setUtmMedium} /></Field>
          <Field label="utm_campaign"><U value={utmCampaign} onChange={setUtmCampaign} /></Field>
          <Field label="utm_term"><U value={utmTerm} onChange={setUtmTerm} /></Field>
          <Field label="utm_content" className="col-span-2"><U value={utmContent} onChange={setUtmContent} /></Field>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </div>
      {/* Silence sources unused */}
      <span className="hidden">{sources.length}</span>
    </SideSheet>
  )
}

function U({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-8 rounded border bg-background px-2 text-xs font-mono"
    />
  )
}
