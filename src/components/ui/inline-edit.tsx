import { useEffect, useRef, useState } from 'react'
import { Loader2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface BaseProps {
  /** Current value as displayed. */
  value: string | null | undefined
  /** Save handler — should resolve when persisted. Throw on failure. */
  onSave: (next: string) => Promise<void>
  /** Optional client-side validator returning error string or null. */
  validate?: (next: string) => string | null
  placeholder?: string
  className?: string
  /** Render value as a "view" element. Optional override. */
  renderView?: (v: string) => React.ReactNode
  /** Display when value is empty. */
  emptyLabel?: string
  multiline?: boolean
  /** Disable editing entirely. */
  disabled?: boolean
}

/**
 * Click-to-edit text input. Click → enter edit mode → Enter to save / Esc to cancel.
 * Auto-saves on blur unless cancelled. Shows pencil icon on hover.
 */
export function InlineEdit({
  value, onSave, validate, placeholder, className, renderView, emptyLabel,
  multiline, disabled,
}: BaseProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const lastValueRef = useRef(value ?? '')

  useEffect(() => {
    if (!editing) {
      setDraft(value ?? '')
      lastValueRef.current = value ?? ''
    }
  }, [value, editing])

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    if (inputRef.current && 'select' in inputRef.current) {
      try { (inputRef.current as HTMLInputElement).select() } catch { /* */ }
    }
  }, [editing])

  const cancel = () => {
    setEditing(false)
    setDraft(lastValueRef.current)
    setError(null)
  }

  const save = async () => {
    setError(null)
    const trimmed = draft.trim()
    if (trimmed === (lastValueRef.current ?? '').trim()) {
      setEditing(false)
      return
    }
    if (validate) {
      const err = validate(trimmed)
      if (err) {
        setError(err)
        return
      }
    }
    setSaving(true)
    try {
      await onSave(trimmed)
      lastValueRef.current = trimmed
      setEditing(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    } else if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      save()
    } else if (e.key === 'Enter' && multiline && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      save()
    }
  }

  if (disabled) {
    const v = value ?? ''
    return (
      <span className={cn(className)}>
        {renderView ? renderView(v) : v || <span className="italic text-muted-foreground">{emptyLabel ?? '—'}</span>}
      </span>
    )
  }

  if (editing) {
    return (
      <div className={cn('inline-flex flex-col gap-1', className)}>
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={onKey}
            disabled={saving}
            rows={3}
            placeholder={placeholder}
            className="rounded-md border bg-background p-2 text-sm resize-y"
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={onKey}
            disabled={saving}
            placeholder={placeholder}
            className="h-7 rounded-md border bg-background px-2 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none"
            style={{ minWidth: 100 }}
          />
        )}
        {error ? <p className="text-[10px] text-rose-600">{error}</p> : null}
        {saving ? (
          <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </p>
        ) : null}
      </div>
    )
  }

  const v = value ?? ''
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        'group inline-flex items-center gap-1 rounded px-1 -mx-1 hover:bg-muted/60 cursor-text text-left',
        className,
      )}
      title="Click to edit"
    >
      <span>
        {renderView ? renderView(v) : v || <span className="italic text-muted-foreground">{emptyLabel ?? 'Click to add…'}</span>}
      </span>
      <Pencil className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  )
}

interface NumberProps {
  value: number | null | undefined
  onSave: (next: number | null) => Promise<void>
  formatView?: (n: number | null | undefined) => React.ReactNode
  emptyLabel?: string
  className?: string
  step?: number
  min?: number
  max?: number
  disabled?: boolean
}

export function InlineEditNumber({
  value, onSave, formatView, emptyLabel, className, step, min, max, disabled,
}: NumberProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value != null ? String(value) : '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastRef = useRef(value)

  useEffect(() => {
    if (!editing) {
      setDraft(value != null ? String(value) : '')
      lastRef.current = value
    }
  }, [value, editing])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const save = async () => {
    const n = draft.trim() === '' ? null : Number(draft)
    if (n != null && Number.isNaN(n)) {
      toast.error('Not a number')
      return
    }
    if (n === lastRef.current) { setEditing(false); return }
    setSaving(true)
    try {
      await onSave(n)
      lastRef.current = n
      setEditing(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (disabled) {
    return <span className={cn(className)}>{formatView ? formatView(value) : value ?? <span className="italic text-muted-foreground">{emptyLabel ?? '—'}</span>}</span>
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        max={max}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setDraft(value != null ? String(value) : ''); setEditing(false) }
          else if (e.key === 'Enter') { e.preventDefault(); save() }
        }}
        disabled={saving}
        className={cn('h-7 rounded-md border bg-background px-2 text-sm w-28 font-mono', className)}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        'group inline-flex items-center gap-1 rounded px-1 -mx-1 hover:bg-muted/60 cursor-text',
        className,
      )}
      title="Click to edit"
    >
      <span>{formatView ? formatView(value) : value ?? <span className="italic text-muted-foreground">{emptyLabel ?? 'Click to add…'}</span>}</span>
      <Pencil className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 shrink-0" />
    </button>
  )
}
