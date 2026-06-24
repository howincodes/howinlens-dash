// CRM v1 — shared types for dashboard

export type CrmLeadStatus =
  | 'new' | 'contacted' | 'qualified' | 'negotiating'
  | 'won' | 'lost' | 'on_followup' | 'dropped'

export type CrmLeadTemperature = 'hot' | 'warm' | 'cold' | 'dead'

export type CrmOutreachKind =
  | 'note' | 'call' | 'whatsapp' | 'email' | 'meeting' | 'sms'
  | 'status_change' | 'temperature_change' | 'assignment' | 'source_change'

export type CrmSourceKind = 'ad' | 'referral' | 'inbound' | 'offline' | 'other'

export type CrmTemplateChannel = 'whatsapp' | 'email' | 'sms' | 'note'

export const CRM_LEAD_STATUSES: CrmLeadStatus[] = [
  'new', 'contacted', 'qualified', 'negotiating', 'won', 'lost', 'on_followup', 'dropped',
]

export const CRM_LEAD_TEMPERATURES: CrmLeadTemperature[] = ['hot', 'warm', 'cold', 'dead']

export const CRM_OPEN_STATUSES: CrmLeadStatus[] = [
  'new', 'contacted', 'qualified', 'negotiating', 'on_followup',
]

export interface CrmPipelineStage {
  key: string
  label: string
  sort: number
  color?: string
}

export interface CrmPipeline {
  id: number
  key: string
  label: string
  stages: CrmPipelineStage[]
  defaultCurrency: string
  autoCoolDays: number
  active: boolean
  sortOrder: number
}

export interface CrmLeadSource {
  id: number
  key: string
  label: string
  kind: CrmSourceKind
  active: boolean
  sortOrder: number
}

export interface CrmContact {
  id: number
  name: string
  email: string | null
  phone: string | null
  whatsapp: string | null
  companyName: string | null
  notes: string | null
  ownerUserId: number | null
  ownerName?: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
  leadsCount?: number
  wonCount?: number
  lastContactedAt?: string | null
}

export interface CrmLeadListItem {
  id: number
  title: string
  status: CrmLeadStatus
  temperature: CrmLeadTemperature
  value: string | null
  currency: string
  pipelineId: number
  pipelineKey: string
  contactId: number
  contactName: string
  contactPhone: string | null
  contactEmail: string | null
  sourceId: number
  sourceKey: string
  sourceLabel: string
  sourceKind: CrmSourceKind
  campaignId: number | null
  ownerUserId: number | null
  ownerName: string | null
  referrerUserId: number | null
  referrerContactId: number | null
  nextFollowupAt: string | null
  lastContactedAt: string | null
  wonAt: string | null
  lostAt: string | null
  lostReason: string | null
  courseOrService: string | null
  createdAt: string
  updatedAt: string
}

export interface CrmLead extends CrmLeadListItem {
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
  landingUrl: string | null
  sourceCampaignText: string | null
  meta: Record<string, unknown>
}

export interface CrmOutreachEvent {
  id: number
  leadId: number
  kind: CrmOutreachKind
  body: string | null
  occurredAt: string
  byUserId: number | null
  byUserName: string | null
  templateId: number | null
  durationSeconds: number | null
  outcome: string | null
  meta: Record<string, unknown>
  createdAt: string
}

