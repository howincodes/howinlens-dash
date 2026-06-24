import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ChevronLeft, Pencil, Calendar, TrendingUp, Banknote, Users2, Target,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { TileSkeleton } from '@/components/ui/skeleton'
import {
  crmListCampaigns, crmListLeads, crmReportFunnel, crmUpdateCampaign,
} from '@/lib/crm/client'
import {
  fmtMoney, fmtDateShort, statusColor, statusLabel,
} from '@/lib/crm/format'
import type { CrmCampaign, CrmLeadListItem } from '@/lib/crm/types'
import { CRM_LEAD_STATUSES } from '@/lib/crm/types'
import { TemperatureBadge } from './components/TemperatureBadge'
import { Avatar } from '@/components/ui/user-picker'
import { confirm } from '@/components/ui/confirm-dialog'
import { crmDeleteCampaign } from '@/lib/crm/client'
import { useNavigate } from 'react-router-dom'
import { CampaignRechargesSection } from './components/CampaignRechargesSection'
import { CampaignMediaSection } from './components/CampaignMediaSection'
import { CampaignReportsSection } from './components/CampaignReportsSection'
import { CampaignInsightsSection } from './components/CampaignInsightsSection'

export default function CampaignDetail() {
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState<CrmCampaign | null>(null)
  const [leads, setLeads] = useState<CrmLeadListItem[]>([])
  const [funnel, setFunnel] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingSpend, setEditingSpend] = useState(false)
  const [spendDraft, setSpendDraft] = useState('')
  const [reportRowCount, setReportRowCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      crmListCampaigns(),
      crmListLeads({ limit: 500 }),
      crmReportFunnel(),
    ])
      .then(([cRes, lRes, fRes]) => {
        if (cancelled) return
        const c = cRes.campaigns.find((x) => x.id === id) ?? null
        setCampaign(c)
        const lf = lRes.leads.filter((l) => l.campaignId === id)
        setLeads(lf)
        // Build a per-status count from filtered leads
        const counts: Record<string, number> = {}
        for (const s of CRM_LEAD_STATUSES) counts[s] = 0
        for (const l of lf) counts[l.status] = (counts[l.status] ?? 0) + 1
        setFunnel(counts)
        if (c) setSpendDraft(c.spend ?? '0')
        void fRes
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  const saveSpend = async () => {
    if (!campaign) return
    try {
      await crmUpdateCampaign(campaign.id, { spend: spendDraft || '0' } as never)
      toast.success('Spend updated')
      setEditingSpend(false)
      // refetch
      const r = await crmListCampaigns()
      setCampaign(r.campaigns.find((x) => x.id === id) ?? null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  }

  const remove = async () => {
    if (!campaign) return
    const ok = await confirm({
      title: `Delete "${campaign.name}"?`,
      description: 'Soft-deleted — historical lead attribution preserved.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    try {
      await crmDeleteCampaign(campaign.id)
      toast.success('Campaign deleted')
      navigate('/sales/campaigns')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  }

  if (loading && !campaign) {
    return (
      <div className="space-y-3">
        <Link to="/sales/campaigns" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Back to campaigns
        </Link>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <TileSkeleton /><TileSkeleton /><TileSkeleton /><TileSkeleton />
        </div>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="space-y-3">
        <Link to="/sales/campaigns" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Back to campaigns
        </Link>
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600">
          {error ?? 'Campaign not found'}
        </div>
      </div>
    )
  }

  const wonValue = Number(campaign.wonValue || 0)
  const spend = Number(campaign.spend || 0)
  const budget = Number(campaign.budget || 0)
  const totalRecharged = Number(campaign.totalRecharged || 0)
  const roi = spend > 0 ? wonValue / spend : null
  const cpa = campaign.wonCount > 0 ? spend / campaign.wonCount : null
  const cpl = campaign.leadsCount > 0 ? spend / campaign.leadsCount : null
  // Spend coverage prefers actual recharges over the planning `budget` field;
  // recharges represent money actually put in. Falls back to budget if no
  // recharges have been logged yet.
  const coverageDenominator = totalRecharged > 0 ? totalRecharged : budget
  const budgetUsed = coverageDenominator > 0 ? (spend / coverageDenominator) * 100 : 0
  const coverageLabel = totalRecharged > 0 ? 'of recharges' : 'of budget'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/sales/campaigns" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Back to campaigns
        </Link>
        <Button variant="ghost" size="sm" onClick={remove} className="text-rose-600 hover:bg-rose-500/10">Delete</Button>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          {campaign.categoryLabel ? (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs"
              style={campaign.categoryColor
                ? { borderColor: campaign.categoryColor + '66', color: campaign.categoryColor }
                : undefined}
            >
              {campaign.categoryColor ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: campaign.categoryColor }} /> : null}
              {campaign.categoryLabel}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
          {campaign.sourceLabel ? <span>Source: <span className="text-foreground font-medium">{campaign.sourceLabel}</span></span> : null}
          {campaign.pipelineKey ? <span>Pipeline: <span className="text-foreground font-medium">{campaign.pipelineKey}</span></span> : null}
          {campaign.startedAt ? <span><Calendar className="h-3 w-3 inline mr-0.5" />{fmtDateShort(campaign.startedAt)} →</span> : null}
          {campaign.endedAt ? <span>{fmtDateShort(campaign.endedAt)}</span> : null}
        </div>
        {campaign.notes ? <p className="text-sm text-muted-foreground italic mt-3 whitespace-pre-wrap">{campaign.notes}</p> : null}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Leads" value={campaign.leadsCount} icon={Users2} />
        <Tile label="Won" value={`${campaign.wonCount} · ${fmtMoney(wonValue)}`} icon={TrendingUp} tone="green" />
        <Tile
          label="Spend"
          icon={Banknote}
          tone="amber"
          value={
            editingSpend ? (
              <span className="inline-flex items-center gap-1">
                <input type="number" value={spendDraft} onChange={(e) => setSpendDraft(e.target.value)} onBlur={saveSpend} onKeyDown={(e) => { if (e.key === 'Enter') saveSpend() }} className="w-24 h-7 rounded border bg-background px-2 text-base font-mono" autoFocus />
              </span>
            ) : (
              <button onClick={() => setEditingSpend(true)} className="hover:bg-muted px-1 rounded inline-flex items-center gap-1">
                {fmtMoney(spend)} <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
            )
          }
          hint={
            reportRowCount > 0
              ? `Auto-synced from ${reportRowCount} report row${reportRowCount > 1 ? 's' : ''} — manual edits get overwritten on next CSV import`
              : coverageDenominator ? `${budgetUsed.toFixed(0)}% ${coverageLabel} ${fmtMoney(coverageDenominator)}` : undefined
          }
        />
        <Tile label="ROI" value={roi == null ? '—' : `${roi.toFixed(1)}×`} icon={Target} tone={roi && roi >= 1 ? 'green' : 'rose'} hint={cpl != null ? `CPL ${fmtMoney(cpl)} · CPA ${fmtMoney(cpa)}` : undefined} />
      </div>

      {/* AI Insights — top of the analytics stack so users see it first */}
      <CampaignInsightsSection campaignId={campaign.id} />

      {/* Recharges */}
      <CampaignRechargesSection campaignId={campaign.id} />

      {/* Reports */}
      <CampaignReportsSection campaignId={campaign.id} onRowCountChange={setReportRowCount} />

      {/* Media */}
      <CampaignMediaSection campaignId={campaign.id} />


      {/* Funnel breakdown */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Funnel from this campaign</h2>
        {funnel && Object.values(funnel).some((v) => v > 0) ? (
          <ul className="space-y-1.5">
            {CRM_LEAD_STATUSES.map((s) => {
              const count = funnel[s] ?? 0
              const total = leads.length || 1
              const pct = (count / total) * 100
              return (
                <li key={s} className="grid grid-cols-[120px_1fr_50px] items-center gap-2 text-sm">
                  <span>{statusLabel(s)}</span>
                  <div className="h-5 bg-muted rounded relative overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${Math.max(2, pct)}%` }} />
                    <span className="absolute inset-0 flex items-center px-2 text-xs font-mono">{count}</span>
                  </div>
                  <span className="text-xs text-muted-foreground text-right">{pct.toFixed(0)}%</span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">No leads attributed to this campaign yet.</p>
        )}
      </div>

      {/* Leads list */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attributed leads ({leads.length})</h2>
        </div>
        {leads.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground italic">No leads yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Contact</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Temp</th>
                <th className="px-3 py-2 font-medium text-right">Value</th>
                <th className="px-3 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-muted/40">
                  <td className="px-3 py-2"><Link to={`/sales/leads/${l.id}`} className="font-medium hover:text-primary">{l.title}</Link></td>
                  <td className="px-3 py-2 text-xs"><span className="inline-flex items-center gap-1.5"><Avatar name={l.contactName} size="sm" />{l.contactName}</span></td>
                  <td className="px-3 py-2 text-xs"><span className={`inline-block px-2 py-0.5 rounded-full border ${statusColor(l.status)}`}>{statusLabel(l.status)}</span></td>
                  <td className="px-3 py-2"><TemperatureBadge value={l.temperature} size="sm" showLabel={false} /></td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{fmtMoney(l.value, l.currency)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDateShort(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Tile({ label, value, icon: Icon, tone, hint }: { label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>; tone?: 'green' | 'rose' | 'amber' | 'blue'; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <Icon className={`h-4 w-4 ${tone === 'green' ? 'text-green-500' : tone === 'rose' ? 'text-rose-500' : tone === 'amber' ? 'text-amber-500' : tone === 'blue' ? 'text-blue-500' : 'text-muted-foreground'}`} />
      </div>
      <div className="text-2xl font-bold font-mono">{value}</div>
      {hint ? <div className="text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  )
}
