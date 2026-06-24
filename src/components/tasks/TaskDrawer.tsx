import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import MDEditor from '@uiw/react-md-editor';
import { cn } from '@/lib/utils';
import {
 getTask,
 assignTask,
 changeTaskStatus,
 updateTaskApi,
 deleteTaskApi,
 restoreTaskApi,
 addTaskComment,
 createTaskApi,
 getUsers,
 listLabelsApi,
 createLabelApi,
 setTaskLabelsApi,
} from '@/lib/api';
import { taskKeys } from './hooks/useTasks';
import { StatusChip } from './StatusChip';
import { PriorityChip } from './PriorityChip';
import { AssigneePicker } from './AssigneePicker';
import { LabelPicker, LabelChip } from './LabelPicker';
import { DueDatePicker } from './DueDatePicker';
import { ActivityTimeline } from './ActivityTimeline';
import { Avatar } from './Avatar';

interface TaskDrawerProps {
 taskId: number | null;
 onClose: () => void;
 statuses?: Array<{ name: string; color?: string | null; isDoneState?: boolean }>;
 currentUserId?: number;
}

// Slide-in drawer. Fetches full task detail (with labels, comments,
// activity, subtasks) on open. Inline edits everywhere. Esc or backdrop
// click closes. Cmd+Enter posts comments. Reassign flow has an inline
// reason prompt.
export function TaskDrawer({ taskId, onClose, statuses, currentUserId }: TaskDrawerProps) {
 const qc = useQueryClient();
 const [open, setOpen] = useState(false);
 const [title, setTitle] = useState('');
 const [editingTitle, setEditingTitle] = useState(false);
 const [description, setDescription] = useState<string | undefined>(undefined);
 const [descDirty, setDescDirty] = useState(false);
 const [descSaving, setDescSaving] = useState(false);
 const [comment, setComment] = useState('');
 const [filter, setFilter] = useState<'all' | 'comments' | 'status_changes' | 'assignments'>('all');
 const [newSubtask, setNewSubtask] = useState('');
 const [reassignPending, setReassignPending] = useState<number | null>(null);
 const [reassignReason, setReassignReason] = useState('');
 const [statusPending, setStatusPending] = useState<string | null>(null);
 const [statusReason, setStatusReason] = useState('');
 const drawerRef = useRef<HTMLDivElement>(null);

 const { data: task, refetch } = useQuery({
 queryKey: taskId ? taskKeys.detail(taskId) : ['task', 'disabled'],
 queryFn: () => getTask(taskId!),
 enabled: taskId != null,
 });

 const { data: users = [] } = useQuery({
 queryKey: ['users'],
 queryFn: () => getUsers(),
 staleTime: 60_000,
 });

 const { data: projectLabels = [] } = useQuery({
 queryKey: task?.projectId ? taskKeys.labels(task.projectId) : ['labels', 'disabled'],
 queryFn: () => listLabelsApi(task!.projectId),
 enabled: !!task?.projectId,
 });

 // Animate in/out — drawer mounts instantly but translates from +100%
 useEffect(() => {
 if (taskId != null) {
 setOpen(true);
 } else {
 setOpen(false);
 }
 }, [taskId]);

 useEffect(() => {
 if (!task) return;
 setTitle(task.title ?? '');
 setDescription(task.description ?? '');
 setDescDirty(false);
 }, [task?.id]);

 // Debounced description autosave
 useEffect(() => {
 if (!task || !descDirty || description === undefined) return;
 const t = setTimeout(async () => {
 setDescSaving(true);
 try {
 await updateTaskApi(task.id, { description });
 setDescDirty(false);
 } finally {
 setDescSaving(false);
 }
 }, 600);
 return () => clearTimeout(t);
 }, [description, descDirty, task]);

 useEffect(() => {
 if (!open) return;
 const onKey = (e: KeyboardEvent) => {
 if (e.key === 'Escape') {
 onClose();
 }
 };
 document.addEventListener('keydown', onKey);
 return () => document.removeEventListener('keydown', onKey);
 }, [open, onClose]);

 if (!taskId) return null;

 const invalidate = () => {
 qc.invalidateQueries({ queryKey: taskKeys.lists() });
 refetch();
 };

 const saveTitle = async () => {
 if (!task || title.trim() === task.title) {
 setEditingTitle(false);
 return;
 }
 await updateTaskApi(task.id, { title: title.trim() });
 invalidate();
 setEditingTitle(false);
 };

 const handleStatus = async (newStatus: string) => {
 if (!task) return;
 if ((newStatus === 'blocked' || newStatus === 'done') && newStatus !== task.status) {
 setStatusPending(newStatus);
 setStatusReason('');
 return;
 }
 await changeTaskStatus(task.id, newStatus);
 invalidate();
 };
 const commitStatus = async () => {
 if (!task || !statusPending) return;
 await changeTaskStatus(task.id, statusPending, statusReason || undefined);
 setStatusPending(null);
 setStatusReason('');
 invalidate();
 };

 const handleAssign = (newAssignee: number | null) => {
 if (!task) return;
 if (task.assigneeId && newAssignee !== task.assigneeId) {
 setReassignPending(newAssignee ?? -1);
 setReassignReason('');
 return;
 }
 commitAssign(newAssignee, undefined);
 };
 const commitAssign = async (newAssignee: number | null, reason?: string) => {
 if (!task) return;
 const resolved = newAssignee === -1 ? null : newAssignee;
 await assignTask(task.id, resolved, reason);
 setReassignPending(null);
 setReassignReason('');
 invalidate();
 };

 const handlePriority = async (p: string) => {
 if (!task) return;
 await updateTaskApi(task.id, { priority: p });
 invalidate();
 };

 const handleDue = async (iso: string | null) => {
 if (!task) return;
 await updateTaskApi(task.id, { dueAt: iso });
 invalidate();
 };

 const handleEffort = async (e: string) => {
 if (!task) return;
 await updateTaskApi(task.id, { effort: e });
 invalidate();
 };

 const handleLabelsChange = async (labelIds: number[]) => {
 if (!task) return;
 await setTaskLabelsApi(task.id, labelIds);
 invalidate();
 };

 const handleCreateLabel = async (name: string) => {
 if (!task) throw new Error('no task');
 const created = await createLabelApi(task.projectId, { name });
 qc.invalidateQueries({ queryKey: taskKeys.labels(task.projectId) });
 return created;
 };

 const handleDelete = async () => {
 if (!task) return;
 if (!confirm('Soft-delete this task?')) return;
 await deleteTaskApi(task.id);
 toast.success('Task deleted', {
 action: {
 label: 'Undo',
 onClick: async () => {
 await restoreTaskApi(task.id);
 invalidate();
 },
 },
 });
 invalidate();
 onClose();
 };

 const handleComment = async () => {
 if (!task || !comment.trim()) return;
 await addTaskComment(task.id, comment.trim());
 setComment('');
 invalidate();
 };

 const handleAddSubtask = async () => {
 if (!task || !newSubtask.trim()) return;
 await createTaskApi({
 projectId: task.projectId,
 title: newSubtask.trim(),
 parentTaskId: task.id,
 });
 setNewSubtask('');
 invalidate();
 };

 const resolveName = (id: number) => users.find((u: any) => u.id === id)?.name;

 return (
 <>
 {/* Backdrop */}
 <div
 className={cn(
 'fixed inset-0 z-40 bg-black/20 dark:bg-black/40 transition-opacity duration-300',
 open ? 'opacity-100' : 'opacity-0 pointer-events-none',
 )}
 onClick={onClose}
 />
 {/* Drawer */}
 <div
 ref={drawerRef}
 className={cn(
 'fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[640px] max-w-full bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300',
 open ? 'translate-x-0' : 'translate-x-full',
 )}
 onClick={(e) => e.stopPropagation()}
 >
 {task ? (
 <>
 {/* Header */}
 <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border flex-shrink-0">
 <div className="flex items-center gap-2 min-w-0">
 <span className="font-mono text-[11px] text-muted-foreground/70 tabular-nums">
 {task.slug ?? `T-${task.id}`}
 </span>
 <span className="text-[11px] text-muted-foreground/70">·</span>
 <span className="text-[11px] text-muted-foreground truncate">Project #{task.projectId}</span>
 {task.deletedAt && (
 <span className="ml-2 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded text-[10px] font-semibold">
 DELETED
 </span>
 )}
 </div>
 <div className="flex items-center gap-1">
 {task.deletedAt && (
 <button
 onClick={async () => {
 await restoreTaskApi(task.id);
 invalidate();
 }}
 className="text-xs px-2 py-1 rounded hover:bg-muted text-emerald-600"
 >
 Restore
 </button>
 )}
 {!task.deletedAt && (
 <button
 onClick={handleDelete}
 className="text-xs px-2 py-1 rounded hover:bg-muted text-muted-foreground hover:text-red-600"
 >
 Delete
 </button>
 )}
 <button
 onClick={onClose}
 className="p-1 rounded hover:bg-muted text-muted-foreground"
 aria-label="Close drawer"
 >
 ×
 </button>
 </div>
 </div>

 {/* Body */}
 <div className="flex-1 overflow-y-auto px-4 py-4">
 {/* Title */}
 {editingTitle ? (
 <input
 type="text"
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 onBlur={saveTitle}
 onKeyDown={(e) => {
 if (e.key === 'Enter') saveTitle();
 if (e.key === 'Escape') {
 setTitle(task.title);
 setEditingTitle(false);
 }
 }}
 className="w-full text-xl font-bold bg-transparent outline-none border-b-2 border-blue-500 pb-1"
 autoFocus
 />
 ) : (
 <h1
 onClick={() => setEditingTitle(true)}
 className="text-xl font-bold text-foreground leading-tight cursor-text hover:bg-muted/30 -mx-1 px-1 rounded"
 >
 {task.title}
 </h1>
 )}

 {/* Quick-edit strip */}
 <div className="mt-4 flex flex-wrap items-center gap-2">
 <StatusChip status={task.status} onChange={handleStatus} statuses={statuses} />
 <PriorityChip priority={task.priority} onChange={handlePriority} />
 <AssigneePicker
 users={users}
 assigneeId={task.assigneeId}
 onChange={handleAssign}
 currentUserId={currentUserId}
 />
 <DueDatePicker dueAt={task.dueAt} onChange={handleDue} />
 <EffortChip effort={task.effort} onChange={handleEffort} />
 </div>

 {/* Reassign reason prompt */}
 {reassignPending !== null && (
 <div className="mt-3 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900">
 <div className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1.5">
 Handoff reason (optional)
 </div>
 <input
 value={reassignReason}
 onChange={(e) => setReassignReason(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') commitAssign(reassignPending === -1 ? null : reassignPending, reassignReason || undefined);
 if (e.key === 'Escape') {
 setReassignPending(null);
 setReassignReason('');
 }
 }}
 placeholder="e.g. Alice has more context on auth"
 className="w-full text-xs bg-card border border-amber-200 dark:border-amber-900 rounded px-2 py-1.5 outline-none mb-2"
 autoFocus
 />
 <div className="flex gap-2">
 <button
 onClick={() => commitAssign(reassignPending === -1 ? null : reassignPending, reassignReason || undefined)}
 className="text-xs px-3 py-1 bg-amber-600 hover:bg-amber-700 text-primary-foreground rounded"
 >
 Confirm
 </button>
 <button
 onClick={() => {
 setReassignPending(null);
 setReassignReason('');
 }}
 className="text-xs px-3 py-1 text-muted-foreground hover:bg-muted rounded"
 >
 Cancel
 </button>
 </div>
 </div>
 )}

 {/* Status reason prompt */}
 {statusPending !== null && (
 <div className="mt-3 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900">
 <div className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1.5">
 Mark as {statusPending} — reason? (optional)
 </div>
 <input
 value={statusReason}
 onChange={(e) => setStatusReason(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') commitStatus();
 if (e.key === 'Escape') {
 setStatusPending(null);
 setStatusReason('');
 }
 }}
 placeholder={
 statusPending === 'blocked'
 ? 'e.g. waiting on API spec from partner'
 : 'e.g. shipped in release 1.2'
 }
 className="w-full text-xs bg-card border border-amber-200 dark:border-amber-900 rounded px-2 py-1.5 outline-none mb-2"
 autoFocus
 />
 <div className="flex gap-2">
 <button
 onClick={commitStatus}
 className="text-xs px-3 py-1 bg-amber-600 hover:bg-amber-700 text-primary-foreground rounded"
 >
 Confirm
 </button>
 <button
 onClick={() => {
 setStatusPending(null);
 setStatusReason('');
 }}
 className="text-xs px-3 py-1 text-muted-foreground hover:bg-muted rounded"
 >
 Skip
 </button>
 </div>
 </div>
 )}

 {/* Labels */}
 <div className="mt-4 flex items-center gap-1.5 flex-wrap">
 {(task.labels ?? []).map((l: any) => (
 <LabelChip
 key={l.id}
 label={l}
 onRemove={() =>
 handleLabelsChange((task.labels ?? []).filter((x: any) => x.id !== l.id).map((x: any) => x.id))
 }
 />
 ))}
 <LabelPicker
 projectLabels={projectLabels}
 selectedIds={(task.labels ?? []).map((l: any) => l.id)}
 onChange={handleLabelsChange}
 onCreate={handleCreateLabel}
 />
 </div>

 {/* Description */}
 <div className="mt-6">
 <div className="flex items-center justify-between mb-2">
 <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
 Description
 </h3>
 {descSaving && <span className="text-[10px] text-muted-foreground/70">Saving…</span>}
 {!descSaving && descDirty && <span className="text-[10px] text-muted-foreground/70">Unsaved</span>}
 </div>
 <div data-color-mode="light">
 <MDEditor
 value={description ?? ''}
 onChange={(v) => {
 setDescription(v ?? '');
 setDescDirty(true);
 }}
 height={200}
 preview="edit"
 visibleDragbar={false}
 textareaProps={{ placeholder: 'Add a description… supports markdown' }}
 />
 </div>
 </div>

 {/* Subtasks */}
 {(task.subtasks?.length > 0 || true) && (
 <div className="mt-6">
 <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
 Subtasks ({task.subtasks?.length ?? 0})
 </h3>
 <div className="space-y-1">
 {(task.subtasks ?? []).map((st: any) => (
 <div
 key={st.id}
 className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/30 text-sm"
 >
 <span className="font-mono text-[10px] text-muted-foreground/70 w-12">
 {st.slug ?? `T-${st.id}`}
 </span>
 <StatusChip status={st.status} compact />
 <span className="flex-1 truncate">{st.title}</span>
 </div>
 ))}
 <div className="flex gap-2 mt-2">
 <input
 value={newSubtask}
 onChange={(e) => setNewSubtask(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
 placeholder="+ Add subtask..."
 className="flex-1 text-xs bg-transparent border border-dashed border-border rounded px-2 py-1.5 outline-none focus:border-border"
 />
 </div>
 </div>
 </div>
 )}

 {/* Activity & comments */}
 <div className="mt-8">
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
 Activity & comments
 </h3>
 <div className="flex gap-1">
 {(['all', 'comments', 'status_changes', 'assignments'] as const).map((f) => (
 <button
 key={f}
 onClick={() => setFilter(f)}
 className={cn(
 'text-[10px] px-2 py-0.5 rounded transition-colors',
 filter === f
 ? 'bg-card text-primary-foreground '
 : 'text-muted-foreground hover:bg-muted ',
 )}
 >
 {f.replace('_', ' ')}
 </button>
 ))}
 </div>
 </div>
 <ActivityTimeline
 activity={task.activity ?? []}
 comments={task.comments ?? []}
 resolveUserName={resolveName}
 filter={filter}
 />
 </div>
 </div>

 {/* Sticky comment composer */}
 <div className="border-t border-border p-3 bg-card flex-shrink-0">
 <div className="flex items-start gap-2">
 {currentUserId && (
 <Avatar id={currentUserId} name={users.find((u: any) => u.id === currentUserId)?.name} size={24} />
 )}
 <div className="flex-1">
 <textarea
 value={comment}
 onChange={(e) => setComment(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
 e.preventDefault();
 handleComment();
 }
 }}
 placeholder="Write a comment… (Cmd+Enter to post)"
 className="w-full text-sm bg-transparent border border-border rounded px-3 py-2 outline-none focus:border-border resize-none"
 rows={2}
 />
 <div className="flex justify-end mt-1">
 <button
 onClick={handleComment}
 disabled={!comment.trim()}
 className="text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground"
 >
 Post
 </button>
 </div>
 </div>
 </div>
 </div>
 </>
 ) : (
 <div className="flex-1 flex items-center justify-center text-muted-foreground/70 text-sm">
 Loading task…
 </div>
 )}
 </div>
 </>
 );
}

function EffortChip({
 effort,
 onChange,
}: {
 effort: string | null | undefined;
 onChange: (v: string) => void;
}) {
 const [open, setOpen] = useState(false);
 const ref = useRef<HTMLDivElement>(null);
 useEffect(() => {
 if (!open) return;
 const onClick = (e: MouseEvent) => {
 if (!ref.current?.contains(e.target as Node)) setOpen(false);
 };
 document.addEventListener('mousedown', onClick);
 return () => document.removeEventListener('mousedown', onClick);
 }, [open]);
 return (
 <div ref={ref} className="relative inline-block">
 <button
 onClick={() => setOpen((v) => !v)}
 className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border border-border bg-muted/30 hover:bg-muted"
 >
 <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Effort</span>
 <span className="font-medium">{effort ? effort.toUpperCase() : '—'}</span>
 </button>
 {open && (
 <div className="absolute z-50 mt-1 w-28 rounded-md border border-border bg-card shadow-lg p-1">
 {['xs', 's', 'm', 'l', 'xl'].map((e) => (
 <button
 key={e}
 onClick={() => {
 onChange(e);
 setOpen(false);
 }}
 className="w-full text-left text-xs px-2 py-1 rounded hover:bg-muted"
 >
 {e.toUpperCase()}
 </button>
 ))}
 </div>
 )}
 </div>
 );
}
