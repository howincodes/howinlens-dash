import { cn } from '@/lib/utils';

// Skeleton that mirrors TaskCard layout shape. Uses a subtle shimmer via
// tailwind's animate-pulse. Three of these stacked per column while loading.
export function SkeletonCard({ className }: { className?: string }) {
 return (
 <div
 className={cn(
 'rounded-md border border-border bg-card p-3 animate-pulse',
 className,
 )}
 >
 <div className="flex items-center gap-1.5 mb-2">
 <div className="h-1.5 w-1.5 rounded-full bg-muted" />
 <div className="h-3 w-8 rounded bg-muted" />
 </div>
 <div className="h-4 w-3/4 rounded bg-muted mb-1.5" />
 <div className="h-4 w-1/2 rounded bg-muted mb-3" />
 <div className="flex items-center justify-between">
 <div className="flex gap-1">
 <div className="h-4 w-10 rounded-full bg-muted" />
 <div className="h-4 w-10 rounded-full bg-muted" />
 </div>
 <div className="h-5 w-5 rounded-full bg-muted" />
 </div>
 </div>
 );
}

export function SkeletonColumn() {
 return (
 <div className="w-[280px] flex-shrink-0 space-y-1.5">
 <div className="flex items-center gap-2 px-1 py-1.5">
 <div className="h-3 w-16 rounded bg-muted animate-pulse" />
 <div className="h-3 w-5 rounded bg-muted animate-pulse" />
 </div>
 <SkeletonCard />
 <SkeletonCard />
 <SkeletonCard />
 </div>
 );
}
