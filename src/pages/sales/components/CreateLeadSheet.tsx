import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, AlertCircle, Sparkles, ChevronDown, ChevronRight, Plus, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { PhoneInput } from '@/components/ui/phone-input'
import { MoneyInput } from '@/components/ui/money-input'
import { UserPicker, Avatar } from '@/components/ui/user-picker'
import { ReferrerPicker, type ReferrerValue } from '@/components/sales/ReferrerPicker'
import { confirm } from '@/components/ui/confirm-dialog'
import { SideSheet } from './SideSheet'
import {
  crmCreateLead, crmListPipelines, crmListSources, crmListCampaigns, crmListContacts,
} from '@/lib/crm/client'
import type {
  CrmPipeline, CrmLeadSource, CrmCampaign, CrmContact,
  CrmLeadStatus, CrmLeadTemperature,
} from '@/lib/crm/types'
import { CRM_LEAD_STATUSES, CRM_LEAD_TEMPERATURES } from '@/lib/crm/types'
import { tempBg, tempDot, tempLabel, statusLabel } from '@/lib/crm/format'
import { useAuthStore } from '@/store/authStore'
import { email as validateEmail, url as validateUrl, ensureScheme } from '@/lib/forms/validate'
import { cn } from '@/lib/utils'
import { useFormSubmit } from '@/hooks/useFormSubmit'

interface Props {
  open: boolean
  onClose: () => void
  defaultPipelineKey?: string
  defaultContact?: { id?: number; name?: string; phone?: string; email?: string; companyName?: string }
  onCreated?: (id: number) => void
}

interface FollowupPreset { label: string; days: number }
const FOLLOWUP_PRESETS: FollowupPreset[] = [
  { label: 'No follow-up', days: -1 },
  { label: 'Tomorrow', days: 1 },
  { label: 'In 2 days', days: 2 },
  { label: 'In 3 days', days: 3 },
  { label: 'Next week', days: 7 },
]

function plusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(10, 0, 0, 0)
  return d.toISOString()
}

