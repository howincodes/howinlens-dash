import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2, User as UserIcon, X } from 'lucide-react'
import { getUsers } from '@/lib/api'
import { cn } from '@/lib/utils'

interface User {
  id: number
  name: string
  email?: string
  status?: string
  kind?: string
  role?: string
}

interface Props {
  value: number | null | undefined
  onChange: (userId: number | null) => void
  placeholder?: string
  /** Show "Unassigned" as an explicit option. */
  allowUnassigned?: boolean
  disabled?: boolean
  size?: 'sm' | 'md'
  /** Render as compact pill (just initial) when no name available. */
  compact?: boolean
  className?: string
}

// Module-level cache so we don't refetch users every render across pages
let _usersCache: User[] | null = null
let _usersFetchPromise: Promise<User[]> | null = null

async function loadUsersCached(): Promise<User[]> {
  if (_usersCache) return _usersCache
  if (_usersFetchPromise) return _usersFetchPromise
  _usersFetchPromise = (async () => {
    const arr = (await getUsers()) as User[]
    _usersCache = arr
    return arr
  })()
  try {
    const r = await _usersFetchPromise
    return r
  } finally {
    _usersFetchPromise = null
  }
}

export function clearUsersCache() {
  _usersCache = null
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function UserPicker({
  value, onChange, placeholder = 'Select user…',
  allowUnassigned = true, disabled, size = 'md', compact, className,
}: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    loadUsersCached()
      .then((arr) => {
        if (cancelled) return
        setUsers(arr.filter((u) => u.status !== 'deleted'))
      })
      .catch(() => { /* ignore */ })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!open) return
    setTimeout(() => searchRef.current?.focus(), 0)
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selected = useMemo(
    () => users.find((u) => u.id === value) ?? null,
    [users, value],
  )

  const filtered = q.trim()
    ? users.filter((u) =>
        u.name.toLowerCase().includes(q.toLowerCase()) ||
        u.email?.toLowerCase().includes(q.toLowerCase()),
      )
    : users

  const sizeClasses = size === 'sm' ? 'h-7 text-xs px-2' : 'h-9 text-sm px-2.5'

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || loading}
        className={cn(
          'flex items-center gap-1.5 rounded-md border bg-background hover:bg-muted transition-colors min-w-0',
          sizeClasses,
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
        ) : selected ? (
          <>
            <Avatar name={selected.name} size={size} />
            {!compact ? <span className="truncate">{selected.name}</span> : null}
          </>
        ) : (
          <>
            <UserIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground truncate">{placeholder}</span>
          </>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 ml-auto" />
      </button>
      {open ? (
        <div className="absolute z-30 mt-1 w-64 rounded-md border bg-popover shadow-lg overflow-hidden">
          <div className="p-2 border-b">
            <input
              ref={searchRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search users…"
              className="w-full h-8 px-2 rounded border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {allowUnassigned ? (
              <li>
                <button
                  type="button"
                  onClick={() => { onChange(null); setOpen(false); setQ('') }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted text-left',
                    value == null && 'bg-muted/50',
                  )}
                >
                  <span className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                    <X className="h-3 w-3 text-muted-foreground" />
                  </span>
                  <span className="flex-1 italic text-muted-foreground">Unassigned</span>
                  {value == null ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                </button>
              </li>
            ) : null}
            {filtered.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => { onChange(u.id); setOpen(false); setQ('') }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted text-left',
                    u.id === value && 'bg-muted/50',
                  )}
                >
                  <Avatar name={u.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{u.name}</div>
                    {u.email ? (
                      <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                    ) : null}
                  </div>
                  {u.id === value ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                </button>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground italic">No match</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export function Avatar({ name, size = 'md' }: { name: string | null | undefined; size?: 'sm' | 'md' }) {
  const init = initialsOf(name)
  // Generate stable hue from name
  const hue = name ? Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0) % 360 : 200
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0',
        size === 'sm' ? 'h-5 w-5 text-[9px]' : 'h-6 w-6 text-[10px]',
      )}
      style={{ backgroundColor: `hsl(${hue}, 55%, 45%)` }}
      aria-hidden
    >
      {init}
    </span>
  )
}
