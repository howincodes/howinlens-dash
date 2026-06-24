import { cn } from '@/lib/utils'

interface Props {
  label: string
  required?: boolean
  hint?: string
  error?: string | null
  children: React.ReactNode
  className?: string
  htmlFor?: string
  /** Optional right-side hint (e.g. char counter). */
  rightHint?: string
}

export function Field({
  label, required, hint, error, children, className, htmlFor, rightHint,
}: Props) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-xs font-medium">
          {label}
          {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
        </label>
        {rightHint ? (
          <span className="text-[11px] text-muted-foreground tabular-nums">{rightHint}</span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p className="text-[11px] text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
