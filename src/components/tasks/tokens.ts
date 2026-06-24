// Design tokens for the task UI. Everything visual that the various task
// components share lives here so we have one place to tweak. These are NOT
// Tailwind classes — they're semantic maps that resolve to classes at the
// component level, so dark mode and theming are consistent.

export type TaskStatus = 'open' | 'in_progress' | 'blocked' | 'done' | string;
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskEffort = 'xs' | 's' | 'm' | 'l' | 'xl';
export type TaskSourceType = 'manual' | 'ai_generated' | 'github_import' | 'slack';

export const STATUS_META: Record<
 string,
 { label: string; dot: string; chip: string; bar: string }
> = {
 open: {
 label: 'Open',
 dot: 'bg-muted-foreground/40',
 chip: 'bg-muted text-foreground border-border ',
 bar: 'bg-muted-foreground/40',
 },
 in_progress: {
 label: 'In progress',
 dot: 'bg-amber-500',
 chip: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
 bar: 'bg-amber-500',
 },
 blocked: {
 label: 'Blocked',
 dot: 'bg-rose-500',
 chip: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800',
 bar: 'bg-rose-500',
 },
 done: {
 label: 'Done',
 dot: 'bg-emerald-500',
 chip: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
 bar: 'bg-emerald-500',
 },
};

export function statusMeta(status: TaskStatus) {
 return STATUS_META[status] ?? STATUS_META.open!;
}

export const PRIORITY_META: Record<
 TaskPriority,
 { label: string; rank: number; dot: string; chip: string; icon: string }
> = {
 urgent: {
 label: 'Urgent',
 rank: 1,
 dot: 'bg-red-600',
 chip: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900',
 icon: '!!',
 },
 high: {
 label: 'High',
 rank: 2,
 dot: 'bg-orange-500',
 chip: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900',
 icon: '!',
 },
 medium: {
 label: 'Medium',
 rank: 3,
 dot: 'bg-blue-500',
 chip: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900',
 icon: '·',
 },
 low: {
 label: 'Low',
 rank: 4,
 dot: 'bg-muted-foreground/40',
 chip: 'bg-muted/30 text-muted-foreground border-border ',
 icon: '↓',
 },
};

export function priorityMeta(p?: string | null) {
 if (!p) return PRIORITY_META.medium;
 return PRIORITY_META[p as TaskPriority] ?? PRIORITY_META.medium;
}

export const EFFORT_META: Record<TaskEffort, { label: string; hours: string }> = {
 xs: { label: 'XS', hours: '<1h' },
 s: { label: 'S', hours: '1–4h' },
 m: { label: 'M', hours: '1–2d' },
 l: { label: 'L', hours: '3–5d' },
 xl: { label: 'XL', hours: '1w+' },
};

export const SOURCE_META: Record<TaskSourceType, { label: string; chip: string }> = {
 manual: { label: 'Manual', chip: 'bg-muted text-muted-foreground' },
 ai_generated: {
 label: 'AI',
 chip: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
 },
 github_import: {
 label: 'GitHub',
 chip: 'bg-card text-primary-foreground ',
 },
 slack: { label: 'Slack', chip: 'bg-purple-200 text-purple-900' },
};

// Due date buckets — relative formatter + color class
export function formatDueRelative(iso: string | Date | null | undefined): {
 label: string;
 tone: 'overdue' | 'today' | 'soon' | 'soonish' | 'future' | 'none';
 className: string;
} {
 if (!iso) return { label: '—', tone: 'none', className: 'text-muted-foreground/70' };
 const date = typeof iso === 'string' ? new Date(iso) : iso;
 const now = new Date();
 const ms = date.getTime() - now.getTime();
 const day = 86_400_000;
 const diffDays = Math.round(ms / day);

 if (ms < 0) {
 const overdueDays = Math.abs(diffDays);
 return {
 label: overdueDays === 0 ? 'Overdue' : `Overdue ${overdueDays}d`,
 tone: 'overdue',
 className:
 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900',
 };
 }
 if (diffDays === 0) {
 return {
 label: 'Today',
 tone: 'today',
 className:
 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
 };
 }
 if (diffDays <= 3) {
 return {
 label: `in ${diffDays}d`,
 tone: 'soon',
 className:
 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
 };
 }
 if (diffDays <= 7) {
 return {
 label: `in ${diffDays}d`,
 tone: 'soonish',
 className:
 'bg-muted text-foreground border-border ',
 };
 }
 return {
 label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
 tone: 'future',
 className: 'bg-muted/30 text-muted-foreground border-border ',
 };
}

export type DensityMode = 'comfortable' | 'compact' | 'spacious';

export const DENSITY: Record<
 DensityMode,
 { cardPadding: string; cardGap: string; rowHeight: string; cardTitleSize: string }
> = {
 compact: {
 cardPadding: 'p-2',
 cardGap: 'space-y-1',
 rowHeight: 'py-1.5',
 cardTitleSize: 'text-[13px]',
 },
 comfortable: {
 cardPadding: 'p-3',
 cardGap: 'space-y-1.5',
 rowHeight: 'py-2.5',
 cardTitleSize: 'text-sm',
 },
 spacious: {
 cardPadding: 'p-4',
 cardGap: 'space-y-3',
 rowHeight: 'py-3.5',
 cardTitleSize: 'text-[15px]',
 },
};

// Seedable avatar color so the same user is always the same color.
export function avatarColor(id: number): string {
 const palette = [
 'bg-indigo-500',
 'bg-sky-500',
 'bg-teal-500',
 'bg-emerald-500',
 'bg-lime-500',
 'bg-amber-500',
 'bg-orange-500',
 'bg-rose-500',
 'bg-fuchsia-500',
 'bg-violet-500',
 ];
 return palette[id % palette.length]!;
}

export function initialsFor(name?: string | null): string {
 if (!name) return '?';
 const parts = name.trim().split(/\s+/);
 if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
 return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
