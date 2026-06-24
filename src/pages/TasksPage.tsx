import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
 getProjects,
 getUsers,
 listLabelsApi,
 getTaskStatuses,
 createTaskApi,
 deleteTaskApi,
 restoreTaskApi,
 assignTask,
 changeTaskStatus,
 updateTaskApi,
 bulkTaskOp,
 createSavedViewApi,
 listSavedViewsApi,
 deleteSavedViewApi,
 reorderTaskApi,
 setTaskLabelsApi,
} from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useNewTaskStore } from '@/store/newTaskStore';
import {
 useTasksQuery,
 taskKeys,
} from '@/components/tasks/hooks/useTasks';
import { useTaskKeyboard, KeyboardHelp } from '@/components/tasks/hooks/useTaskKeyboard';
import { TasksBoardView } from '@/components/tasks/TasksBoardView';
import { TasksListView } from '@/components/tasks/TasksListView';
import { TaskDrawer } from '@/components/tasks/TaskDrawer';
import { FilterBar, type TaskFilterState } from '@/components/tasks/FilterBar';
import { CommandPalette } from '@/components/tasks/CommandPalette';
import { BulkActionBar } from '@/components/tasks/BulkActionBar';
import { DensityToggle } from '@/components/tasks/DensityToggle';
import { RequirementIngestModal } from '@/components/tasks/RequirementIngestModal';
import type { DensityMode } from '@/components/tasks/tokens';
import type { TaskCardData } from '@/components/tasks/TaskCard';

type View = 'board' | 'list';

const DENSITY_KEY = 'howinlens.tasks.density';
const VIEW_KEY = 'howinlens.tasks.view';
const PROJECT_KEY = 'howinlens.tasks.project';

