import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse bg-muted/60 rounded-md',
        className,
      )}
    />
  )
}

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-2.5">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-4 flex-1 max-w-[140px]" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-3 w-3/4" />
      <div className="flex items-center justify-between gap-2 pt-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  )
}

export function TileSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-2.5 w-32" />
    </div>
  )
}

export function TimelineSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex gap-3">
          <Skeleton className="h-7 w-7 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3 w-3/4" />
          </div>
        </li>
      ))}
    </ul>
  )
}
