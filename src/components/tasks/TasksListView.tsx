import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from './Avatar';
import { LabelChip } from './LabelPicker';
import { StatusChip } from './StatusChip';
import { PriorityChip } from './PriorityChip';
import { SkeletonCard } from './SkeletonCard';
import { EmptyState } from './EmptyState';
import { formatDueRelative, statusMeta, type DensityMode } from './tokens';
import type { TaskCardData } from './TaskCard';

interface TasksListViewProps {
 tasks: TaskCardData[];
 users: Array<{ id: number; name: string }>;
 density?: DensityMode;
 loading?: boolean;
 groupBy?: 'none' | 'status' | 'assignee' | 'priority' | 'milestone';
 onTaskClick?: (t: TaskCardData) => void;
 onStatusChange?: (id: number, status: string) => void;
 onPriorityChange?: (id: number, priority: string) => void;
 onToggleSelect?: (id: number) => void;
 selectedIds?: Set<number>;
 focusedId?: number | null;
}

// Dense list view. Grouped by any field, inline edits via chip components,
// one row per task. Group headers collapse; row click opens drawer.
export function TasksListView({
 tasks,
 users,
 density = 'comfortable',
 loading,
 groupBy = 'status',
 onTaskClick,
 onStatusChange,
 onPriorityChange,
 onToggleSelect,
 selectedIds,
 focusedId,
}: TasksListViewProps) {
 const userById = useMemo(() => {
 const m: Record<number, string> = {};
 for (const u of users) m[u.id] = u.name;
 return m;
 }, [users]);

 const groups = useMemo(() => {
 if (groupBy === 'none') return [{ key: 'all', label: 'All tasks', tasks }];
 const map = new Map<string, { label: string; tasks: TaskCardData[] }>();
 for (const t of tasks) {
 let key = 'Other';
 let label = 'Other';
 if (groupBy === 'status') {
 key = t.status;
 label = statusMeta(t.status).label;
 } else if (groupBy === 'assignee') {
 key = t.assigneeId ? String(t.assigneeId) : 'unassigned';
 label = t.assigneeId ? userById[t.assigneeId] ?? `User #${t.assigneeId}` : 'Unassigned';
 } else if (groupBy === 'priority') {
 key = t.priority ?? 'none';
 label = (t.priority ?? 'None').replace(/^\w/, (c) => c.toUpperCase());
 } else if (groupBy === 'milestone') {
 key = t.sourceType ?? 'none';
 label = t.sourceType ? `Milestone ${t.sourceType}` : 'No milestone';
 }
 if (!map.has(key)) map.set(key, { label, tasks: [] });
 map.get(key)!.tasks.push(t);
 }
 return Array.from(map.entries()).map(([key, value]) => ({ key, ...value }));
 }, [tasks, groupBy, userById]);

 if (loading) {
 return (
 <div className="space-y-2">
 <SkeletonCard />
 <SkeletonCard />
 <SkeletonCard />
 </div>
 );
 }

 if (tasks.length === 0) {
 return (
 <EmptyState
 icon="🎯"
 title="No tasks match"
 description="Try adjusting filters or create your first task."
 />
 );
 }

 const rowPadClass = density === 'compact' ? 'py-1.5' : density === 'spacious' ? 'py-3.5' : 'py-2.5';

 return (
 <div className="rounded-md border border-border overflow-hidden">
 {groups.map((g) => (
 <div key={g.key}>
 {groupBy !== 'none' && (
 <div className="px-3 py-1.5 bg-muted/30 border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
 {g.label} <span className="text-muted-foreground/70 tabular-nums">· {g.tasks.length}</span>
 </div>
 )}
 {g.tasks.map((t) => {
 const selected = selectedIds?.has(t.id);
 const focused = focusedId === t.id;
 const assigneeName = t.assigneeId ? userById[t.assigneeId] : null;
 const due = formatDueRelative(t.dueAt ?? undefined);
 return (
 <div
 key={t.id}
 onClick={(e) => {
 const target = e.target as HTMLElement;
 if (target.closest('button, input, [role="button"], [data-stop]')) return;
 onTaskClick?.(t);
 }}
 className={cn(
 'flex items-center gap-3 px-3 border-b border-border last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors text-sm',
 rowPadClass,
 selected && 'bg-blue-50 dark:bg-blue-950/40',
 focused && 'ring-2 ring-inset ring-blue-300 dark:ring-blue-800',
 )}
 >
 {/* Checkbox */}
 {onToggleSelect && (
 <input
 type="checkbox"
 checked={selected ?? false}
 onChange={() => onToggleSelect(t.id)}
 onClick={(e) => e.stopPropagation()}
 className="h-3.5 w-3.5"
 data-stop
 />
 )}

 {/* ID */}
 <span className="font-mono text-[10px] text-muted-foreground/70 w-12 flex-shrink-0 tabular-nums">
 {t.slug ?? `T-${t.id}`}
 </span>

 {/* Priority */}
 <div data-stop>
 <PriorityChip
 priority={t.priority}
 onChange={(p) => onPriorityChange?.(t.id, p)}
 compact
 showLabel={false}
 />
 </div>

 {/* Title */}
 <div className="flex-1 min-w-0 font-medium text-foreground truncate">
 {t.title}
 </div>

 {/* Labels */}
 <div className="hidden md:flex items-center gap-1 flex-shrink-0">
 {(t.labels ?? []).slice(0, 2).map((l) => (
 <LabelChip key={l.id} label={l} compact />
 ))}
 {(t.labels ?? []).length > 2 && (
 <span className="text-[10px] text-muted-foreground/70">
 +{(t.labels ?? []).length - 2}
 </span>
 )}
 </div>

 {/* Status */}
 <div className="hidden md:block flex-shrink-0" data-stop>
 <StatusChip
 status={t.status}
 onChange={(s) => onStatusChange?.(t.id, s)}
 compact
 />
 </div>

 {/* Due */}
 <div className="hidden md:block w-20 text-right flex-shrink-0">
 <span className={cn('text-[11px] font-medium', due.className, 'px-1.5 py-0.5 rounded border')}>
 {due.label}
 </span>
 </div>

 {/* Assignee */}
 <div className="flex-shrink-0">
 <Avatar id={t.assigneeId ?? null} name={assigneeName} size={20} />
 </div>
 </div>
 );
 })}
 </div>
 ))}
 </div>
 );
}