function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function tryExtractUtmsFromUrl(s: string): { utmSource?: string; utmMedium?: string; utmCampaign?: string; utmTerm?: string; utmContent?: string; landingUrl?: string } | null {
  try {
    const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`
    const u = new URL(withScheme)
    const get = (k: string) => u.searchParams.get(k) || undefined
    const out = {
      utmSource: get('utm_source'),
      utmMedium: get('utm_medium'),
      utmCampaign: get('utm_campaign'),
      utmTerm: get('utm_term'),
      utmContent: get('utm_content'),
      landingUrl: u.origin + u.pathname,
    }
    return out
  } catch {
    return null
  }
}

export function CreateLeadSheet({ open, onClose, defaultPipelineKey, defaultContact, onCreated }: Props) {
  const me = useAuthStore((s) => s.user)
  const containerRef = useRef<HTMLDivElement>(null)

  const [pipelines, setPipelines] = useState<CrmPipeline[]>([])
  const [sources, setSources] = useState<CrmLeadSource[]>([])
  const [campaigns, setCampaigns] = useState<CrmCampaign[]>([])

  // Core
  const [pipelineKey, setPipelineKey] = useState(defaultPipelineKey ?? 'institute')
  const [sourceKey, setSourceKey] = useState('manual')
  const [title, setTitle] = useState('')
  const [titleEdited, setTitleEdited] = useState(false)

  // Contact
  const [contactName, setContactName] = useState(defaultContact?.name ?? '')
  const [phone, setPhone] = useState(defaultContact?.phone ?? '') // E.164
  const [emailVal, setEmailVal] = useState(defaultContact?.email ?? '')
  const [companyName, setCompanyName] = useState(defaultContact?.companyName ?? '')

  // Live dedup
  const [dedupContact, setDedupContact] = useState<CrmContact | null>(null)
  const [dedupChecking, setDedupChecking] = useState(false)
  const [reusedContactId, setReusedContactId] = useState<number | null>(defaultContact?.id ?? null)

  // Pipeline-specific
  const [course, setCourse] = useState('')
  const [batchStart, setBatchStart] = useState('')         // institute
  const [mode, setMode] = useState<'online' | 'offline' | 'hybrid' | ''>('')  // institute
  const [scope, setScope] = useState('')                    // services
  const [budgetMin, setBudgetMin] = useState('')            // services
  const [budgetMax, setBudgetMax] = useState('')            // services

  // Source-specific (referral)
  const [referrer, setReferrer] = useState<ReferrerValue>({ kind: 'user', userId: null, contactId: null })

  // Source-specific (ad)
  const [campaignId, setCampaignId] = useState<number | null>(null)
  const [pasteUrl, setPasteUrl] = useState('')
  const [utmSource, setUtmSource] = useState('')
  const [utmMedium, setUtmMedium] = useState('')
  const [utmCampaign, setUtmCampaign] = useState('')
  const [utmTerm, setUtmTerm] = useState('')
  const [utmContent, setUtmContent] = useState('')
  const [landingUrl, setLandingUrl] = useState('')

  // Universal meta
  const [value, setValue] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [ownerUserId, setOwnerUserId] = useState<number | null>(null)
  const [temperature, setTemperature] = useState<CrmLeadTemperature>('hot')
  const [status, setStatus] = useState<CrmLeadStatus>('new')
  const [followup, setFollowup] = useState<string | null>(plusDays(2))
  const [presetIdx, setPresetIdx] = useState<number>(2)
  const [notes, setNotes] = useState('')

  // UI state
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showAttribution, setShowAttribution] = useState(false)

  // Resets
  const resetForm = () => {
    setTitle(''); setTitleEdited(false)
    setContactName(''); setPhone(''); setEmailVal(''); setCompanyName('')
    setDedupContact(null); setReusedContactId(null)
    setCourse(''); setBatchStart(''); setMode('')
    setScope(''); setBudgetMin(''); setBudgetMax('')
    setReferrer({ kind: 'user', userId: null, contactId: null })
    setCampaignId(null); setPasteUrl('')
    setUtmSource(''); setUtmMedium(''); setUtmCampaign(''); setUtmTerm(''); setUtmContent('')
    setLandingUrl('')
    setValue(''); setCurrency('INR')
    setOwnerUserId(me?.id ?? null)
    setTemperature('hot'); setStatus('new')
    setFollowup(plusDays(2)); setPresetIdx(2)
    setNotes('')
    setError(null); setFieldErrors({})
  }

  // Bootstrap on open
  useEffect(() => {
    if (!open) return
    resetForm()
    Promise.all([crmListPipelines(), crmListSources(), crmListCampaigns()])
      .then(([p, s, c]) => {
        setPipelines(p.pipelines)
        setSources(s.sources)
        setCampaigns(c.campaigns)
      })
      .catch(() => { /* */ })
    if (defaultPipelineKey) setPipelineKey(defaultPipelineKey)
    if (defaultContact?.id) setReusedContactId(defaultContact.id)
    if (me?.id) setOwnerUserId(me.id)
  }, [open, defaultPipelineKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-derive title (only if user hasn't manually edited it)
  useEffect(() => {
    if (titleEdited) return
    if (!contactName) { setTitle(''); return }
    const second = course || scope.split('.')[0]
    setTitle(second ? `${contactName} — ${second}` : contactName)
  }, [contactName, course, scope, titleEdited])

  // Dedup live preview
  useEffect(() => {
    if (!open || reusedContactId) return
    const phoneDigits = phone.replace(/\D/g, '')
    const emailVal2 = emailVal.trim()
    if (phoneDigits.length < 7 && emailVal2.length < 5) {
      setDedupContact(null)
      return
    }
    let cancelled = false
    setDedupChecking(true)
    const timer = setTimeout(() => {
      const q = phoneDigits.length >= 7 ? phoneDigits : emailVal2
      crmListContacts({ q, limit: 5 })
        .then((r) => {
          if (cancelled) return
          // Match if phone matches (any digit substring) or email exact (case-insensitive)
          const match = r.contacts.find((c) => {
            if (phoneDigits && c.phone) {
              const cd = c.phone.replace(/\D/g, '')
              if (cd.includes(phoneDigits) || phoneDigits.includes(cd)) return true
            }
            if (emailVal2 && c.email && c.email.toLowerCase() === emailVal2.toLowerCase()) return true
            return false
          })
          setDedupContact(match ?? null)
        })
        .catch(() => setDedupContact(null))
        .finally(() => { if (!cancelled) setDedupChecking(false) })
    }, 350)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [phone, emailVal, open, reusedContactId])

  const useExistingContact = (c: CrmContact) => {
    setReusedContactId(c.id)
    setContactName(c.name)
    if (c.phone) setPhone(c.phone)
    if (c.email) setEmailVal(c.email)
    if (c.companyName) setCompanyName(c.companyName)
    setDedupContact(null)
    toast.info(`Reusing contact "${c.name}"`)
  }

  const clearReusedContact = () => {
    setReusedContactId(null)
  }

  // Selected source/pipeline
  const selectedPipeline = useMemo(() => pipelines.find((p) => p.key === pipelineKey), [pipelines, pipelineKey])
  const selectedSource = useMemo(() => sources.find((s) => s.key === sourceKey), [sources, sourceKey])

  // Update default currency when pipeline changes
  useEffect(() => {
    if (selectedPipeline?.defaultCurrency) setCurrency(selectedPipeline.defaultCurrency)
  }, [selectedPipeline])

  // Filter campaigns to selected source/pipeline
  const filteredCampaigns = useMemo(() => {
    if (!selectedSource) return campaigns
    return campaigns.filter((c) =>
      (!c.sourceId || c.sourceId === selectedSource.id) &&
      (!c.pipelineKey || c.pipelineKey === pipelineKey),
    )
  }, [campaigns, selectedSource, pipelineKey])

  // Auto-fill UTMs when pasteUrl changes
  useEffect(() => {
    if (!pasteUrl) return
    const ex = tryExtractUtmsFromUrl(pasteUrl)
    if (ex) {
      if (ex.utmSource) setUtmSource(ex.utmSource)
      if (ex.utmMedium) setUtmMedium(ex.utmMedium)
      if (ex.utmCampaign) setUtmCampaign(ex.utmCampaign)
      if (ex.utmTerm) setUtmTerm(ex.utmTerm)
      if (ex.utmContent) setUtmContent(ex.utmContent)
      if (ex.landingUrl) setLandingUrl(ex.landingUrl)
    }
  }, [pasteUrl])

  // Derive whether form has unsaved input (for confirm-on-close)
  const isDirty = useMemo(() => {
    return [contactName, phone, emailVal, course, scope, value, notes, title, landingUrl,
      utmSource, utmMedium, utmCampaign].some((v) => v && v.trim().length > 0) ||
      referrer.userId != null || referrer.contactId != null || campaignId != null
  }, [contactName, phone, emailVal, course, scope, value, notes, title, landingUrl,
      utmSource, utmMedium, utmCampaign, referrer, campaignId])

  const tryClose = async () => {
    if (!isDirty) { onClose(); return }
    const ok = await confirm({
      title: 'Discard new lead?',
      description: 'You have unsaved changes. Closing will discard them.',
      confirmLabel: 'Discard',
      destructive: true,
    })
    if (ok) onClose()
  }

  // Validation
  const validate = (): { errors: Record<string, string>; firstField?: string } => {
    const errs: Record<string, string> = {}
    if (!contactName.trim()) errs.contactName = 'Contact name is required'
    if (!title.trim()) errs.title = 'Lead title is required'
    if (!phone.trim() && !emailVal.trim()) {
      errs.phone = errs.email = 'Phone or email required'
    }
    if (emailVal.trim()) {
      const e = validateEmail(emailVal)
      if (e) errs.email = e
    }
    if (selectedSource?.kind === 'referral') {
      if (referrer.kind === 'user' && !referrer.userId) errs.referrer = 'Pick a referrer'
      if (referrer.kind === 'contact' && !referrer.contactId) errs.referrer = 'Pick or create a contact'
    }
    if (selectedSource?.kind === 'ad' && !campaignId && !utmSource && !pasteUrl) {
      errs.campaignId = 'Pick a campaign or paste the ad URL'
    }
    if (sourceKey === 'web_form' && !landingUrl.trim()) {
      errs.landingUrl = 'Landing URL required for web form leads'
    }
    if (landingUrl.trim()) {
      const e = validateUrl(landingUrl)
      if (e) errs.landingUrl = e
    }
    return { errors: errs, firstField: Object.keys(errs)[0] }
  }

  const submit = async (afterAction: 'close' | 'open' | 'another') => {
    const { errors } = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      const firstKey = Object.keys(errors)[0]
      const el = document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`)
      el?.focus()
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      toast.error(errors[firstKey])
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const payload: Parameters<typeof crmCreateLead>[0] = {
        pipelineKey,
        sourceKey,
        title: title.trim(),
        contact: reusedContactId
          ? { id: reusedContactId, name: contactName.trim() }
          : {
              name: contactName.trim(),
              phone: phone.trim() || undefined,
              email: emailVal.trim() || undefined,
              companyName: companyName.trim() || undefined,
            },
        ownerUserId,
        nextFollowupAt: followup,
        value: value ? Number(value) : undefined,
        currency,
        temperature,
        status,
        courseOrService: pipelineKey === 'institute' ? course.trim() || undefined : scope.trim() || course.trim() || undefined,
        meta: {
          ...(pipelineKey === 'institute' && batchStart ? { batchStart } : {}),
          ...(pipelineKey === 'institute' && mode ? { mode } : {}),
          ...(pipelineKey === 'services' && (budgetMin || budgetMax) ? { budgetRange: { min: budgetMin || null, max: budgetMax || null } } : {}),
          ...(notes.trim() ? { initialNotes: notes.trim() } : {}),
        },
      }
      // Attribution
      if (selectedSource?.kind === 'referral') {
        if (referrer.kind === 'user') payload.referrerUserId = referrer.userId
        else if (referrer.kind === 'contact') payload.referrerContactId = referrer.contactId
      }
      if (selectedSource?.kind === 'ad' || sourceKey === 'web_form') {
        if (campaignId) payload.campaignId = campaignId
        if (utmSource) payload.utmSource = utmSource
        if (utmMedium) payload.utmMedium = utmMedium
        if (utmCampaign) payload.utmCampaign = utmCampaign
        if (utmTerm) payload.utmTerm = utmTerm
        if (utmContent) payload.utmContent = utmContent
        if (landingUrl) payload.landingUrl = ensureScheme(landingUrl)
      }
      const r = await crmCreateLead(payload)
      toast.success(`Lead "${r.lead.title}" created`)
      onCreated?.(r.lead.id)
      if (afterAction === 'open') {
        // Navigate to detail page — caller handles via onCreated typically
        window.location.href = `/sales/leads/${r.lead.id}`
      } else if (afterAction === 'another') {
        resetForm()
      } else {
        onClose()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create lead'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  useFormSubmit(containerRef, () => submit('close'), submitting)

  const showReferrer = selectedSource?.kind === 'referral'
  const showAdAttribution = selectedSource?.kind === 'ad' || sourceKey === 'web_form'
  const showLandingUrl = sourceKey === 'web_form' || sourceKey === 'meta_ads' || sourceKey === 'google_ads' || sourceKey === 'instagram_ads'

  return (
    <SideSheet
      open={open}
      onClose={tryClose}
      title="New lead"
      description="Capture an inbound enquiry — we'll dedup the contact by phone or email."
      width="lg"
    >
      <div ref={containerRef} className="space-y-4">
        {/* ── Pipeline + Source ───────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Pipeline" required>
            <select
              data-field="pipelineKey"
              value={pipelineKey}
              onChange={(e) => setPipelineKey(e.target.value)}
              className="w-full h-9 rounded-md border bg-background px-2 text-sm"
            >
              {pipelines.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Source" required>
            <select
              data-field="sourceKey"
              value={sourceKey}
              onChange={(e) => setSourceKey(e.target.value)}
              className="w-full h-9 rounded-md border bg-background px-2 text-sm"
            >
              {sources.filter((s) => s.active).map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* ── Contact (with live dedup) ───────────────────── */}
        <div className="rounded-md border bg-card/30 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</h3>
            {reusedContactId ? (
              <button
                type="button"
                onClick={clearReusedContact}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Clear & enter new
              </button>
            ) : null}
          </div>

          {dedupContact && !reusedContactId ? (
            <div className="rounded-md border-2 border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
              <div className="text-xs font-semibold text-amber-700 inline-flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Existing contact found
              </div>
              <div className="text-sm font-medium">
                {dedupContact.name}
                <span className="text-muted-foreground font-normal">
                  {' '}· {dedupContact.phone ?? dedupContact.email ?? ''}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {dedupContact.leadsCount ?? 0} prior leads · {dedupContact.wonCount ?? 0} won
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={() => useExistingContact(dedupContact)}>Use this contact</Button>
                <Button size="sm" variant="ghost" onClick={() => setDedupContact(null)}>Ignore — create new</Button>
              </div>
            </div>
          ) : null}

          <Field label="Name" required error={fieldErrors.contactName}>
            <input
              data-field="contactName"
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Riya Sharma"
              maxLength={200}
              autoFocus
              className={cn(
                'w-full h-9 rounded-md border bg-background px-2 text-sm',
                fieldErrors.contactName && 'border-rose-500',
              )}
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Phone" error={fieldErrors.phone}>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                invalid={!!fieldErrors.phone}
              />
            </Field>
            <Field label="Email" error={fieldErrors.email}>
              <input
                data-field="email"
                type="email"
                value={emailVal}
                onChange={(e) => setEmailVal(e.target.value)}
                placeholder="riya@example.com"
                maxLength={255}
                className={cn(
                  'w-full h-9 rounded-md border bg-background px-2 text-sm',
                  fieldErrors.email && 'border-rose-500',
                )}
              />
            </Field>
          </div>

          {dedupChecking ? (
            <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Checking for duplicates…
            </p>
          ) : null}

          {pipelineKey === 'services' ? (
            <Field label="Company">
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corp"
                className="w-full h-9 rounded-md border bg-background px-2 text-sm"
              />
            </Field>
          ) : null}
        </div>

        {/* ── Source-specific: REFERRAL ───────────────────── */}
        {showReferrer ? (
          <div className="rounded-md border-2 border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2" data-field="referrer">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Who referred this lead? <span className="text-rose-500">*</span>
            </h3>
            <ReferrerPicker
              value={referrer}
              onChange={setReferrer}
              required
            />
            {fieldErrors.referrer ? (
              <p className="text-[11px] text-rose-600">{fieldErrors.referrer}</p>
            ) : null}
          </div>
        ) : null}

        {/* ── Source-specific: AD CAMPAIGN ────────────────── */}
        {showAdAttribution ? (
          <div className="rounded-md border bg-card/30 p-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {selectedSource?.kind === 'ad' ? 'Ad attribution' : 'Inbound attribution'}
            </h3>

            {selectedSource?.kind === 'ad' ? (
              <Field label="Campaign" hint="Pick an existing campaign — or paste the ad URL below to auto-extract.">
                <select
                  data-field="campaignId"
                  value={campaignId ?? ''}
                  onChange={(e) => setCampaignId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                >
                  <option value="">— No specific campaign —</option>
                  {filteredCampaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {fieldErrors.campaignId ? (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.campaignId}</p>
                ) : null}
              </Field>
            ) : null}

            <Field label="Paste ad / form URL" hint="If you paste a URL with UTMs, we'll auto-fill them below.">
              <input
                type="url"
                value={pasteUrl}
                onChange={(e) => setPasteUrl(e.target.value)}
                placeholder="https://howinai.example/python?utm_source=meta&utm_campaign=…"
                className="w-full h-9 rounded-md border bg-background px-2 text-sm font-mono text-xs"
              />
            </Field>

            <button
              type="button"
              onClick={() => setShowAttribution((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              {showAttribution ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {showAttribution ? 'Hide' : 'Show'} UTM details
            </button>

            {showAttribution ? (
              <div className="space-y-2 pt-1">
                {showLandingUrl ? (
                  <Field label="Landing URL" required={sourceKey === 'web_form'} error={fieldErrors.landingUrl}>
                    <input
                      data-field="landingUrl"
                      type="url"
                      value={landingUrl}
                      onChange={(e) => setLandingUrl(e.target.value)}
                      placeholder="https://howinai.example/python"
                      className={cn(
                        'w-full h-9 rounded-md border bg-background px-2 text-sm',
                        fieldErrors.landingUrl && 'border-rose-500',
                      )}
                    />
                  </Field>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <Field label="utm_source"><UtmInput value={utmSource} onChange={setUtmSource} /></Field>
                  <Field label="utm_medium"><UtmInput value={utmMedium} onChange={setUtmMedium} /></Field>
                  <Field label="utm_campaign"><UtmInput value={utmCampaign} onChange={setUtmCampaign} /></Field>
                  <Field label="utm_term"><UtmInput value={utmTerm} onChange={setUtmTerm} /></Field>
                  <Field label="utm_content" className="col-span-2">
                    <UtmInput value={utmContent} onChange={setUtmContent} />
                  </Field>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Pipeline-specific fields ────────────────────── */}
        {pipelineKey === 'institute' ? (
          <div className="rounded-md border bg-card/30 p-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Course details
            </h3>
            <Field label="Course">
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="Python Bootcamp · Data Science · MERN Stack"
                className="w-full h-9 rounded-md border bg-background px-2 text-sm"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Preferred batch start">
                <input
                  type="date"
                  value={batchStart}
                  onChange={(e) => setBatchStart(e.target.value)}
                  className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                />
              </Field>
              <Field label="Mode">
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as never)}
                  className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                >
                  <option value="">—</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </Field>
            </div>
          </div>
        ) : pipelineKey === 'services' ? (
          <div className="rounded-md border bg-card/30 p-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Project details
            </h3>
            <Field label="Service / type">
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="Website · Mobile App · SaaS · Custom Backend"
                className="w-full h-9 rounded-md border bg-background px-2 text-sm"
              />
            </Field>
            <Field label="Scope" hint="Brief description of what they need.">
              <textarea
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                rows={2}
                placeholder="E-commerce site with payment integration, admin dashboard…"
                className="w-full rounded-md border bg-background p-2 text-sm resize-y"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Budget min" hint="Optional">
                <MoneyInput
                  amount={budgetMin}
                  currency={currency}
                  onChange={(amt, cur) => { setBudgetMin(amt); setCurrency(cur) }}
                />
              </Field>
              <Field label="Budget max" hint="Optional">
                <MoneyInput
                  amount={budgetMax}
                  currency={currency}
                  onChange={(amt, cur) => { setBudgetMax(amt); setCurrency(cur) }}
                />
              </Field>
            </div>
          </div>
        ) : null}

        {/* ── Title (auto-derived) ────────────────────────── */}
        <Field label="Lead title" required error={fieldErrors.title}>
          <input
            data-field="title"
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleEdited(true) }}
            placeholder="Auto-fills from name + course/service"
            maxLength={200}
            className={cn(
              'w-full h-9 rounded-md border bg-background px-2 text-sm',
              fieldErrors.title && 'border-rose-500',
            )}
          />
        </Field>

        {/* ── Owner + value ────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Owner" hint="Who'll handle this lead.">
            <UserPicker
              value={ownerUserId}
              onChange={setOwnerUserId}
              placeholder="Assign…"
              allowUnassigned
            />
          </Field>
          <Field label="Estimated value">
            <MoneyInput
              amount={value}
              currency={currency}
              onChange={(amt, cur) => { setValue(amt); setCurrency(cur) }}
            />
          </Field>
        </div>

        {/* ── Advanced (collapsed) ─────────────────────────── */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Advanced (initial status, temperature, follow-up, notes)
        </button>

        {showAdvanced ? (
          <div className="space-y-3 pt-1">
            <Field label="Initial status">
              <div className="flex flex-wrap gap-1">
                {CRM_LEAD_STATUSES.slice(0, 4).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      'h-7 px-2.5 rounded-full text-xs border',
                      status === s ? 'bg-foreground text-background border-foreground' : 'bg-background hover:bg-muted',
                    )}
                  >
                    {statusLabel(s)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Initial temperature">
              <div className="flex flex-wrap gap-1">
                {CRM_LEAD_TEMPERATURES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTemperature(t)}
                    className={cn(
                      'h-7 px-2.5 rounded-full text-xs border inline-flex items-center gap-1',
                      temperature === t ? tempBg(t) : 'bg-background border-border hover:bg-muted',
                    )}
                  >
                    {tempDot(t)} {tempLabel(t)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Initial note (becomes timeline entry)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Anything important about how this lead came in."
                className="w-full rounded-md border bg-background p-2 text-sm resize-y"
              />
            </Field>
          </div>
        ) : null}

        {/* ── Next follow-up (always visible — required-ish) ─ */}
        <div className="rounded-md border-2 border-amber-500/30 bg-amber-500/5 p-3">
          <Field label="Next follow-up" hint="Set when you'll chase this lead.">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {FOLLOWUP_PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setPresetIdx(i)
                    setFollowup(p.days < 0 ? null : plusDays(p.days))
                  }}
                  className={cn(
                    'h-7 px-2.5 rounded-full text-xs border transition-colors',
                    presetIdx === i
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background border-border hover:bg-muted',
                  )}
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
                if (!v) { setFollowup(null); return }
                setFollowup(new Date(v).toISOString())
              }}
              className="w-full h-9 rounded-md border bg-background px-2 text-sm disabled:opacity-50"
            />
          </Field>
        </div>

        {error ? (
          <div className="text-sm text-rose-600 bg-rose-500/10 border border-rose-500/30 rounded-md p-2">
            {error}
          </div>
        ) : null}

        {/* ── Actions ──────────────────────────────────────── */}
        <div className="flex flex-wrap justify-end gap-2 pt-2 border-t sticky bottom-0 bg-background -mx-4 px-4 -mb-4 pb-3">
          <Button variant="ghost" onClick={tryClose} disabled={submitting}>Cancel</Button>
          <Button
            variant="outline"
            onClick={() => submit('another')}
            disabled={submitting}
            title="Save and start a new lead form"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Save & new
          </Button>
          <Button
            variant="outline"
            onClick={() => submit('open')}
            disabled={submitting}
            title="Save and navigate to lead detail"
          >
            <MoreHorizontal className="mr-1.5 h-3.5 w-3.5" />
            Save & open
          </Button>
          <Button onClick={() => submit('close')} disabled={submitting}>
            {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            {submitting ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </SideSheet>
  )
}

function UtmInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-8 rounded border bg-background px-2 text-xs font-mono"
    />
  )
}

void Avatar
