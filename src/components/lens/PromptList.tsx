import { useEffect, useState, useCallback, Fragment } from 'react'
import { Loader2, Search, ChevronLeft, ChevronRight, Monitor, FolderGit2 } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { PromptRow, PromptListResponse, PromptFilters } from '@/lib/api'

interface Props {
  /** Paginated list fetcher (admin feed, per-person, or self). */
  list: (f: PromptFilters) => Promise<PromptListResponse>
  /** Single-prompt fetcher for the expanded full text. */
  detail: (id: number) => Promise<{ data: PromptRow }>
  /** Show the "User" column (team feed only). */
  showUser?: boolean
  /** Show the search/model filter bar. */
  showFilters?: boolean
  pageSize?: number
  emptyHint?: string
}

function fmtTime(iso: string): string {
  try { return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return iso }
}

function shortModel(m: string | null): string {
  if (!m) return '—'
  return m.replace(/^claude-/, '').replace(/-\d{8}$/, '')
}

export default function PromptList({ list, detail, showUser, showFilters, pageSize = 50, emptyHint }: Props) {
  const [rows, setRows] = useState<PromptRow[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // filter inputs (applied) vs draft (typing)
  const [q, setQ] = useState('')
  const [model, setModel] = useState('')
  const [qDraft, setQDraft] = useState('')
  const [modelDraft, setModelDraft] = useState('')

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [expandedText, setExpandedText] = useState<string>('')
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    list({ limit: pageSize, offset, q: q || undefined, model: model || undefined })
      .then((res) => {
        if (cancelled) return
        setRows(res.data)
        setTotal(res.total)
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load prompts') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [list, pageSize, offset, q, model])

  useEffect(() => load(), [load])

  function applyFilters(e: React.FormEvent) {
    e.preventDefault()
    setOffset(0)
    setQ(qDraft.trim())
    setModel(modelDraft.trim())
  }

  async function toggleRow(row: PromptRow) {
    if (expandedId === row.id) { setExpandedId(null); return }
    setExpandedId(row.id)
    setExpandedText('')
    setDetailLoading(true)
    try {
      const res = await detail(row.id)
      setExpandedText(res.data.promptText ?? res.data.preview ?? '')
    } catch (err) {
      setExpandedText(err instanceof Error ? `(failed to load full text: ${err.message})` : '(failed to load)')
    } finally {
      setDetailLoading(false)
    }
  }

  const colCount = showUser ? 5 : 4
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + pageSize, total)

  return (
    <div className="space-y-3">
      {showFilters && (
        <form onSubmit={applyFilters} className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder="Search prompt text…"
              className="pl-8"
            />
          </div>
          <Input
            value={modelDraft}
            onChange={(e) => setModelDraft(e.target.value)}
            placeholder="Model (e.g. claude-sonnet-4-5)"
            className="w-[240px]"
          />
          <Button type="submit" variant="secondary" size="sm">Apply</Button>
          {(q || model) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setQDraft(''); setModelDraft(''); setQ(''); setModel(''); setOffset(0) }}
            >
              Clear
            </Button>
          )}
        </form>
      )}

      {error && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-600">{error}</div>
      )}

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Time</TableHead>
              {showUser && <TableHead className="w-[160px]">User</TableHead>}
              <TableHead>Prompt</TableHead>
              <TableHead className="w-[150px]">Model</TableHead>
              <TableHead className="w-[170px]">Device</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={colCount} className="h-32 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="h-32 text-center text-muted-foreground italic">
                  {emptyHint ?? 'No prompts captured yet.'}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => toggleRow(row)}
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtTime(row.occurredAt)}</TableCell>
                    {showUser && <TableCell className="text-sm font-medium truncate">{row.userName ?? `#${row.userId}`}</TableCell>}
                    <TableCell className="text-sm max-w-0">
                      <span className="block truncate text-foreground/90">{row.preview || '—'}</span>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{shortModel(row.model)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate inline-flex items-center gap-1">
                      <Monitor className="h-3 w-3 shrink-0" /> {row.deviceName ?? '—'}
                    </TableCell>
                  </TableRow>
                  {expandedId === row.id && (
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={colCount} className="p-4">
                        {detailLoading ? (
                          <div className="text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading full prompt…</div>
                        ) : (
                          <div className="space-y-2">
                            <pre className="whitespace-pre-wrap break-words text-sm bg-background border rounded-md p-3 max-h-[400px] overflow-auto">{expandedText}</pre>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                              {row.promptChars != null && <span>{row.promptChars.toLocaleString()} chars</span>}
                              {row.sessionId && <span>session {row.sessionId.slice(0, 12)}…</span>}
                              {row.cwd && <span className="inline-flex items-center gap-1"><FolderGit2 className="h-3 w-3" /> {row.cwd}</span>}
                              <span>{new Date(row.occurredAt).toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{total === 0 ? 'No results' : `${from}–${to} of ${total.toLocaleString()}`}</span>
        <div className="flex items-center gap-1">
          <Button
            type="button" variant="outline" size="sm"
            disabled={offset === 0 || loading}
            onClick={() => setOffset(Math.max(0, offset - pageSize))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button" variant="outline" size="sm"
            disabled={to >= total || loading}
            onClick={() => setOffset(offset + pageSize)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
