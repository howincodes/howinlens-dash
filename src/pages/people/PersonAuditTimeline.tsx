import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuditLog } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, RefreshCw, ScrollText, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format } from 'date-fns'

const FETCH_LIMIT = 200

const EVENT_TONE: Record<string, string> = {
  SessionStart: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  UserPromptSubmit: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  Stop: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  SessionEnd: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  PreToolUse: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  PostToolUse: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  ConfigChange: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  FileChanged: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  SubagentStart: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
}

function formatPayload(payload: unknown): string {
  if (!payload) return ''
  try {
    if (typeof payload === 'string') {
      const parsed = JSON.parse(payload)
      return JSON.stringify(parsed, null, 2)
    }
    return JSON.stringify(payload, null, 2)
  } catch {
    return String(payload)
  }
}

function truncatePayload(payload: unknown, max = 120): string {
  if (!payload) return ''
  try {
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload)
    return str.length > max ? str.slice(0, max) + '…' : str
  } catch {
    return String(payload)
  }
}

interface PersonAuditTimelineProps {
  personId: string | number
}

export default function PersonAuditTimeline({ personId }: PersonAuditTimelineProps) {
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getAuditLog({ limit: String(FETCH_LIMIT) })
      const all: any[] = res?.data || res?.entries || []
      const mine = all.filter(
        (e: any) => String(e.user_id ?? e.userId ?? '') === String(personId),
      )
      setEntries(mine)
    } catch (_err) {
      setError('Could not load audit events.')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId])

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6 text-center border-dashed">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={load}>
          <RefreshCw className="w-3.5 h-3.5 mr-2" />
          Retry
        </Button>
      </Card>
    )
  }

  if (entries.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <ScrollText className="w-8 h-8 mx-auto mb-3 text-muted-foreground/60" />
        <h3 className="text-sm font-semibold">No audit events yet</h3>
        <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
          The last {FETCH_LIMIT} system events contain nothing for this
          person. Once they generate prompts, sessions, or admin actions,
          they'll appear here.
        </p>
        <div className="mt-4">
          <Link to="/settings/audit">
            <Button variant="outline" size="sm">
              Open the global audit log
            </Button>
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{entries.length}</span> event
          {entries.length === 1 ? '' : 's'} from the last {FETCH_LIMIT} hook
          events. Newest first.
        </p>
        <Button variant="ghost" size="sm" onClick={load} className="text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      <Card className="divide-y overflow-hidden">
        {entries.map((entry: any, idx: number) => {
          const key = String(entry.id ?? `${entry.created_at}-${idx}`)
          const isOpen = expanded.has(key)
          const event = String(entry.event_type || 'unknown')
          const tone = EVENT_TONE[event] || 'bg-muted text-muted-foreground border-border'
          const ts = entry.created_at
            ? new Date(
                String(entry.created_at).endsWith('Z')
                  ? entry.created_at
                  : entry.created_at + 'Z',
              )
            : null
          const detailStr = formatPayload(entry.payload)
          const detailHasContent = detailStr && detailStr !== '""' && detailStr !== '{}'

          return (
            <div key={key} className="px-4 py-3 hover:bg-muted/30 transition-colors">
              <button
                type="button"
                onClick={() => detailHasContent && toggle(key)}
                className={cn(
                  'w-full flex items-start gap-3 text-left',
                  detailHasContent ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                <div className="mt-0.5 text-muted-foreground/60 shrink-0">
                  {detailHasContent ? (
                    isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )
                  ) : (
                    <span className="w-3.5 h-3.5 inline-block" />
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'font-mono text-[10px] shrink-0 border',
                    tone,
                  )}
                >
                  {event}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground truncate">
                    {entry.session_id ? (
                      <>
                        <span className="font-mono">{entry.session_id}</span>
                        <span className="mx-1.5">·</span>
                      </>
                    ) : null}
                    {detailHasContent ? (
                      <span className="font-mono">{truncatePayload(entry.payload)}</span>
                    ) : (
                      <span className="italic">no payload</span>
                    )}
                  </div>
                </div>
                <div
                  className="text-xs text-muted-foreground/80 shrink-0 tabular-nums"
                  title={ts ? format(ts, 'MMM d, yyyy HH:mm:ss') : undefined}
                >
                  {ts ? formatDistanceToNow(ts, { addSuffix: true }) : '-'}
                </div>
              </button>
              {isOpen && detailHasContent ? (
                <pre className="mt-3 ml-6 max-h-72 overflow-auto rounded-md bg-muted/40 p-3 text-[11px] font-mono whitespace-pre-wrap break-words">
                  {detailStr}
                </pre>
              ) : null}
            </div>
          )
        })}
      </Card>
    </div>
  )
}