export interface CrmOutreachTemplate {
  id: number
  name: string
  channel: CrmTemplateChannel
  subject: string | null
  body: string
  variables: string[]
  pipelineId: number | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CrmCampaign {
  id: number
  name: string
  categoryId: number | null
  categoryKey: string | null
  categoryLabel: string | null
  categoryColor: string | null
  sourceId: number | null
  sourceKey: string | null
  sourceLabel: string | null
  pipelineId: number | null
  pipelineKey: string | null
  startedAt: string | null
  endedAt: string | null
  budget: string | null
  spend: string
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  notes: string | null
  createdAt: string
  leadsCount: number
  wonCount: number
  wonValue: string
  totalRecharged: string
  /** Latest AI verdict if the campaign has been analyzed at least once. */
  latestVerdict: {
    verdict: 'winning' | 'break_even' | 'losing' | 'unclear'
    headline: string
    generatedAt: string
  } | null
}

export interface CrmCampaignMedia {
  id: number
  type: 'file' | 'link'
  filename: string | null
  originalName: string | null
  mimeType: string | null
  sizeBytes: number | null
  url: string | null
  caption: string | null
  byUserId: number | null
  byUserName: string | null
  createdAt: string
  downloadUrl: string | null
}

export interface CrmCampaignReportImport {
  id: number
  filename: string
  sizeBytes: number | null
  format: 'meta' | 'google' | 'unknown'
  rowCount: number
  error: string | null
  byUserId: number | null
  byUserName: string | null
  createdAt: string
}

export interface CrmCampaignReportRow {
  id: number
  campaignId: number
  importId: number | null
  reportDate: string
  adName: string
  format: 'meta' | 'google' | 'unknown'
  reach: number | null
  impressions: number | null
  clicks: number | null
  spend: string | null
  currency: string | null
  results: number | null
  costPerResult: string | null
  ctr: string | null
}

export interface CrmCampaignReportDayAgg {
  day: string
  spend: string
  impressions: number
  clicks: number
  results: number
  reach: number
  count: number
}

export interface CrmCampaignInsightAction {
  priority: 'high' | 'medium' | 'low'
  action: string
}

export interface CrmCampaignInsightLeadQuality {
  trend: 'up' | 'flat' | 'down' | 'unknown'
  note: string
}

export interface CrmCampaignInsightSpendVsResults {
  summary: string
  spikes: { date: string; note: string }[]
}

export interface CrmCampaignInsight {
  id: number
  verdict: 'winning' | 'break_even' | 'losing' | 'unclear'
  headline: string
  reasoning: string
  leadQuality: CrmCampaignInsightLeadQuality
  spendVsResults: CrmCampaignInsightSpendVsResults
  actions: CrmCampaignInsightAction[]
  model: string | null
  provider: string | null
  fallbackHops: number | null
  durationMs: number | null
  costUsd: string | null
  generatedByUserId: number | null
  generatedByName: string | null
  generatedAt: string
}

export interface CrmCampaignAnalyzeResult {
  insightId: number
  data: {
    verdict: CrmCampaignInsight['verdict']
    headline: string
    reasoning: string
    leadQuality: CrmCampaignInsightLeadQuality
    spendVsResults: CrmCampaignInsightSpendVsResults
    actions: CrmCampaignInsightAction[]
  }
  provider: string
  model: string
  fallbackHops: number
  durationMs: number
  costUsd: number | null
  traceId: string | null
}

export interface CrmMediaLimits {
  maxMb: number
  allowedMime: string[]
  knownMime: string[]
}

export interface CrmCampaignRecharge {
  id: number
  amount: string
  currency: string
  rechargedAt: string
  note: string | null
  byUserId: number | null
  byUserName: string | null
  createdAt: string
}

export interface CrmCampaignCategory {
  id: number
  key: string
  label: string
  color: string | null
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CrmFunnelReport {
  counts: Record<CrmLeadStatus, number>
  total: number
}

export interface CrmSourceRoiRow {
  sourceId: number
  sourceKey: string
  sourceLabel: string
  sourceKind: CrmSourceKind
  leadsCount: number
  wonCount: number
  wonValue: number
  spend: number
  roi: number | null
}

export interface CrmOwnerRow {
  ownerUserId: number | null
  ownerName: string
  leadsCount: number
  openCount: number
  wonCount: number
  lostCount: number
  wonValue: number
  winRate: number
}

export interface CrmReferrerRow {
  referrerUserId?: number | null
  referrerContactId?: number | null
  name: string
  leadsCount: number
  wonCount: number
  wonValue: number
  winRate: number
}

export interface CrmReferrerLeaderboard {
  internal: CrmReferrerRow[]
  external: CrmReferrerRow[]
}

export interface CrmOverviewKpis {
  dueToday: number
  newThisWeek: number
  wonThisMonth: { count: number; value: number }
  lostThisMonth: number
  hotLeads: number
  bySource: Array<{ key: string; label: string; count: number }>
  byOwner: Array<{ ownerUserId: number | null; ownerName: string; count: number }>
}
