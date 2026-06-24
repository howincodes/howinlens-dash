import { useEffect, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

// ──────────────────────────────────────────────────────────────────────────────
// Promise-based confirm + prompt dialogs.
// Replaces window.confirm / window.prompt for a polished modal UX.
//
// Usage:
//   const ok = await confirm({ title: 'Delete lead?', destructive: true })
//   const reason = await prompt({ title: 'Lost reason', label: 'Why?' })
// ──────────────────────────────────────────────────────────────────────────────

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

interface PromptOptions {
  title: string
  description?: string
  label?: string
  defaultValue?: string
  placeholder?: string
  confirmLabel?: string
  cancelLabel?: string
  multiline?: boolean
  required?: boolean
}

type Resolver<T> = (value: T) => void

interface ConfirmDialogProps extends ConfirmOptions {
  onResolve: Resolver<boolean>
}

interface PromptDialogProps extends PromptOptions {
  onResolve: Resolver<string | null>
}

// ── Mounting infrastructure ───────────────────────────────────────────────
let containerEl: HTMLDivElement | null = null
let root: Root | null = null

function mount(el: React.ReactElement, onClose: () => void) {
  if (!containerEl) {
    containerEl = document.createElement('div')
    containerEl.id = 'crm-dialog-root'
    document.body.appendChild(containerEl)
    root = createRoot(containerEl)
  }
  const wrapped = (
    <DialogPortal onClose={onClose}>{el}</DialogPortal>
  )
  root!.render(wrapped)
}

function unmount() {
  if (root) {
    root.render(<></>)
  }
}

function DialogPortal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-background border shadow-2xl">
        {children}
      </div>
    </div>
  )
}

// ── ConfirmDialog component ────────────────────────────────────────────────
function ConfirmDialog({
  title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  destructive, onResolve,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    confirmRef.current?.focus()
  }, [])
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-start gap-3">
        {destructive ? (
          <div className="shrink-0 mt-0.5 h-9 w-9 rounded-full bg-rose-500/10 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-rose-600" />
          </div>
        ) : null}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => onResolve(false)}>
          {cancelLabel}
        </Button>
        <Button
          ref={confirmRef}
          variant={destructive ? 'destructive' : 'default'}
          onClick={() => onResolve(true)}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  )
}

// ── PromptDialog component ─────────────────────────────────────────────────
function PromptDialog({
  title, description, label, defaultValue = '', placeholder,
  confirmLabel = 'Save', cancelLabel = 'Cancel', multiline,
  required, onResolve,
}: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    if (inputRef.current && 'select' in inputRef.current) {
      (inputRef.current as HTMLInputElement).select()
    }
  }, [])

  const submit = () => {
    if (required && !value.trim()) return
    setSubmitting(true)
    onResolve(value.trim() || (required ? '' : null))
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      submit()
    } else if (e.key === 'Enter' && multiline && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="p-5 space-y-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        ) : null}
      </div>
      <div>
        {label ? (
          <label className="text-xs font-medium block mb-1.5">{label}</label>
        ) : null}
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            placeholder={placeholder}
            rows={3}
            className="w-full rounded-md border bg-background p-2 text-sm resize-y"
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            placeholder={placeholder}
            className="w-full h-9 rounded-md border bg-background px-2 text-sm"
          />
        )}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={() => onResolve(null)} disabled={submitting}>
          {cancelLabel}
        </Button>
        <Button onClick={submit} disabled={submitting || (required && !value.trim())}>
          {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          {confirmLabel}
        </Button>
      </div>
    </div>
  )
}

// ── Public API ─────────────────────────────────────────────────────────────
export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const onResolve = (v: boolean) => {
      unmount()
      resolve(v)
    }
    mount(<ConfirmDialog {...opts} onResolve={onResolve} />, () => onResolve(false))
  })
}

export function prompt(opts: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    const onResolve = (v: string | null) => {
      unmount()
      resolve(v)
    }
    mount(<PromptDialog {...opts} onResolve={onResolve} />, () => onResolve(null))
  })
}

void cn // silence unused import
