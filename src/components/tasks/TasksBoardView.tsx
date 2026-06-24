import { useMemo, useState, useCallback, useRef } from 'react';
import {
 DndContext,
 DragOverlay,
 PointerSensor,
 KeyboardSensor,
 useSensor,
 useSensors,
 useDroppable,
 closestCenter,
 type DragStartEvent,
 type DragEndEvent,
 type DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { TaskCard, type TaskCardData } from './TaskCard';
import { TaskQuickCreate } from './TaskQuickCreate';
import { SkeletonColumn } from './SkeletonCard';
import { EmptyState } from './EmptyState';
import { STATUS_META, statusMeta, type DensityMode } from './tokens';

interface StatusConfig {
 name: string;
 color?: string | null;
 isDoneState?: boolean;
 position?: number | null;
}

interface User {
 id: number;
 name: string;
}

interface TasksBoardViewProps {
 tasks: TaskCardData[];
 users: User[];
 statuses?: StatusConfig[];
 density?: DensityMode;
 loading?: boolean;
 onTaskClick?: (task: TaskCardData) => void;
 onCreateTask: (status: string, title: string) => Promise<void> | void;
 onMoveTask: (taskId: number, toStatus: string, beforeId?: number | null, afterId?: number | null) => Promise<void> | void;
 onStatusChange?: (id: number, status: string) => void | Promise<void>;
 selectedIds?: Set<number>;
 focusedId?: number | null;
}

const DEFAULT_COLUMNS: StatusConfig[] = [
 { name: 'open', position: 0 },
 { name: 'in_progress', position: 1 },
 { name: 'blocked', position: 2 },
 { name: 'done', position: 3, isDoneState: true },
];

export function TasksBoardView({
 tasks,
 users,
 statuses,
 density = 'comfortable',
 loading,
 onTaskClick,
 onCreateTask,
 onMoveTask,
 onStatusChange,
 selectedIds,
 focusedId,
}: TasksBoardViewProps) {
 const [activeId, setActiveId] = useState<number | null>(null);
 const userById = useMemo(() => {
 const m: Record<number, string> = {};
 for (const u of users) m[u.id] = u.name;
 return m;
 }, [users]);

 // Decorate tasks with assignee name for display
 const decorated = useMemo(
 () =>
 tasks.map((t) => ({
 ...t,
 assigneeName: t.assigneeId ? userById[t.assigneeId] ?? null : null,
 })),
 [tasks, userById],
 );

 // Group tasks by status, respecting configured columns
 const columns = useMemo(() => {
 const cols = (statuses && statuses.length > 0 ? statuses : DEFAULT_COLUMNS).slice().sort(
 (a, b) => (a.position ?? 0) - (b.position ?? 0),
 );
 const grouped: Record<string, TaskCardData[]> = {};
 for (const c of cols) grouped[c.name] = [];
 for (const t of decorated) {
 if (!grouped[t.status]) grouped[t.status] = [];
 grouped[t.status]!.push(t);
 }
 // Ensure cards within a column are sorted by rank
 for (const k of Object.keys(grouped)) {
 grouped[k]!.sort((a, b) => {
 const ra = Number(a.rank ?? Number.MAX_SAFE_INTEGER);
 const rb = Number(b.rank ?? Number.MAX_SAFE_INTEGER);
 return ra - rb;
 });
 }
 return { cols, grouped };
 }, [decorated, statuses]);

 const sensors = useSensors(
 useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
 useSensor(KeyboardSensor),
 );

 const handleDragStart = useCallback((event: DragStartEvent) => {
 setActiveId(Number(event.active.id));
 }, []);

 const currentColumnRef = useRef<string | null>(null);

 const handleDragOver = useCallback(
 (event: DragOverEvent) => {
 const overId = event.over?.id;
 if (!overId) return;
 // If over a column container, remember it so drop can land there even
 // when the column has zero cards.
 if (typeof overId === 'string' && overId.startsWith('column:')) {
 currentColumnRef.current = overId.slice('column:'.length);
 }
 },
 [],
 );

 const handleDragEnd = useCallback(
 (event: DragEndEvent) => {
 setActiveId(null);
 const activeTaskId = Number(event.active.id);
 const overId = event.over?.id;
 if (!overId) return;

 let targetStatus: string | null = null;
 let beforeId: number | null = null;
 let afterId: number | null = null;

 if (typeof overId === 'string' && overId.startsWith('column:')) {
 targetStatus = overId.slice('column:'.length);
 } else {
 // Dropped onto another task — insert next to it
 const overTaskId = Number(overId);
 const overTask = decorated.find((t) => t.id === overTaskId);
 if (!overTask) return;
 targetStatus = overTask.status;
 const col = columns.grouped[targetStatus] ?? [];
 const idx = col.findIndex((t) => t.id === overTaskId);
 afterId = col[idx - 1]?.id ?? null;
 beforeId = col[idx]?.id ?? null;
 if (beforeId === activeTaskId) beforeId = col[idx + 1]?.id ?? null;
 }
 if (!targetStatus) return;

 onMoveTask(activeTaskId, targetStatus, beforeId, afterId);
 },
 [decorated, columns, onMoveTask],
 );

 if (loading) {
 return (
 <div className="flex gap-4 overflow-x-auto pb-4">
 <SkeletonColumn />
 <SkeletonColumn />
 <SkeletonColumn />
 <SkeletonColumn />
 </div>
 );
 }

 if (decorated.length === 0 && !loading) {
 return (
 <EmptyState
 icon="🎯"
 title="No tasks yet"
 description="Create your first task or paste meeting notes and let AI generate tasks."
 />
 );
 }

 const activeTask = activeId ? decorated.find((t) => t.id === activeId) ?? null : null;

 return (
 <DndContext
 sensors={sensors}
 collisionDetection={closestCenter}
 onDragStart={handleDragStart}
 onDragOver={handleDragOver}
 onDragEnd={handleDragEnd}
 >
 <div className="flex gap-4 overflow-x-auto pb-4 px-0.5">
 {columns.cols.map((col) => {
 const colTasks = columns.grouped[col.name] ?? [];
 const meta = statusMeta(col.name);
 return (
 <BoardColumn
 key={col.name}
 name={col.name}
 label={STATUS_META[col.name]?.label ?? col.name.replace('_', ' ')}
 dotClass={meta.dot}
 barClass={meta.bar}
 count={colTasks.length}
 tasks={colTasks}
 density={density}
 onTaskClick={onTaskClick}
 onCreateTask={(title) => onCreateTask(col.name, title)}
 onStatusChange={onStatusChange}
 statuses={statuses}
 selectedIds={selectedIds}
 focusedId={focusedId}
 />
 );
 })}
 </div>
 <DragOverlay>
 {activeTask && (
 <div className="rotate-1">
 <TaskCard task={activeTask} density={density} draggable={false} />
 </div>
 )}
 </DragOverlay>
 </DndContext>
 );
}

interface BoardColumnProps {
 name: string;
 label: string;
 dotClass: string;
 barClass: string;
 count: number;
 tasks: TaskCardData[];
 density: DensityMode;
 onTaskClick?: (task: TaskCardData) => void;
 onCreateTask: (title: string) => Promise<void> | void;
 onStatusChange?: (id: number, status: string) => void | Promise<void>;
 statuses?: StatusConfig[];
 selectedIds?: Set<number>;
 focusedId?: number | null;
}

function BoardColumn({
 name,
 label,
 dotClass,
 barClass,
 count,
 tasks,
 density,
 onTaskClick,
 onCreateTask,
 onStatusChange,
 statuses,
 selectedIds,
 focusedId,
}: BoardColumnProps) {
 const { setNodeRef, isOver } = useDroppable({ id: `column:${name}` });
 return (
 <div
 ref={setNodeRef}
 className={cn(
 'w-[300px] flex-shrink-0 rounded-xl bg-muted/30 border transition-colors flex flex-col max-h-full',
 isOver ? 'border-primary/40 bg-muted/50' : 'border-border/60',
 density === 'compact' ? 'p-1.5' : 'p-2',
 )}
 >
 {/* Header — color bar + label + count */}
 <div className="flex items-center gap-2 px-2 pt-1 pb-2 border-b border-border/50 mb-2">
 <span className={cn('h-2 w-2 rounded-full', dotClass)} />
 <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
 {label}
 </span>
 <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[18px] px-1.5 rounded-full bg-muted text-[10px] font-medium text-muted-foreground tabular-nums">
 {count}
 </span>
 <span className={cn('ml-auto h-0.5 w-8 rounded-full', barClass)} />
 </div>

 {/* Quick create */}
 <div className="mb-1.5">
 <TaskQuickCreate columnName={label} onCreate={onCreateTask} />
 </div>

 {/* Cards */}
 <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
 <div
 className={cn(
 'space-y-1.5 min-h-[40px] overflow-y-auto pr-0.5 -mr-0.5 flex-1',
 density === 'compact' && 'space-y-1',
 density === 'spacious' && 'space-y-2.5',
 )}
 >
 {tasks.map((t) => (
 <TaskCard
 key={t.id}
 task={t}
 density={density}
 selected={selectedIds?.has(t.id)}
 focused={focusedId === t.id}
 onClick={onTaskClick}
 onStatusChange={onStatusChange}
 statuses={statuses}
 />
 ))}
 {tasks.length === 0 && (
 <div className={cn(
 'text-[11px] text-muted-foreground/60 text-center py-6 rounded-md border border-dashed transition-colors',
 isOver ? 'border-primary/40 bg-primary/5' : 'border-border/40',
 )}>
 Drop here
 </div>
 )}
 </div>
 </SortableContext>
 </div>
 );
}
