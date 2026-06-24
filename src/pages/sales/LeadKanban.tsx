import { useState } from 'react'
import { toast } from 'sonner'
import { LeadCard } from './components/LeadCard'
import { crmTransitionLead } from '@/lib/crm/client'
import { CRM_LEAD_STATUSES, type CrmLeadListItem, type CrmLeadStatus } from '@/lib/crm/types'
import { statusLabel } from '@/lib/crm/format'
import { prompt } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'

interface Props {
  leads: CrmLeadListItem[]
  onChanged: () => void
}

export function LeadKanban({ leads, onChanged }: Props) {
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [hoverCol, setHoverCol] = useState<CrmLeadStatus | null>(null)

  const buckets: Record<CrmLeadStatus, CrmLeadListItem[]> = {
    new: [], contacted: [], qualified: [], negotiating: [], won: [], lost: [], on_followup: [], dropped: [],
  }
  for (const l of leads) buckets[l.status]?.push(l)

  const handleDrop = async (status: CrmLeadStatus) => {
    setHoverCol(null)
    if (draggingId == null) return
    const lead = leads.find((l) => l.id === draggingId)
    setDraggingId(null)
    if (!lead || lead.status === status) return
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
      if (r === null) return // cancelled
      lostReason = r || undefined
    }
    try {
      await crmTransitionLead(lead.id, status, lostReason)
      toast.success(`${lead.title} → ${statusLabel(status)}`)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transition failed')
    }
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
      {CRM_LEAD_STATUSES.map((s) => (
        <div
          key={s}
          onDragOver={(e) => { e.preventDefault(); setHoverCol(s) }}
          onDragLeave={() => setHoverCol((c) => (c === s ? null : c))}
          onDrop={() => handleDrop(s)}
          className={cn(
            'flex-1 min-w-[260px] rounded-lg border bg-muted/30 flex flex-col',
            hoverCol === s && 'ring-2 ring-primary/60 bg-primary/5',
          )}
        >
          <div className="px-3 py-2 border-b flex items-center justify-between sticky top-0 bg-muted/30 backdrop-blur z-[1]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide">{statusLabel(s)}</span>
              <span className="text-[11px] text-muted-foreground">{buckets[s].length}</span>
            </div>
          </div>
          <div className="flex-1 p-2 space-y-2 min-h-[120px]">
            {buckets[s].length === 0 ? (
              <div className="text-[11px] text-muted-foreground/60 text-center py-6 italic">drop here</div>
            ) : null}
            {buckets[s].map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onDragStart={(id) => setDraggingId(id)}
                isDragging={draggingId === lead.id}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