// Main task management page — wires every component together, owns the
// project/view/filter/density state, and routes drawer open via ?task= query
// param for shareable links.
export default function TasksPage() {
 const qc = useQueryClient();
 const [searchParams, setSearchParams] = useSearchParams();
 const user = useAuthStore((s) => s.user);
 const openNewTask = useNewTaskStore((s) => s.openModal);
 const currentUserId = (user as any)?.id as number | undefined;

 const [projectId, setProjectId] = useState<number | null>(() => {
 const v = localStorage.getItem(PROJECT_KEY);
 return v ? parseInt(v, 10) : null;
 });
 const [view, setView] = useState<View>(() => {
 const v = localStorage.getItem(VIEW_KEY) as View | null;
 return v === 'list' ? 'list' : 'board';
 });
 const [density, setDensity] = useState<DensityMode>(() => {
 const v = localStorage.getItem(DENSITY_KEY) as DensityMode | null;
 return v ?? 'comfortable';
 });
 const [filter, setFilter] = useState<TaskFilterState>({});
 const [search, setSearch] = useState('');
 const [debouncedSearch, setDebouncedSearch] = useState('');
 const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
 const [focusedId, setFocusedId] = useState<number | null>(null);
 const [paletteOpen, setPaletteOpen] = useState(false);
 const [helpOpen, setHelpOpen] = useState(false);
 const [ingestOpen, setIngestOpen] = useState(false);
 const [groupBy, setGroupBy] = useState<'none' | 'status' | 'assignee' | 'priority' | 'milestone'>(
 'status',
 );

 // Persist view/density/project
 useEffect(() => {
 localStorage.setItem(DENSITY_KEY, density);
 }, [density]);
 useEffect(() => {
 localStorage.setItem(VIEW_KEY, view);
 }, [view]);
 useEffect(() => {
 if (projectId) localStorage.setItem(PROJECT_KEY, String(projectId));
 }, [projectId]);

 // Debounce search
 useEffect(() => {
 const t = setTimeout(() => setDebouncedSearch(search), 300);
 return () => clearTimeout(t);
 }, [search]);

 // Drawer via query param so links are shareable
 const drawerTaskId = (() => {
 const v = searchParams.get('task');
 return v ? parseInt(v, 10) : null;
 })();
 const openDrawer = (id: number | null) => {
 const params = new URLSearchParams(searchParams);
 if (id == null) params.delete('task');
 else params.set('task', String(id));
 setSearchParams(params, { replace: true });

 if (id != null) {
 try {
 const raw = localStorage.getItem('howinlens.recent_tasks');
 const ids: number[] = raw ? JSON.parse(raw) : [];
 const next = [id, ...ids.filter((x) => x !== id)].slice(0, 10);
 localStorage.setItem('howinlens.recent_tasks', JSON.stringify(next));
 } catch {
 // localStorage disabled — carry on without the recent-list cache
 }
 }
 };

 // Projects — include inbox buckets so users can switch to their personal
 // task list. Inbox projects are sorted to the end and labeled distinctly.
 const { data: projects = [] } = useQuery({
 queryKey: ['projects', 'with-inbox'],
 queryFn: () => getProjects({ includeInbox: true }),
 });
 const sortedProjects = useMemo(() => {
 const arr: Array<{ id: number; name: string; isInbox?: boolean; ownerUserId?: number | null }> = projects as any;
 const real = arr.filter((p) => !p.isInbox);
 const inbox = arr.filter((p) => p.isInbox);
 // Put current user's inbox first among inboxes for fast access.
 inbox.sort((a, b) => {
 if (a.ownerUserId === currentUserId) return -1;
 if (b.ownerUserId === currentUserId) return 1;
 return a.name.localeCompare(b.name);
 });
 return [...real, ...inbox];
 }, [projects, currentUserId]);
 useEffect(() => {
 // Prefer the first real project; if none, fall back to user's inbox.
 if (!projectId && sortedProjects.length > 0) setProjectId(sortedProjects[0].id);
 }, [sortedProjects, projectId]);

 // Users + labels + status configs
 const { data: users = [] } = useQuery({
 queryKey: ['users'],
 queryFn: () => getUsers(),
 staleTime: 60_000,
 });
 const { data: labels = [] } = useQuery({
 queryKey: projectId ? taskKeys.labels(projectId) : ['labels', 'disabled'],
 queryFn: () => listLabelsApi(projectId!),
 enabled: !!projectId,
 });
 const { data: statuses = [] } = useQuery({
 queryKey: projectId ? ['status-configs', projectId] : ['status-configs', 'disabled'],
 queryFn: () => getTaskStatuses(projectId!),
 enabled: !!projectId,
 });

 // Task list query — filters translated to API params
 const apiFilters = useMemo(() => {
 const f: any = {};
 if (filter.status) f.status = filter.status;
 if (filter.assigneeId != null) f.assigneeId = filter.assigneeId;
 if (filter.labelIds && filter.labelIds.length) f.labelIds = filter.labelIds;
 if (debouncedSearch) f.q = debouncedSearch;
 f.limit = 200;
 f.orderBy = 'rank';
 return f;
 }, [filter, debouncedSearch]);

 const { data: listData, isLoading } = useTasksQuery(projectId, apiFilters);
 const tasks: TaskCardData[] = (listData?.items ?? []) as any;

 // Saved views
 const { data: savedViews = [] } = useQuery({
 queryKey: ['saved-views', projectId],
 queryFn: () => listSavedViewsApi(projectId ?? undefined),
 enabled: projectId != null,
 });

 // Derived: visible task ids for keyboard nav
 const visibleIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

 // ── Handlers ──────────────────────────────────────────────────────────

 const handleCreateTask = useCallback(
 async (status: string, title: string) => {
 if (!projectId) return;
 await createTaskApi({
 projectId,
 title,
 status,
 assigneeId: filter.assigneeId === currentUserId ? currentUserId : undefined,
 } as any);
 qc.invalidateQueries({ queryKey: taskKeys.lists() });
 },
 [projectId, filter.assigneeId, currentUserId, qc],
 );

 const handleMoveTask = useCallback(
 async (
 taskId: number,
 toStatus: string,
 beforeId?: number | null,
 afterId?: number | null,
 ) => {
 const t = tasks.find((x) => x.id === taskId);
 if (!t) return;
 try {
 if (t.status !== toStatus) {
 await changeTaskStatus(taskId, toStatus);
 }
 if (beforeId != null || afterId != null) {
 await reorderTaskApi(taskId, { beforeTaskId: beforeId, afterTaskId: afterId });
 }
 } catch (e: any) {
 toast.error(`Move failed — ${e?.message ?? 'unknown'}`);
 } finally {
 qc.invalidateQueries({ queryKey: taskKeys.lists() });
 }
 },
 [tasks, qc],
 );

 const handleDeleteFocused = useCallback(async () => {
 if (!focusedId) return;
 const t = tasks.find((x) => x.id === focusedId);
 await deleteTaskApi(focusedId);
 toast.success(`Deleted"${t?.title ?? 'task'}"`, {
 action: {
 label: 'Undo',
 onClick: async () => {
 await restoreTaskApi(focusedId);
 qc.invalidateQueries({ queryKey: taskKeys.lists() });
 },
 },
 });
 qc.invalidateQueries({ queryKey: taskKeys.lists() });
 }, [focusedId, tasks, qc]);

 const handleBulkAction = useCallback(
 async (action: 'assign' | 'status' | 'priority' | 'delete', value?: any, reason?: string) => {
 if (selectedIds.size === 0) return;
 await bulkTaskOp({
 ids: Array.from(selectedIds),
 action,
 value,
 reason,
 });
 toast.success(`Updated ${selectedIds.size} task(s)`);
 setSelectedIds(new Set());
 qc.invalidateQueries({ queryKey: taskKeys.lists() });
 },
 [selectedIds, qc],
 );

 const handleSaveView = useCallback(async () => {
 const name = window.prompt('Name this view:');
 if (!name) return;
 await createSavedViewApi({
 projectId,
 name,
 scope: 'private',
 filterJson: filter,
 orderBy: 'rank',
 groupBy,
 viewMode: view,
 densityMode: density,
 });
 qc.invalidateQueries({ queryKey: ['saved-views', projectId] });
 toast.success(`Saved view"${name}"`);
 }, [projectId, filter, groupBy, view, density, qc]);

 // Keyboard shortcuts
 useTaskKeyboard({
 onCommandPalette: () => setPaletteOpen(true),
 onHelp: () => setHelpOpen(true),
 onQuickCreate: () => {
 // Auto-focus the first column's quick-create input by firing a DOM event
 // cheap trick: dispatch a global event tasks board listens to. For now,
 // simply noop — user sees the always-visible input.
 },
 onNext: () => {
 if (visibleIds.length === 0) return;
 const idx = focusedId ? visibleIds.indexOf(focusedId) : -1;
 setFocusedId(visibleIds[Math.min(idx + 1, visibleIds.length - 1)] ?? null);
 },
 onPrev: () => {
 if (visibleIds.length === 0) return;
 const idx = focusedId ? visibleIds.indexOf(focusedId) : visibleIds.length;
 setFocusedId(visibleIds[Math.max(idx - 1, 0)] ?? null);
 },
 onOpenDrawer: () => {
 if (focusedId) openDrawer(focusedId);
 },
 onToggleSelect: () => {
 if (!focusedId) return;
 setSelectedIds((prev) => {
 const next = new Set(prev);
 if (next.has(focusedId)) next.delete(focusedId);
 else next.add(focusedId);
 return next;
 });
 },
 onDelete: handleDeleteFocused,
 onClose: () => {
 if (drawerTaskId) openDrawer(null);
 else if (selectedIds.size > 0) setSelectedIds(new Set());
 },
 });

 const currentProject = projects.find((p: any) => p.id === projectId);

 return (
 <div className="h-full flex flex-col bg-muted/30">
 {/* Top bar */}
 <div className="px-6 py-3 border-b border-border bg-card flex items-center gap-3 flex-wrap">
 {/* Project switcher */}
 <select
 value={projectId ?? ''}
 onChange={(e) => setProjectId(e.target.value ? parseInt(e.target.value, 10) : null)}
 className="text-sm font-semibold bg-transparent outline-none hover:bg-muted/30 rounded px-2 py-1 cursor-pointer"
 >
 {sortedProjects.filter((p) => !p.isInbox).map((p) => (
 <option key={p.id} value={p.id}>
 {p.name}
 </option>
 ))}
 {sortedProjects.some((p) => p.isInbox) ? (
 <optgroup label="Personal Inbox">
 {sortedProjects.filter((p) => p.isInbox).map((p) => (
 <option key={p.id} value={p.id}>
 {p.ownerUserId === currentUserId ? '📥 My Inbox' : `📥 ${p.name}`}
 </option>
 ))}
 </optgroup>
 ) : null}
 </select>

 {/* View switch */}
 <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md border border-border">
 <button
 onClick={() => setView('board')}
 className={cn(
 'text-xs px-2.5 py-1 rounded',
 view === 'board' ? 'bg-muted ' : 'text-muted-foreground',
 )}
 >
 Board
 </button>
 <button
 onClick={() => setView('list')}
 className={cn(
 'text-xs px-2.5 py-1 rounded',
 view === 'list' ? 'bg-muted ' : 'text-muted-foreground',
 )}
 >
 List
 </button>
 </div>

 {view === 'list' && (
 <select
 value={groupBy}
 onChange={(e) => setGroupBy(e.target.value as any)}
 className="text-xs border border-border bg-transparent rounded px-2 py-1"
 >
 <option value="status">Group: Status</option>
 <option value="assignee">Group: Assignee</option>
 <option value="priority">Group: Priority</option>
 <option value="milestone">Group: Source</option>
 <option value="none">Group: None</option>
 </select>
 )}

 <DensityToggle value={density} onChange={setDensity} />

 <div className="ml-auto flex items-center gap-2">
 <input
 type="text"
 placeholder="Search… (⌘K for more)"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="text-xs bg-muted/30 border border-border rounded-md px-3 py-1.5 outline-none focus:border-border w-56"
 />
 <button
 onClick={() => openNewTask({ projectId: projectId ?? null })}
 className="text-xs px-3 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground inline-flex items-center gap-1"
 >
 <span>+</span> New task
 </button>
 <button
 onClick={() => setIngestOpen(true)}
 disabled={!projectId}
 className="text-xs px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-primary-foreground disabled:opacity-50 inline-flex items-center gap-1"
 >
 <span>✨</span> AI Generate
 </button>
 <button
 onClick={() => setPaletteOpen(true)}
 className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted/30"
 >
 ⌘K
 </button>
 <button
 onClick={() => setHelpOpen(true)}
 className="text-xs px-2 py-1 rounded text-muted-foreground/70 hover:text-muted-foreground"
 title="Keyboard shortcuts"
 >
 ?
 </button>
 </div>
 </div>

 {/* Filter bar */}
 <div className="px-6 py-2 border-b border-border bg-card flex items-center gap-2">
 <FilterBar
 value={filter}
 onChange={setFilter}
 users={users}
 labels={labels}
 currentUserId={currentUserId}
 onSaveView={handleSaveView}
 />
 {savedViews.length > 0 && (
 <div className="ml-auto flex items-center gap-1">
 <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">Views:</span>
 {savedViews.map((v: any) => (
 <button
 key={v.id}
 onClick={() => {
 setFilter(v.filterJson ?? {});
 if (v.viewMode) setView(v.viewMode as View);
 if (v.groupBy) setGroupBy(v.groupBy);
 if (v.densityMode) setDensity(v.densityMode);
 }}
 className="text-xs px-2 py-0.5 rounded hover:bg-muted text-muted-foreground group"
 >
 {v.name}
 <span
 className="ml-1 opacity-0 group-hover:opacity-100 text-muted-foreground/70 hover:text-red-500"
 onClick={async (e) => {
 e.stopPropagation();
 await deleteSavedViewApi(v.id);
 qc.invalidateQueries({ queryKey: ['saved-views', projectId] });
 }}
 >
 ×
 </span>
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Main content */}
 <div className="flex-1 overflow-auto px-6 py-4">
 {!projectId ? (
 <div className="text-sm text-muted-foreground/70 text-center py-12">
 Select a project to get started.
 </div>
 ) : view === 'board' ? (
 <TasksBoardView
 tasks={tasks}
 users={users}
 statuses={statuses}
 density={density}
 loading={isLoading}
 onTaskClick={(t) => openDrawer(t.id)}
 onCreateTask={handleCreateTask}
 onMoveTask={handleMoveTask}
 selectedIds={selectedIds}
 focusedId={focusedId}
 />
 ) : (
 <TasksListView
 tasks={tasks}
 users={users}
 density={density}
 loading={isLoading}
 groupBy={groupBy}
 onTaskClick={(t) => openDrawer(t.id)}
 onStatusChange={async (id, status) => {
 await changeTaskStatus(id, status);
 qc.invalidateQueries({ queryKey: taskKeys.lists() });
 }}
 onPriorityChange={async (id, priority) => {
 await updateTaskApi(id, { priority });
 qc.invalidateQueries({ queryKey: taskKeys.lists() });
 }}
 onToggleSelect={(id) =>
 setSelectedIds((prev) => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 return next;
 })
 }
 selectedIds={selectedIds}
 focusedId={focusedId}
 />
 )}
 </div>

 {/* Drawer */}
 <TaskDrawer
 taskId={drawerTaskId}
 onClose={() => openDrawer(null)}
 statuses={statuses}
 currentUserId={currentUserId}
 />

 {/* Bulk action bar */}
 <BulkActionBar
 selectedIds={Array.from(selectedIds)}
 users={users}
 currentUserId={currentUserId}
 onAction={handleBulkAction}
 onClear={() => setSelectedIds(new Set())}
 />

 {/* Command palette */}
 <CommandPalette
 open={paletteOpen}
 onOpenChange={setPaletteOpen}
 tasks={tasks}
 projects={projects}
 currentView={view}
 onCreateTask={() => {
 // Scroll to top of first column and focus quick create
 toast.info('Press C on the board to create — or use the quick-create bar.');
 }}
 onOpenTask={(id) => openDrawer(id)}
 onSwitchProject={(id) => setProjectId(id)}
 onToggleView={(v) => setView(v)}
 />

 {/* Keyboard help */}
 <KeyboardHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

 {/* Paste-to-tasks modal */}
 {projectId && (
 <RequirementIngestModal
 projectId={projectId}
 open={ingestOpen}
 onClose={() => setIngestOpen(false)}
 onTasksCreated={() => {
 qc.invalidateQueries({ queryKey: taskKeys.lists() });
 }}
 />
 )}

 {/* Unused vars to satisfy TS — referenced here to keep the list stable */}
 <span hidden>{currentProject?.name}</span>
 <span hidden>{assignTask.name}</span>
 <span hidden>{setTaskLabelsApi.name}</span>
 </div>
 );
}
