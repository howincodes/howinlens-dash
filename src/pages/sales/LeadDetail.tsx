import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ChevronLeft, MessageSquare, Phone, StickyNote, Users, Mail, Loader2,
  Thermometer, Trash2, ExternalLink, Mail as MailIcon, Pencil,
  Copy, Building2, Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useHasPermission } from '@/store/authStore'
import { StageStepper } from './components/StageStepper'
import { TemperatureBadge } from './components/TemperatureBadge'
import { Timeline } from './components/Timeline'
import { LogOutreachSheet } from './components/LogOutreachSheet'
import { WhatsAppLauncherSheet } from './components/WhatsAppLauncherSheet'
import { EditAttributionSheet } from './components/EditAttributionSheet'
import { confirm, prompt } from '@/components/ui/confirm-dialog'
import { InlineEdit, InlineEditNumber } from '@/components/ui/inline-edit'
import { UserPicker, Avatar } from '@/components/ui/user-picker'
import { ReferrerPicker, type ReferrerValue } from '@/components/sales/ReferrerPicker'
import {
  crmGetLead, crmListOutreach, crmTransitionLead, crmSetLeadTemperature,
  crmDeleteLead, crmUpdateLead, crmAssignLead,
} from '@/lib/crm/client'
import {
  fmtDateShort, fmtFollowupCountdown, fmtMoney, statusColor, statusLabel,
} from '@/lib/crm/format'
import { formatStoredPhone } from '@/lib/phone'
import {
  CRM_LEAD_TEMPERATURES, type CrmLead, type CrmContact, type CrmLeadSource,
  type CrmPipeline, type CrmOutreachEvent, type CrmLeadStatus, type CrmLeadTemperature,
  type CrmOutreachKind,
} from '@/lib/crm/types'
import { cn } from '@/lib/utils'

