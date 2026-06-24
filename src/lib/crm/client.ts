import { fetchClient } from '../api'
import { useAuthStore } from '@/store/authStore'
import type {
  CrmLead, CrmLeadListItem, CrmContact, CrmLeadSource, CrmPipeline,
  CrmOutreachEvent, CrmOutreachTemplate, CrmCampaign, CrmCampaignCategory, CrmCampaignRecharge,
  CrmCampaignMedia, CrmMediaLimits,
  CrmCampaignReportImport, CrmCampaignReportRow, CrmCampaignReportDayAgg,
  CrmCampaignInsight, CrmCampaignAnalyzeResult,
  CrmFunnelReport,
  CrmSourceRoiRow, CrmOwnerRow, CrmReferrerLeaderboard, CrmOverviewKpis,
  CrmLeadStatus, CrmLeadTemperature, CrmOutreachKind,
} from './types'

// fetchClient forces Content-Type: application/json, which breaks multipart.
// This helper uses raw fetch + auth, so the browser sets the boundary.
async function uploadMultipart<T>(endpoint: string, form: FormData): Promise<T> {
  const token = useAuthStore.getState().token
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`/api/admin${endpoint}`, {
    method: 'POST',
    headers,
    body: form,
  })
  if (!res.ok) {
    let message = 'Upload failed'
    try {
      const e = await res.json()
      message = e.error || e.message || message
    } catch { /* ignore */ }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

// ── Sources ───────────────────────────────────────────────
export const crmListSources = (): Promise<{ sources: CrmLeadSource[] }> =>
  fetchClient('/crm/sources')

export const crmCreateSource = (data: { key: string; label: string; kind: string; sortOrder?: number; active?: boolean }) =>
  fetchClient('/crm/sources', { method: 'POST', body: JSON.stringify(data) })

export const crmUpdateSource = (id: number, data: Partial<{ label: string; kind: string; sortOrder: number; active: boolean }>) =>
  fetchClient(`/crm/sources/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

// ── Pipelines ─────────────────────────────────────────────
export const crmListPipelines = (): Promise<{ pipelines: CrmPipeline[] }> =>
  fetchClient('/crm/pipelines')

export const crmUpdatePipeline = (id: number, data: Partial<{
  label: string
  stages: unknown[]
  defaultCurrency: string
  autoCoolDays: number
  active: boolean
  sortOrder: number
}>) =>
  fetchClient(`/crm/pipelines/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

// ── Templates ─────────────────────────────────────────────
export const crmListTemplates = (params?: { channel?: string; pipeline?: string }): Promise<{ templates: CrmOutreachTemplate[] }> => {
  const qs = new URLSearchParams()
  if (params?.channel) qs.set('channel', params.channel)
  if (params?.pipeline) qs.set('pipeline', params.pipeline)
  const q = qs.toString()
  return fetchClient(`/crm/templates${q ? `?${q}` : ''}`)
}

export const crmCreateTemplate = (data: {
  name: string
  channel: string
  subject?: string | null
  body: string
  pipelineKey?: string | null
  active?: boolean
}) => fetchClient('/crm/templates', { method: 'POST', body: JSON.stringify(data) })

export const crmUpdateTemplate = (id: number, data: Record<string, unknown>) =>
  fetchClient(`/crm/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const crmDeleteTemplate = (id: number) =>
  fetchClient(`/crm/templates/${id}`, { method: 'DELETE' })

// ── Contacts ──────────────────────────────────────────────
export const crmListContacts = (params?: {
  q?: string; owner?: string; limit?: number; offset?: number
}): Promise<{ contacts: CrmContact[]; limit: number; offset: number }> => {
  const qs = new URLSearchParams()
  if (params?.q) qs.set('q', params.q)
  if (params?.owner) qs.set('owner', params.owner)
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.offset) qs.set('offset', String(params.offset))
  const q = qs.toString()
  return fetchClient(`/crm/contacts${q ? `?${q}` : ''}`)
}

export const crmGetContact = (id: number): Promise<{ contact: CrmContact }> =>
  fetchClient(`/crm/contacts/${id}`)

export const crmCreateContact = (data: Partial<CrmContact>) =>
  fetchClient('/crm/contacts', { method: 'POST', body: JSON.stringify(data) })

export const crmUpdateContact = (id: number, data: Partial<CrmContact>) =>
  fetchClient(`/crm/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const crmDeleteContact = (id: number) =>
  fetchClient(`/crm/contacts/${id}`, { method: 'DELETE' })

// ── Leads ─────────────────────────────────────────────────
export interface CrmLeadFilters {
  pipeline?: string
  status?: CrmLeadStatus[] | string
  temperature?: CrmLeadTemperature[] | string
  source?: string[] | string
  owner?: string
  referrer?: string         // 'user:42' | 'contact:7'
  due?: 'today_or_overdue' | 'today' | 'overdue' | 'week' | 'all'
  q?: string
  limit?: number
  offset?: number
}

export const crmListLeads = (filters: CrmLeadFilters = {}): Promise<{ leads: CrmLeadListItem[]; limit: number; offset: number }> => {
  const qs = new URLSearchParams()
  if (filters.pipeline) qs.set('pipeline', filters.pipeline)
  if (filters.status) qs.set('status', Array.isArray(filters.status) ? filters.status.join(',') : filters.status)
  if (filters.temperature) qs.set('temperature', Array.isArray(filters.temperature) ? filters.temperature.join(',') : filters.temperature)
  if (filters.source) qs.set('source', Array.isArray(filters.source) ? filters.source.join(',') : filters.source)
  if (filters.owner) qs.set('owner', filters.owner)
  if (filters.referrer) qs.set('referrer', filters.referrer)
  if (filters.due) qs.set('due', filters.due)
  if (filters.q) qs.set('q', filters.q)
  if (filters.limit) qs.set('limit', String(filters.limit))
  if (filters.offset) qs.set('offset', String(filters.offset))
  const q = qs.toString()
  return fetchClient(`/crm/leads${q ? `?${q}` : ''}`)
}

export const crmGetLead = (id: number): Promise<{
  lead: CrmLead
  contact: CrmContact
  source: CrmLeadSource
  pipeline: CrmPipeline
  campaign: { id: number; name: string; categoryId: number | null } | null
  campaignCategory: { id: number; key: string; label: string; color: string | null } | null
}> => fetchClient(`/crm/leads/${id}`)

export const crmCreateLead = (data: {
  pipelineKey: string
  sourceKey: string
  title: string
  contact: { id?: number; name: string; email?: string; phone?: string; whatsapp?: string; companyName?: string }
  campaignId?: number | null
  sourceCampaignText?: string
  utmSource?: string; utmMedium?: string; utmCampaign?: string; utmTerm?: string; utmContent?: string
  landingUrl?: string
  ownerUserId?: number | null
  referrerUserId?: number | null
  referrerContactId?: number | null
  nextFollowupAt?: string | null
  value?: number | string | null
  currency?: string
  courseOrService?: string
  meta?: Record<string, unknown>
  temperature?: CrmLeadTemperature
  status?: CrmLeadStatus
}): Promise<{ lead: CrmLead; contactId: number; contactCreated: boolean }> =>
  fetchClient('/crm/leads', { method: 'POST', body: JSON.stringify(data) })

export const crmUpdateLead = (id: number, data: Partial<CrmLead>) =>
  fetchClient(`/crm/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const crmDeleteLead = (id: number) =>
  fetchClient(`/crm/leads/${id}`, { method: 'DELETE' })

export const crmAssignLead = (id: number, ownerUserId: number | null) =>
  fetchClient(`/crm/leads/${id}/assign`, { method: 'POST', body: JSON.stringify({ ownerUserId }) })

export const crmTransitionLead = (id: number, status: CrmLeadStatus, lostReason?: string) =>
  fetchClient(`/crm/leads/${id}/transition`, { method: 'POST', body: JSON.stringify({ status, lostReason }) })

export const crmSetLeadTemperature = (id: number, temperature: CrmLeadTemperature, reason?: string) =>
  fetchClient(`/crm/leads/${id}/temperature`, { method: 'POST', body: JSON.stringify({ temperature, reason }) })

// ── Outreach ──────────────────────────────────────────────
export const crmListOutreach = (leadId: number, params?: { limit?: number; offset?: number }): Promise<{ events: CrmOutreachEvent[] }> => {
  const qs = new URLSearchParams()
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.offset) qs.set('offset', String(params.offset))
  const q = qs.toString()
  return fetchClient(`/crm/leads/${leadId}/outreach${q ? `?${q}` : ''}`)
}

export const crmLogOutreach = (leadId: number, data: {
  kind: CrmOutreachKind
  body?: string | null
  occurredAt?: string
  templateId?: number | null
  durationSeconds?: number | null
  outcome?: string | null
  meta?: Record<string, unknown>
  /** Pass null to clear, or omit to leave as-is. */
  nextFollowupAt?: string | null
}): Promise<{ eventId: number; leadId: number; temperatureChanged: boolean }> =>
  fetchClient(`/crm/leads/${leadId}/outreach`, { method: 'POST', body: JSON.stringify(data) })

export const crmGetWhatsAppUrl = (leadId: number, params: { templateId?: number; customText?: string }): Promise<{ url: string; phone: string; text: string }> =>
  fetchClient(`/crm/leads/${leadId}/whatsapp-url`, { method: 'POST', body: JSON.stringify(params) })

// ── Campaign categories ───────────────────────────────────
export const crmListCampaignCategories = (): Promise<{ categories: CrmCampaignCategory[] }> =>
  fetchClient('/crm/campaign-categories')

export const crmCreateCampaignCategory = (data: { key: string; label: string; color?: string | null; sortOrder?: number; active?: boolean }): Promise<{ category: CrmCampaignCategory }> =>
  fetchClient('/crm/campaign-categories', { method: 'POST', body: JSON.stringify(data) })

export const crmUpdateCampaignCategory = (id: number, data: Partial<{ label: string; color: string | null; sortOrder: number; active: boolean }>): Promise<{ category: CrmCampaignCategory }> =>
  fetchClient(`/crm/campaign-categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const crmDeleteCampaignCategory = (id: number) =>
  fetchClient(`/crm/campaign-categories/${id}`, { method: 'DELETE' })

// ── Campaigns ─────────────────────────────────────────────
export const crmListCampaigns = (params?: { source?: string; pipeline?: string; category?: string }): Promise<{ campaigns: CrmCampaign[] }> => {
  const qs = new URLSearchParams()
  if (params?.source) qs.set('source', params.source)
  if (params?.pipeline) qs.set('pipeline', params.pipeline)
  if (params?.category) qs.set('category', params.category)
  const q = qs.toString()
  return fetchClient(`/crm/campaigns${q ? `?${q}` : ''}`)
}

export const crmCreateCampaign = (data: Partial<CrmCampaign> & { name: string; sourceKey?: string; pipelineKey?: string | null; categoryKey?: string | null }) =>
  fetchClient('/crm/campaigns', { method: 'POST', body: JSON.stringify(data) })

export const crmUpdateCampaign = (id: number, data: Partial<CrmCampaign> & { sourceKey?: string; pipelineKey?: string | null; categoryKey?: string | null }) =>
  fetchClient(`/crm/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(data) })

export const crmDeleteCampaign = (id: number) =>
  fetchClient(`/crm/campaigns/${id}`, { method: 'DELETE' })

// ── Campaign recharges (top-ups) ───────────────────────────
export const crmListCampaignRecharges = (campaignId: number): Promise<{ recharges: CrmCampaignRecharge[]; total: { amount: string; count: number } }> =>
  fetchClient(`/crm/campaigns/${campaignId}/recharges`)

export const crmCreateCampaignRecharge = (
  campaignId: number,
  data: { amount: number | string; currency?: string; rechargedAt?: string; note?: string | null },
): Promise<{ recharge: CrmCampaignRecharge }> =>
  fetchClient(`/crm/campaigns/${campaignId}/recharges`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const crmUpdateCampaignRecharge = (
  campaignId: number,
  rechargeId: number,
  data: Partial<{ amount: number | string; currency: string; rechargedAt: string; note: string | null }>,
): Promise<{ recharge: CrmCampaignRecharge }> =>
  fetchClient(`/crm/campaigns/${campaignId}/recharges/${rechargeId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const crmDeleteCampaignRecharge = (campaignId: number, rechargeId: number) =>
  fetchClient(`/crm/campaigns/${campaignId}/recharges/${rechargeId}`, { method: 'DELETE' })

// ── Campaign media (files + links) ────────────────────────
export const crmListCampaignMedia = (campaignId: number): Promise<{ media: CrmCampaignMedia[] }> =>
  fetchClient(`/crm/campaigns/${campaignId}/media`)

export const crmUploadCampaignFile = (
  campaignId: number,
  file: File,
  caption?: string,
): Promise<{ media: CrmCampaignMedia }> => {
  const form = new FormData()
  form.append('file', file)
  if (caption) form.append('caption', caption)
  return uploadMultipart(`/crm/campaigns/${campaignId}/media`, form)
}

export const crmAddCampaignLink = (
  campaignId: number,
  data: { url: string; caption?: string | null },
): Promise<{ media: CrmCampaignMedia }> =>
  fetchClient(`/crm/campaigns/${campaignId}/media/link`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const crmUpdateCampaignMedia = (
  campaignId: number,
  mediaId: number,
  data: { caption: string | null },
): Promise<{ media: CrmCampaignMedia }> =>
  fetchClient(`/crm/campaigns/${campaignId}/media/${mediaId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const crmDeleteCampaignMedia = (campaignId: number, mediaId: number) =>
  fetchClient(`/crm/campaigns/${campaignId}/media/${mediaId}`, { method: 'DELETE' })

// ── CRM settings (limits etc.) ─────────────────────────────
export const crmGetMediaLimits = (): Promise<CrmMediaLimits> =>
  fetchClient('/crm/settings/media-limits')

export const crmSaveMediaLimits = (data: Partial<{ maxMb: number; allowedMime: string[] }>): Promise<CrmMediaLimits> =>
  fetchClient('/crm/settings/media-limits', {
    method: 'PUT',
    body: JSON.stringify(data),
  })

// ── Campaign reports (CSV/Excel ad reports) ────────────────
export const crmListCampaignReportRows = (campaignId: number): Promise<{ rows: CrmCampaignReportRow[]; byDay: CrmCampaignReportDayAgg[] }> =>
  fetchClient(`/crm/campaigns/${campaignId}/reports/rows`)

export const crmListCampaignReportImports = (campaignId: number): Promise<{ imports: CrmCampaignReportImport[] }> =>
  fetchClient(`/crm/campaigns/${campaignId}/reports/imports`)

export interface CrmReportUploadResult {
  import: CrmCampaignReportImport
  parsed: { format: 'meta' | 'google' | 'unknown'; rows: number; totalRowsInSheet: number; warnings: string[] }
  upserted: { inserted: number; replaced: number }
}
export const crmUploadCampaignReport = (campaignId: number, file: File): Promise<CrmReportUploadResult> => {
  const form = new FormData()
  form.append('file', file)
  return uploadMultipart(`/crm/campaigns/${campaignId}/reports`, form)
}

export const crmDeleteCampaignReportImport = (campaignId: number, importId: number) =>
  fetchClient(`/crm/campaigns/${campaignId}/reports/imports/${importId}`, { method: 'DELETE' })

// ── Campaign AI insights ───────────────────────────────────
export const crmListCampaignInsights = (campaignId: number): Promise<{ insights: CrmCampaignInsight[] }> =>
  fetchClient(`/crm/campaigns/${campaignId}/insights`)

export const crmAnalyzeCampaign = (campaignId: number): Promise<CrmCampaignAnalyzeResult> =>
  fetchClient(`/crm/campaigns/${campaignId}/insights/analyze`, { method: 'POST' })

// ── Reports ───────────────────────────────────────────────
const buildReportQs = (params?: { pipeline?: string; from?: string; to?: string }) => {
  const qs = new URLSearchParams()
  if (params?.pipeline) qs.set('pipeline', params.pipeline)
  if (params?.from) qs.set('from', params.from)
  if (params?.to) qs.set('to', params.to)
  const q = qs.toString()
  return q ? `?${q}` : ''
}

export const crmReportFunnel = (params?: { pipeline?: string; from?: string; to?: string }): Promise<CrmFunnelReport> =>
  fetchClient(`/crm/reports/funnel${buildReportQs(params)}`)

export const crmReportSourceRoi = (params?: { pipeline?: string; from?: string; to?: string }): Promise<{ rows: CrmSourceRoiRow[] }> =>
  fetchClient(`/crm/reports/source-roi${buildReportQs(params)}`)

export const crmReportOwnerLeaderboard = (params?: { pipeline?: string; from?: string; to?: string }): Promise<{ rows: CrmOwnerRow[] }> =>
  fetchClient(`/crm/reports/owner-leaderboard${buildReportQs(params)}`)

export const crmReportReferrerLeaderboard = (params?: { pipeline?: string; from?: string; to?: string }): Promise<CrmReferrerLeaderboard> =>
  fetchClient(`/crm/reports/referrer-leaderboard${buildReportQs(params)}`)

export const crmReportOverview = (params?: { pipeline?: string }): Promise<CrmOverviewKpis> =>
  fetchClient(`/crm/reports/overview${buildReportQs(params)}`)

// ── Internal ─────────────────────────────────────────────
export const crmRunAutoCool = () =>
  fetchClient('/crm/internal/run-auto-cool', { method: 'POST' })
