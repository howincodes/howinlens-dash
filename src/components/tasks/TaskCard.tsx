import { memo, useRef, useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from './Avatar';
import { LabelChip } from './LabelPicker';
import { priorityMeta, formatDueRelative, statusMeta, STATUS_META, DENSITY, type DensityMode } from './tokens';

export interface TaskCardData {
 id: number;
 slug?: string | null;
 title: string;
 description?: string | null;
 status: string;
 priority?: string | null;
 effort?: string | null;
 assigneeId?: number | null;
 assigneeName?: string | null;
 dueAt?: string | null;
 sourceType?: string | null;
 rank?: string | null;
 labels?: Array<{ id: number; name: string; color?: string | null }>;
 commentCount?: number;
 subtaskCount?: number;
}

interface TaskCardProps {
 task: TaskCardData;
 density?: DensityMode;
 selected?: boolean;
 focused?: boolean;
 onClick?: (task: TaskCardData) => void;
 onStatusChange?: (id: number, status: string) => void | Promise<void>;
 statuses?: Array<{ name: string; color?: string | null; isDoneState?: boolean }>;
 draggable?: boolean;
}

// Board view task card. Wrapped in useSortable so it participates in @dnd-kit
// drag-and-drop. All user interaction on child elements must stopPropagation
// so the drag handler doesn't swallow clicks to inline pickers.
export const TaskCard = memo(function TaskCard({
 task,
 density = 'comfortable',
 selected,
 focused,
 onClick,
 onStatusChange,
 statuses,
 draggable = true,
}: TaskCardProps) {
 const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
 id: task.id,
 disabled: !draggable,
 });
 const cardRootRef = useRef<HTMLDivElement | null>(null);
 const [statusOpen, setStatusOpen] = useState(false);
 const statusMenuRef = useRef<HTMLDivElement | null>(null);

 useEffect(() => {
 if (!statusOpen) return;
 const onDoc = (e: MouseEvent) => {
 if (!statusMenuRef.current?.contains(e.target as Node)) setStatusOpen(false);
 };
 const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setStatusOpen(false); };
 document.addEventListener('mousedown', onDoc);
 document.addEventListener('keydown', onKey);
 return () => {
 document.removeEventListener('mousedown', onDoc);
 document.removeEventListener('keydown', onKey);
 };
 }, [statusOpen]);

 const style = {
 transform: CSS.Translate.toString(transform),
 transition,
 opacity: isDragging ? 0.4 : 1,
 };

 const prio = priorityMeta(task.priority);
 const due = formatDueRelative(task.dueAt ?? undefined);
 const sMeta = statusMeta(task.status);
 const d = DENSITY[density];

 const visibleLabels = (task.labels ?? []).slice(0, 3);
 const overflowLabels = (task.labels ?? []).length - visibleLabels.length;

 const statusOptions = (statuses && statuses.length > 0)
 ? statuses.map((s) => ({ key: s.name, label: STATUS_META[s.name]?.label ?? s.name.replace('_', ' ') }))
 : Object.entries(STATUS_META).map(([key, m]) => ({ key, label: m.label }));

 return (
 <div
 ref={(el) => { setNodeRef(el); cardRootRef.current = el; }}
 style={style}
 {...attributes}
 {...listeners}
 onClick={(e) => {
 // Walk up DOM only until the card root, so dnd-kit's role="button"
 // on the wrapper doesn't swallow the click.
 const root = cardRootRef.current;
 let el: HTMLElement | null = e.target as HTMLElement;
 while (el && el !== root) {
 if (el.matches('button, a, [data-stop]')) return;
 el = el.parentElement;
 }
 onClick?.(task);
 }}
 className={cn(
 'group relative rounded-md border bg-card shadow-none hover:shadow-sm hover:border-foreground/20 transition-all cursor-pointer',
 d.cardPadding,
 selected
 ? 'border-blue-400 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900'
 : 'border-border',
 focused && 'ring-2 ring-offset-0 ring-blue-200 dark:ring-blue-900',
 )}
 >
 {/* Left edge accent — status color */}
 <span className={cn('absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full', sMeta.bar)} />

 {/* Top row: id + priority dot + quick status menu */}
 <div className="flex items-center gap-1.5 mb-1.5">
 <span className="font-mono text-[10px] text-muted-foreground/70 select-none">
 {task.slug ?? `T-${task.id}`}
 </span>
 {task.priority && (
 <span
 className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', prio.dot)}
 title={prio.label}
 />
 )}
 {task.sourceType === 'ai_generated' && (
 <span className="text-[9px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
 AI
 </span>
 )}
 {/* Hover-revealed quick status menu */}
 {onStatusChange && (
 <div
 ref={statusMenuRef}
 data-stop
 className={cn(
 'ml-auto relative',
 statusOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity',
 )}
 onClick={(e) => e.stopPropagation()}
 onPointerDown={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 >
 <button
 type="button"
 onClick={(e) => { e.stopPropagation(); setStatusOpen((v) => !v); }}
 className={cn(
 'inline-flex items-center gap-1 rounded-full border px-1.5 h-5 text-[10px] font-medium',
 sMeta.chip,
 'hover:opacity-80',
 )}
 title="Change status"
 >
 <span className={cn('h-1.5 w-1.5 rounded-full', sMeta.dot)} />
 <span className="hidden sm:inline">{sMeta.label}</span>
 <ChevronDown className="h-3 w-3" />
 </button>
 {statusOpen && (
 <div className="absolute right-0 mt-1 z-50 min-w-[10rem] rounded-md border border-border bg-popover shadow-lg p-1">
 {statusOptions.map((o) => {
 const m = statusMeta(o.key);
 const active = o.key === task.status;
 return (
 <button
 key={o.key}
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setStatusOpen(false);
 if (o.key !== task.status) onStatusChange(task.id, o.key);
 }}
 className={cn(
 'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded text-left',
 'hover:bg-muted',
 active && 'bg-muted',
 )}
 >
 <span className={cn('h-2 w-2 rounded-full', m.dot)} />
 <span className="capitalize flex-1">{o.label}</span>
 {active && <span className="text-[10px] text-muted-foreground/70">✓</span>}
 </button>
 );
 })}
 </div>
 )}
 </div>
 )}
 </div>

 {/* Title */}
 <div
 className={cn(
 d.cardTitleSize,
 'font-medium text-foreground leading-snug line-clamp-2',
 )}
 >
 {task.title}
 </div>

 {/* Bottom row: labels + due + avatar */}
 <div className="mt-2 flex items-center justify-between gap-2">
 <div className="flex items-center gap-1 flex-wrap min-w-0">
 {visibleLabels.map((l) => (
 <LabelChip key={l.id} label={l} compact />
 ))}
 {overflowLabels > 0 && (
 <span className="text-[10px] text-muted-foreground/70">+{overflowLabels}</span>
 )}
 {task.dueAt && (
 <span
 className={cn(
 'text-[10px] px-1.5 py-0.5 rounded-full border font-medium',
 due.className,
 )}
 >
 {due.label}
 </span>
 )}
 </div>
 <div className="flex items-center gap-1.5 flex-shrink-0">
 {task.commentCount != null && task.commentCount > 0 && (
 <span className="text-[10px] text-muted-foreground/70 tabular-nums">💬{task.commentCount}</span>
 )}
 {task.subtaskCount != null && task.subtaskCount > 0 && (
 <span className="text-[10px] text-muted-foreground/70 tabular-nums">
 ☷{task.subtaskCount}
 </span>
 )}
 <Avatar
 id={task.assigneeId ?? null}
 name={task.assigneeName}
 size={density === 'compact' ? 16 : 20}
 />
 </div>
 </div>
 </div>
 );
});