export default function LeadDetail() {
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const navigate = useNavigate()
  const canWrite = useHasPermission('crm.leads.write')
  const canAssign = useHasPermission('crm.leads.assign')
  const canDelete = useHasPermission('crm.leads.delete')
  const canLog = useHasPermission('crm.outreach.write')

  const [lead, setLead] = useState<CrmLead | null>(null)
  const [contact, setContact] = useState<CrmContact | null>(null)
  const [source, setSource] = useState<CrmLeadSource | null>(null)
  const [pipeline, setPipeline] = useState<CrmPipeline | null>(null)
  const [campaign, setCampaign] = useState<{ id: number; name: string } | null>(null)
  const [campaignCategory, setCampaignCategory] = useState<{ key: string; label: string; color: string | null } | null>(null)
  const [events, setEvents] = useState<CrmOutreachEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logOpen, setLogOpen] = useState(false)
  const [logKind, setLogKind] = useState<CrmOutreachKind>('note')
  const [waOpen, setWaOpen] = useState(false)
  const [editAttr, setEditAttr] = useState(false)
  const [editReferrer, setEditReferrer] = useState(false)
  const [referrerDraft, setReferrerDraft] = useState<ReferrerValue>({
    kind: null, userId: null, contactId: null,
  })
  const [timelineFilter, setTimelineFilter] = useState<CrmOutreachKind | 'all'>('all')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [r1, r2] = await Promise.all([
        crmGetLead(id),
        crmListOutreach(id, { limit: 200 }),
      ])
      setLead(r1.lead)
      setContact(r1.contact)
      setSource(r1.source)
      setPipeline(r1.pipeline)
      setCampaign(r1.campaign ? { id: r1.campaign.id, name: r1.campaign.name } : null)
      setCampaignCategory(r1.campaignCategory ? { key: r1.campaignCategory.key, label: r1.campaignCategory.label, color: r1.campaignCategory.color } : null)
      setEvents(r2.events)
      setReferrerDraft({
        kind: r1.lead.referrerUserId ? 'user' : r1.lead.referrerContactId ? 'contact' : 'user',
        userId: r1.lead.referrerUserId,
        contactId: r1.lead.referrerContactId,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lead')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { if (Number.isFinite(id)) refresh() }, [id, refresh])

  const filteredEvents = useMemo(() => {
    if (timelineFilter === 'all') return events
    return events.filter((e) => e.kind === timelineFilter)
  }, [events, timelineFilter])

  if (loading && !lead) {
    return (
      <div className="flex items-center justify-center h-60 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading lead…
      </div>
    )
  }
  if (error || !lead || !contact) {
    return (
      <div className="space-y-3">
        <Link to="/sales/leads" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Back to leads
        </Link>
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600">
          {error ?? 'Lead not found'}
        </div>
      </div>
    )
  }

  // ── Mutations ───────────────────────────────────────────
  const update = async (patch: Partial<CrmLead>, msg = 'Saved') => {
    await crmUpdateLead(id, patch)
    toast.success(msg)
    await refresh()
  }

  const transition = async (status: CrmLeadStatus) => {
    if (!lead) return
    let lostReason: string | undefined
    if (status === 'lost') {
      const r = await prompt({
        title: 'Why was this lead lost?',
        description: 'Optional — helps with reporting on lost-reason patterns.',
        label: 'Lost reason',
        defaultValue: lead.lostReason ?? '',
        placeholder: 'budget · went with competitor · ghosted · …',
        confirmLabel: 'Mark as Lost',
      })
      if (r === null) return
      lostReason = r || undefined
    }
    try {
      await crmTransitionLead(id, status, lostReason)
      toast.success(`Status → ${statusLabel(status)}`)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transition failed')
    }
  }

  const setTemperature = async (t: CrmLeadTemperature) => {
    try {
      await crmSetLeadTemperature(id, t)
      toast.success(`Temperature → ${t}`)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  }

  const remove = async () => {
    const ok = await confirm({
      title: 'Delete this lead?',
      description: 'Soft-deleted — admin can restore from Trash within 30 days.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await crmDeleteLead(id)
      toast.success('Lead deleted')
      navigate('/sales/leads')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const assignOwner = async (uid: number | null) => {
    try {
      await crmAssignLead(id, uid)
      toast.success(uid ? 'Owner assigned' : 'Owner unassigned')
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  }

  const saveReferrer = async () => {
    try {
      const patch: Partial<CrmLead> = {
        referrerUserId: referrerDraft.kind === 'user' ? referrerDraft.userId ?? null : null,
        referrerContactId: referrerDraft.kind === 'contact' ? referrerDraft.contactId ?? null : null,
      }
      await crmUpdateLead(id, patch)
      toast.success('Referrer saved')
      setEditReferrer(false)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  }

  const editLostReason = async () => {
    const r = await prompt({
      title: 'Edit lost reason',
      label: 'Reason',
      defaultValue: lead.lostReason ?? '',
      placeholder: 'budget · went with competitor · ghosted · …',
    })
    if (r === null) return
    await update({ lostReason: r || null } as Partial<CrmLead>, 'Lost reason updated')
  }

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`))
  }

  const due = fmtFollowupCountdown(lead.nextFollowupAt)
  const phoneStored = contact.phone
  const phoneDisplay = formatStoredPhone(phoneStored)
  const waNumber = contact.whatsapp || contact.phone
  const waDigits = (waNumber || '').replace(/\D/g, '')

  // Source-relevant — show referrer affordance for any source
  const isReferralSource = source?.kind === 'referral'

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center justify-between">
        <Link to="/sales/leads" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Back to leads
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => copy(window.location.href, 'Lead URL')}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-muted"
            title="Copy URL"
          >
            <Copy className="h-3 w-3" /> Share
          </button>
          {canDelete ? (
            <Button variant="ghost" size="sm" onClick={remove} className="text-rose-600 hover:bg-rose-500/10">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          ) : null}
        </div>
      </div>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <InlineEdit
                value={lead.title}
                onSave={async (v) => { await update({ title: v }, 'Title saved') }}
                placeholder="Title…"
                className="text-xl font-bold"
                renderView={(v) => <span className="text-xl font-bold">{v || 'Untitled'}</span>}
                disabled={!canWrite}
              />
              <span className={cn('inline-block px-2 py-0.5 rounded-full border text-xs font-medium', statusColor(lead.status))}>
                {statusLabel(lead.status)}
              </span>
              <TemperatureBadge value={lead.temperature} size="sm" />
            </div>

            <InlineEdit
              value={lead.courseOrService}
              onSave={async (v) => { await update({ courseOrService: v }, 'Updated') }}
              placeholder={pipeline?.key === 'institute' ? 'Course' : 'Service'}
              emptyLabel={pipeline?.key === 'institute' ? '+ Add course' : '+ Add service'}
              className="text-sm text-muted-foreground"
              disabled={!canWrite}
            />

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> {pipeline?.label}
              </span>
              <span className="inline-flex items-center gap-1.5">
                Source: <span className="text-foreground font-medium">{source?.label}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                Value:
                <InlineEditNumber
                  value={lead.value ? Number(lead.value) : null}
                  onSave={async (n) => {
                    await update({ value: n != null ? String(n) : null } as Partial<CrmLead>, 'Value saved')
                  }}
                  formatView={(n) => (
                    <span className="font-mono">{n != null ? fmtMoney(n, lead.currency) : '—'}</span>
                  )}
                  emptyLabel="add"
                  disabled={!canWrite}
                />
              </span>
              <span className={cn('inline-flex items-center gap-1.5',
                due.tone === 'overdue' && 'text-rose-600 font-semibold',
                due.tone === 'due_today' && 'text-amber-600 font-semibold',
              )}>
                Follow-up: {due.text}
              </span>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
              <span className="inline-flex items-center gap-1.5">
                Owner:
                <UserPicker
                  value={lead.ownerUserId}
                  onChange={assignOwner}
                  size="sm"
                  placeholder="Assign…"
                  disabled={!canAssign}
                />
              </span>

              {/* Referrer (always visible if source is referral) */}
              {isReferralSource ? (
                <span className="inline-flex items-center gap-1.5">
                  Referrer:
                  {editReferrer ? (
                    <span className="inline-flex items-center gap-1">
                      <ReferrerPicker value={referrerDraft} onChange={setReferrerDraft} />
                      <Button size="sm" onClick={saveReferrer}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditReferrer(false)}>Cancel</Button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditReferrer(true)}
                      className="inline-flex items-center gap-1 px-1 hover:bg-muted rounded text-xs"
                    >
                      {lead.referrerUserId ? (
                        <ReferrerLabel kind="user" id={lead.referrerUserId} />
                      ) : lead.referrerContactId ? (
                        <ReferrerLabel kind="contact" id={lead.referrerContactId} />
                      ) : (
                        <span className="italic text-muted-foreground">+ Pick referrer</span>
                      )}
                      <Pencil className="h-3 w-3 opacity-50" />
                    </button>
                  )}
                </span>
              ) : null}

              {lead.status === 'lost' || lead.status === 'dropped' ? (
                <button
                  type="button"
                  onClick={editLostReason}
                  className="inline-flex items-center gap-1 px-1 hover:bg-muted rounded text-xs"
                >
                  Reason: <span className="text-foreground">{lead.lostReason || 'add'}</span>
                  <Pencil className="h-3 w-3 opacity-50" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <StageStepper current={lead.status} onTransition={transition} />
        </div>
      </div>

      {/* ── Two-column body ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left: contact + attribution + timeline */}
        <div className="md:col-span-2 space-y-4 min-w-0">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</h2>
              <Link
                to={`/sales/contacts/${contact.id}`}
                className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5"
              >
                View profile <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </div>
            <div className="flex items-start gap-3">
              <Avatar name={contact.name} size="md" />
              <div className="flex-1 min-w-0 space-y-1.5 text-sm">
                <Link to={`/sales/contacts/${contact.id}`} className="font-medium hover:text-primary">
                  {contact.name}
                </Link>
                {contact.companyName ? (
                  <div className="text-muted-foreground inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> {contact.companyName}
                  </div>
                ) : null}
                {phoneStored ? (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={`tel:${phoneStored}`} className="hover:underline tabular-nums">{phoneDisplay}</a>
                    <button onClick={() => copy(phoneStored, 'Phone')} className="p-0.5 text-muted-foreground hover:text-foreground" title="Copy">
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                ) : null}
                {contact.email ? (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                    <button onClick={() => copy(contact.email!, 'Email')} className="p-0.5 text-muted-foreground hover:text-foreground" title="Copy">
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                ) : null}
                {waDigits ? (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    <a
                      href={`https://wa.me/${waDigits}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline tabular-nums"
                    >
                      {formatStoredPhone(waNumber)} · WhatsApp
                    </a>
                  </div>
                ) : null}
                {contact.notes ? (
                  <div className="text-muted-foreground italic mt-2 whitespace-pre-wrap">{contact.notes}</div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Attribution */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attribution</h2>
              <button
                type="button"
                onClick={() => setEditAttr(true)}
                className="text-[11px] text-primary hover:underline inline-flex items-center gap-0.5"
              >
                Edit <Pencil className="h-2.5 w-2.5" />
              </button>
            </div>
            {(lead.utmSource || lead.utmMedium || lead.utmCampaign || lead.sourceCampaignText || lead.landingUrl || lead.campaignId) ? (
              <dl className="grid grid-cols-2 gap-y-1 text-xs">
                {lead.campaignId ? (
                  <>
                    <dt className="text-muted-foreground">Campaign</dt>
                    <dd>
                      <Link to={`/sales/campaigns/${lead.campaignId}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                        <span className="font-medium">{campaign?.name ?? `#${lead.campaignId}`}</span>
                        {campaignCategory ? (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px]"
                            style={campaignCategory.color
                              ? { borderColor: campaignCategory.color + '66', color: campaignCategory.color }
                              : undefined}
                          >
                            {campaignCategory.color ? <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: campaignCategory.color }} /> : null}
                            {campaignCategory.label}
                          </span>
                        ) : null}
                      </Link>
                    </dd>
                  </>
                ) : null}
                {lead.sourceCampaignText ? (<><dt className="text-muted-foreground">Campaign note</dt><dd>{lead.sourceCampaignText}</dd></>) : null}
                {lead.landingUrl ? (<><dt className="text-muted-foreground">Landing</dt>
                  <dd className="truncate"><a href={lead.landingUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">{lead.landingUrl}</a></dd></>) : null}
                {lead.utmSource ? (<><dt className="text-muted-foreground">utm_source</dt><dd className="font-mono">{lead.utmSource}</dd></>) : null}
                {lead.utmMedium ? (<><dt className="text-muted-foreground">utm_medium</dt><dd className="font-mono">{lead.utmMedium}</dd></>) : null}
                {lead.utmCampaign ? (<><dt className="text-muted-foreground">utm_campaign</dt><dd className="font-mono">{lead.utmCampaign}</dd></>) : null}
                {lead.utmTerm ? (<><dt className="text-muted-foreground">utm_term</dt><dd className="font-mono">{lead.utmTerm}</dd></>) : null}
                {lead.utmContent ? (<><dt className="text-muted-foreground">utm_content</dt><dd className="font-mono">{lead.utmContent}</dd></>) : null}
              </dl>
            ) : (
              <p className="text-xs text-muted-foreground italic">No attribution data — click Edit to add.</p>
            )}
          </div>

          {/* Timeline */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</h2>
              <span className="text-[11px] text-muted-foreground">
                Created {fmtDateShort(lead.createdAt)} · {events.length} events
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {(['all', 'note', 'call', 'whatsapp', 'meeting', 'email', 'sms', 'status_change', 'temperature_change'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTimelineFilter(k as never)}
                  className={cn(
                    'h-6 px-2 rounded-full text-[11px] border',
                    timelineFilter === k
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background border-border text-muted-foreground hover:bg-muted',
                  )}
                >
                  {k === 'all' ? 'All' : k.replace('_', ' ')}
                </button>
              ))}
            </div>
            <Timeline events={filteredEvents} />
          </div>
        </div>

        {/* Right: action panel (sticky) */}
        <aside className="space-y-3 md:sticky md:top-20 md:self-start">
          {canLog ? (
            <div className="rounded-lg border bg-card p-3 space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Quick actions</h2>
              <Button
                className="w-full justify-start"
                onClick={() => setWaOpen(true)}
                disabled={!waDigits}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-2" /> WhatsApp
                <ExternalLink className="h-3 w-3 ml-auto opacity-60" />
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => { setLogKind('call'); setLogOpen(true) }}>
                <Phone className="h-3.5 w-3.5 mr-2" /> Log call
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => { setLogKind('note'); setLogOpen(true) }}>
                <StickyNote className="h-3.5 w-3.5 mr-2" /> Log note
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => { setLogKind('meeting'); setLogOpen(true) }}>
                <Users className="h-3.5 w-3.5 mr-2" /> Log meeting
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => { setLogKind('email'); setLogOpen(true) }}>
                <MailIcon className="h-3.5 w-3.5 mr-2" /> Log email
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => { setLogKind('sms'); setLogOpen(true) }}>
                <MessageSquare className="h-3.5 w-3.5 mr-2" /> Log SMS
              </Button>
            </div>
          ) : null}

          <div className="rounded-lg border bg-card p-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 inline-flex items-center gap-1">
              <Thermometer className="h-3 w-3" /> Temperature
            </h2>
            <div className="grid grid-cols-2 gap-1.5">
              {CRM_LEAD_TEMPERATURES.map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={t === lead.temperature}
                  onClick={() => setTemperature(t)}
                  className={cn(
                    'h-8 rounded-md border text-xs font-medium transition-colors flex items-center justify-center',
                    t === lead.temperature
                      ? 'bg-primary text-primary-foreground border-primary cursor-default'
                      : 'bg-background border-border hover:bg-muted',
                  )}
                >
                  <TemperatureBadge value={t} size="sm" className="border-0 bg-transparent" />
                </button>
              ))}
            </div>
          </div>

          {(lead.status === 'lost' || lead.status === 'dropped') ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => transition('qualified')}
            >
              Reopen lead
            </Button>
          ) : null}
        </aside>
      </div>

      <LogOutreachSheet
        open={logOpen}
        onClose={() => setLogOpen(false)}
        leadId={id}
        defaultKind={logKind}
        defaultFollowupDays={pipeline?.key === 'institute' ? 2 : 7}
        onLogged={refresh}
      />
      <WhatsAppLauncherSheet
        open={waOpen}
        onClose={() => setWaOpen(false)}
        leadId={id}
        contactPhone={waNumber}
        pipelineKey={pipeline?.key}
        onLogged={refresh}
      />
      <EditAttributionSheet
        open={editAttr}
        onClose={() => setEditAttr(false)}
        lead={lead}
        onSaved={refresh}
      />
    </div>
  )
}

// Lightweight referrer label — fetches user/contact name on demand.
function ReferrerLabel({ kind, id }: { kind: 'user' | 'contact'; id: number }) {
  const [name, setName] = useState<string>('…')
  useEffect(() => {
    let cancelled = false
    if (kind === 'user') {
      import('@/lib/api').then(({ getUser }) => getUser(String(id)))
        .then((u: any) => { if (!cancelled) setName(u?.name ?? `User #${id}`) })
        .catch(() => { if (!cancelled) setName(`User #${id}`) })
    } else {
      import('@/lib/crm/client').then(({ crmGetContact }) => crmGetContact(id))
        .then((r) => { if (!cancelled) setName(r.contact.name) })
        .catch(() => { if (!cancelled) setName(`Contact #${id}`) })
    }
    return () => { cancelled = true }
  }, [kind, id])
  return <span className="text-foreground">{kind === 'user' ? '👤 ' : '🤝 '}{name}</span>
}
