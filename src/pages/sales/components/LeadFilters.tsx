import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { CrmLeadFilters } from '@/lib/crm/client'
import type { CrmPipeline, CrmLeadSource } from '@/lib/crm/types'
import { CRM_LEAD_STATUSES, CRM_LEAD_TEMPERATURES, type CrmLeadStatus, type CrmLeadTemperature } from '@/lib/crm/types'
import { statusLabel, tempLabel } from '@/lib/crm/format'
import { UserPicker } from '@/components/ui/user-picker'
import { cn } from '@/lib/utils'

interface Props {
  pipelines: CrmPipeline[]
  sources: CrmLeadSource[]
  filters: CrmLeadFilters
  onChange: (next: CrmLeadFilters) => void
}

const DUE_OPTIONS: Array<{ key: CrmLeadFilters['due']; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'today_or_overdue', label: 'Due now' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
]

export function LeadFilters({ pipelines, sources, filters, onChange }: Props) {
  const update = (patch: Partial<CrmLeadFilters>) => onChange({ ...filters, ...patch, offset: 0 })

  const toggleArr = <T extends string>(arr: T[] | undefined, value: T): T[] => {
    const set = new Set(arr ?? [])
    if (set.has(value)) set.delete(value)
    else set.add(value)
    return Array.from(set)
  }

  const statuses: CrmLeadStatus[] = Array.isArray(filters.status) ? filters.status as CrmLeadStatus[] : []
  const temps: CrmLeadTemperature[] = Array.isArray(filters.temperature) ? filters.temperature as CrmLeadTemperature[] : []
  const sourceKeys: string[] = Array.isArray(filters.source) ? (filters.source as string[]) : []

  // Debounced search input
  const [qLocal, setQLocal] = useState(filters.q ?? '')
  useEffect(() => { setQLocal(filters.q ?? '') }, [filters.q])
  useEffect(() => {
    if ((filters.q ?? '') === qLocal) return
    const t = setTimeout(() => update({ q: qLocal || undefined }), 300)
    return () => clearTimeout(t)
  }, [qLocal]) // eslint-disable-line react-hooks/exhaustive-deps

  // Owner filter
  const ownerNum = filters.owner && /^\d+$/.test(filters.owner) ? Number(filters.owner) : null

  const activeFilterCount =
    (filters.q ? 1 : 0) +
    (filters.due ? 1 : 0) +
    (statuses.length > 0 ? 1 : 0) +
    (temps.length > 0 ? 1 : 0) +
    (sourceKeys.length > 0 ? 1 : 0) +
    (filters.owner ? 1 : 0) +
    (filters.referrer ? 1 : 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Pipeline */}
        <select
          value={filters.pipeline ?? ''}
          onChange={(e) => update({ pipeline: e.target.value || undefined })}
          className="h-8 px-2 rounded-md border bg-background text-sm"
        >
          <option value="">All pipelines</option>
          {pipelines.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>

        {/* Owner */}
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          Owner:
          <UserPicker
            value={ownerNum}
            onChange={(uid) => update({ owner: uid != null ? String(uid) : undefined })}
            size="sm"
            placeholder="Anyone"
          />
        </span>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search title, contact, phone…"
            value={qLocal}
            onChange={(e) => setQLocal(e.target.value)}
            className="w-full h-8 pl-7 pr-2 rounded-md border bg-background text-sm"
          />
        </div>

        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={() =>
              onChange({
                pipeline: filters.pipeline,
                limit: filters.limit,
                offset: 0,
              })
            }
            className="h-8 px-2 rounded-md border bg-background text-xs text-muted-foreground hover:bg-muted inline-flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Clear filters ({activeFilterCount})
          </button>
        ) : null}
      </div>

      {/* Due preset chips */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[11px] text-muted-foreground self-center mr-1">Due:</span>
        {DUE_OPTIONS.map((d) => (
          <button
            key={d.key ?? 'all'}
            type="button"
            onClick={() => update({ due: d.key === 'all' ? undefined : d.key })}
            className={cn(
              'h-7 px-2.5 rounded-full text-xs border transition-colors',
              (d.key === 'all' && !filters.due) || filters.due === d.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-muted',
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[11px] text-muted-foreground self-center mr-1">Status:</span>
        {CRM_LEAD_STATUSES.map((s) => {
          const active = statuses.includes(s)
          return (
            <button
              key={s}
              type="button"
              onClick={() => update({ status: toggleArr(statuses, s) })}
              className={cn(
                'h-7 px-2.5 rounded-full text-xs border transition-colors',
                active
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted',
              )}
            >
              {statusLabel(s)}
            </button>
          )
        })}
      </div>

      {/* Temperature chips */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[11px] text-muted-foreground self-center mr-1">Temp:</span>
        {CRM_LEAD_TEMPERATURES.map((t) => {
          const active = temps.includes(t)
          return (
            <button
              key={t}
              type="button"
              onClick={() => update({ temperature: toggleArr(temps, t) })}
              className={cn(
                'h-7 px-2.5 rounded-full text-xs border transition-colors',
                active
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted',
              )}
            >
              {tempLabel(t)}
            </button>
          )
        })}
      </div>

      {/* Source chips — only active sources */}
      {sources.filter((s) => s.active).length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] text-muted-foreground self-center mr-1">Source:</span>
          {sources.filter((s) => s.active).map((s) => {
            const active = sourceKeys.includes(s.key)
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => update({ source: toggleArr(sourceKeys, s.key) })}
                className={cn(
                  'h-7 px-2.5 rounded-full text-xs border transition-colors',
                  active
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted',
                )}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
