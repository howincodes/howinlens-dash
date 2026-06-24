import { useState, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
 getProject,
 getProjectMembersApi,
 getUsers,
 addProjectMemberApi,
 removeProjectMemberApi,
 getTasksPage,
 getMilestones,
 getProjectRepositories,
 removeProjectRepositoryApi,
 updateProjectApi,
 getTaskStatuses,
 createTaskStatusApi,
 getGitCommits,
 listLabelsApi,
 changeTaskStatus,
 reorderTaskApi,
} from '@/lib/api';
import AddRepoModal from '@/components/AddRepoModal';
import HourlyHistogram from '@/components/activity/HourlyHistogram';
import { Avatar } from '@/components/tasks/Avatar';
import { TasksBoardView } from '@/components/tasks/TasksBoardView';
import { TaskDrawer } from '@/components/tasks/TaskDrawer';
import { RequirementIngestModal } from '@/components/tasks/RequirementIngestModal';
import { EmptyState } from '@/components/tasks/EmptyState';
import { STATUS_META } from '@/components/tasks/tokens';
import { cn } from '@/lib/utils';
import {
 ArrowLeft,
 Settings,
 CheckSquare,
 Users,
 Flag,
 GitBranch,
 Sparkles,
 Plus,
 Archive,
 Edit2,
} from 'lucide-react';

type Tab = 'overview' | 'tasks' | 'members' | 'milestones' | 'repositories' | 'settings';

// Industry-level project detail page. Pulls task data through TanStack Query
// so every child piece (board, drawer, suggestions) stays in sync. Replaces
// the old inline"AI Generate" tab with the new RequirementIngestModal
// triggered from the Tasks tab header.
export default function ProjectDetail() {
 const { id } = useParams();
 const projectId = parseInt(id || '0');
 const navigate = useNavigate();
 const qc = useQueryClient();

 const [tab, setTab] = useState<Tab>('overview');
 const [drawerTaskId, setDrawerTaskId] = useState<number | null>(null);
 const [ingestOpen, setIngestOpen] = useState(false);
 const [showAddRepo, setShowAddRepo] = useState(false);
 const [editingProject, setEditingProject] = useState(false);
 const [editData, setEditData] = useState({ name: '', description: '' });
 const [newStatusName, setNewStatusName] = useState('');
 const [newStatusColor, setNewStatusColor] = useState('#6B7280');

 // ── Queries ─────────────────────────────────────────────────────────────
 const { data: project, refetch: refetchProject } = useQuery({
 queryKey: ['project', projectId],
 queryFn: () => getProject(projectId),
 enabled: projectId > 0,
 });
 const { data: members = [], refetch: refetchMembers } = useQuery({
 queryKey: ['project-members', projectId],
 queryFn: () => getProjectMembersApi(projectId),
 enabled: projectId > 0,
 });
 const { data: allUsers = [] } = useQuery({
 queryKey: ['users'],
 queryFn: () => getUsers(),
 staleTime: 60_000,
 });
 const { data: tasksPage } = useQuery({
 queryKey: ['project-tasks', projectId],
 queryFn: () => getTasksPage(projectId, { limit: 500, orderBy: 'rank' }),
 enabled: projectId > 0,
 });
 const tasks = tasksPage?.items ?? [];
 const { data: milestones = [] } = useQuery({
 queryKey: ['project-milestones', projectId],
 queryFn: () => getMilestones(projectId),
 enabled: projectId > 0,
 });
 const { data: repos = [], refetch: refetchRepos } = useQuery({
 queryKey: ['project-repos', projectId],
 queryFn: () => getProjectRepositories(projectId),
 enabled: projectId > 0,
 });
 const { data: statuses = [], refetch: refetchStatuses } = useQuery({
 queryKey: ['project-statuses', projectId],
 queryFn: () => getTaskStatuses(projectId),
 enabled: projectId > 0,
 });
 const { data: labels = [] } = useQuery({
 queryKey: ['project-labels', projectId],
 queryFn: () => listLabelsApi(projectId),
 enabled: projectId > 0,
 });

 // Commits aggregated across all repos, for overview timeline
 const { data: commits = [] } = useQuery({
 queryKey: ['project-commits', projectId, (repos as any[]).map((r: any) => r.id).join(',')],
 queryFn: async () => {
 if (!Array.isArray(repos) || repos.length === 0) return [];
 const arrs = await Promise.all(
 (repos as any[]).map((r: any) => getGitCommits({ repoId: r.id }).catch(() => [])),
 );
 const all = arrs.flat() as any[];
 all.sort((a, b) => {
 const aT = a.authoredAt ? new Date(a.authoredAt).getTime() : 0;
 const bT = b.authoredAt ? new Date(b.authoredAt).getTime() : 0;
 return bT - aT;
 });
 return all;
 },
 enabled: (repos as any[]).length > 0,
 });

 // ── Derived data ────────────────────────────────────────────────────────
 const statusCounts = useMemo(() => {
 const out: Record<string, number> = {};
 for (const t of tasks) out[t.status] = (out[t.status] || 0) + 1;
 return out;
 }, [tasks]);

 const memberUsers = useMemo(
 () =>
 (members as any[]).map((m) => ({
 id: m.userId,
 name: m.userName ?? allUsers.find((u: any) => u.id === m.userId)?.name ?? `User #${m.userId}`,
 email: allUsers.find((u: any) => u.id === m.userId)?.email,
 })),
 [members, allUsers],
 );
 const memberIds = new Set(memberUsers.map((m: any) => m.id));
 const nonMembers = (allUsers as any[]).filter((u: any) => !memberIds.has(u.id));

 const recentCommits = commits.slice(0, 20);
 const projectHist = useMemo(() => {
 const hist: Record<string, number> = {};
 for (let h = 0; h < 24; h++) hist[String(h).padStart(2, '0')] = 0;
 const sevenDaysAgo = Date.now() - 7 * 86_400_000;
 for (const c of commits) {
 if (!c.authoredAt) continue;
 const ts = new Date(c.authoredAt).getTime();
 if (ts < sevenDaysAgo) continue;
 const hour = new Date(c.authoredAt).getHours();
 const key = String(hour).padStart(2, '0');
 hist[key] = (hist[key] ?? 0) + 1;
 }
 return hist;
 }, [commits]);

 const contributors = useMemo(() => {
 const byUser = new Map<number, { commits: number; lines: number }>();
 const sevenDaysAgo = Date.now() - 7 * 86_400_000;
 for (const c of commits) {
 if (!c.authoredAt || !c.userId) continue;
 if (new Date(c.authoredAt).getTime() < sevenDaysAgo) continue;
 const existing = byUser.get(c.userId) ?? { commits: 0, lines: 0 };
 existing.commits++;
 existing.lines += (c.additions ?? 0) + (c.deletions ?? 0);
 byUser.set(c.userId, existing);
 }
 return Array.from(byUser.entries())
 .map(([userId, v]) => ({
 userId,
 name: allUsers.find((u: any) => u.id === userId)?.name ?? `User #${userId}`,
 ...v,
 }))
 .sort((a, b) => b.commits - a.commits);
 }, [commits, allUsers]);

 // ── Handlers ────────────────────────────────────────────────────────────
 const handleAddMember = async (userId: number) => {
 await addProjectMemberApi(projectId, { userId });
 refetchMembers();
 };
 const handleRemoveMember = async (userId: number) => {
 await removeProjectMemberApi(projectId, userId);
 refetchMembers();
 };
 const handleSaveProject = async () => {
 if (!editData.name.trim()) return;
 await updateProjectApi(projectId, editData);
 refetchProject();
 setEditingProject(false);
 toast.success('Project updated');
 };
 const handleCreateStatus = async () => {
 if (!newStatusName.trim()) return;
 await createTaskStatusApi(projectId, { name: newStatusName, color: newStatusColor });
 refetchStatuses();
 setNewStatusName('');
 setNewStatusColor('#6B7280');
 };
 const handleArchive = async () => {
 if (!confirm('Archive this project?')) return;
 await updateProjectApi(projectId, { status: 'archived' });
 refetchProject();
 toast.success('Project archived');
 };
 const handleMoveTask = useCallback(
 async (taskId: number, toStatus: string, beforeId?: number | null, afterId?: number | null) => {
 const t = tasks.find((x: any) => x.id === taskId);
 if (!t) return;
 try {
 if (t.status !== toStatus) await changeTaskStatus(taskId, toStatus);
 if (beforeId != null || afterId != null) {
 await reorderTaskApi(taskId, { beforeTaskId: beforeId, afterTaskId: afterId });
 }
 } catch (e: any) {
 toast.error(`Move failed — ${e?.message ?? 'unknown'}`);
 } finally {
 qc.invalidateQueries({ queryKey: ['project-tasks', projectId] });
 }
 },
 [tasks, qc, projectId],
 );

 if (!project) {
 return <div className="p-6 text-center text-sm text-muted-foreground/70">Loading project…</div>;
 }

 const isArchived = project.status === 'archived';

 // Prep edit data when entering edit mode
 const startEdit = () => {
 setEditData({ name: project.name ?? '', description: project.description ?? '' });
 setEditingProject(true);
 };

 return (
 <div className="max-w-7xl mx-auto">
 {/* Header */}
 <div className="px-6 pt-6 pb-4">
 <button
 onClick={() => navigate('/work/projects')}
 className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
 >
 <ArrowLeft className="h-3 w-3" /> All projects
 </button>
 <div className="flex items-start justify-between gap-3 flex-wrap">
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2 mb-1">
 <h1 className="text-2xl font-bold">{project.name}</h1>
 <span
 className={cn(
 'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
 isArchived
 ? 'bg-muted text-muted-foreground '
 : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
 )}
 >
 {project.status ?? 'active'}
 </span>
 </div>
 {project.description && (
 <p className="text-sm text-muted-foreground">{project.description}</p>
 )}
 </div>
 <div className="flex items-center gap-2 flex-shrink-0">
 <button
 onClick={startEdit}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-muted/30 text-xs font-medium"
 >
 <Edit2 className="h-3 w-3" /> Edit
 </button>
 <button
 onClick={() => setTab('settings')}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border hover:bg-muted/30 text-xs font-medium"
 >
 <Settings className="h-3 w-3" /> Settings
 </button>
 </div>
 </div>

 {/* Quick stats row */}
 <div className="mt-4 grid grid-cols-4 gap-3">
 <StatPill icon={<CheckSquare className="h-3.5 w-3.5" />} label="Tasks" value={tasks.length} />
 <StatPill icon={<Users className="h-3.5 w-3.5" />} label="Members" value={memberUsers.length} />
 <StatPill icon={<Flag className="h-3.5 w-3.5" />} label="Milestones" value={(milestones as any[]).length} />
 <StatPill icon={<GitBranch className="h-3.5 w-3.5" />} label="Repos" value={(repos as any[]).length} />
 </div>
 </div>

 {/* Tab bar */}
 <div className="px-6 border-b border-border sticky top-0 bg-card z-10">
 <div className="flex gap-1">
 {(
 [
 { key: 'overview', label: 'Overview' },
 { key: 'tasks', label: `Tasks (${tasks.length})` },
 { key: 'members', label: `Members (${memberUsers.length})` },
 { key: 'milestones', label: `Milestones (${(milestones as any[]).length})` },
 { key: 'repositories', label: `Repositories (${(repos as any[]).length})` },
 { key: 'settings', label: 'Settings' },
 ] as Array<{ key: Tab; label: string }>
 ).map((t) => (
 <button
 key={t.key}
 onClick={() => setTab(t.key)}
 className={cn(
 'px-3 py-2 text-xs font-medium border-b-2 transition-colors',
 tab === t.key
 ? 'border-blue-500 text-foreground '
 : 'border-transparent text-muted-foreground hover:text-foreground ',
 )}
 >
 {t.label}
 </button>
 ))}
 </div>
 </div>

 {/* Tab content */}
 <div className="px-6 py-6">
 {tab === 'overview' && (
 <div className="space-y-6">
 {/* Task status distribution */}
 <div className="rounded-lg border border-border bg-card p-4">
 <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
 Task status distribution
 </div>
 {tasks.length === 0 ? (
 <div className="text-xs text-muted-foreground/70 italic py-2">No tasks yet</div>
 ) : (
 <>
 <div className="h-2 rounded-full bg-muted overflow-hidden flex">
 {Object.entries(statusCounts).map(([status, count]) => {
 const pct = ((count as number) / tasks.length) * 100;
 const meta = STATUS_META[status];
 return (
 <div
 key={status}
 className={cn('h-full', meta?.bar ?? 'bg-muted-foreground/40')}
 style={{ width: `${pct}%` }}
 />
 );
 })}
 </div>
 <div className="flex flex-wrap gap-3 mt-3 text-xs">
 {Object.entries(statusCounts).map(([status, count]) => {
 const meta = STATUS_META[status];
 return (
 <div key={status} className="flex items-center gap-1.5">
 <span className={cn('h-2 w-2 rounded-full', meta?.dot ?? 'bg-muted-foreground/40')} />
 <span className="text-muted-foreground">
 {meta?.label ?? status}
 </span>
 <span className="font-semibold tabular-nums">{count as number}</span>
 </div>
 );
 })}
 </div>
 </>
 )}
 </div>

 {/* Hourly histogram */}
 {Object.values(projectHist).some((v) => v > 0) && (
 <div className="rounded-lg border border-border bg-card p-4">
 <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
 Hourly activity · last 7 days
 </div>
 <HourlyHistogram histogram={projectHist} height={140} />
 </div>
 )}

 {/* Contributors */}
 {contributors.length > 0 && (
 <div className="rounded-lg border border-border bg-card overflow-hidden">
 <div className="px-4 py-2.5 border-b border-border bg-muted/30">
 <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
 Active contributors · last 7 days
 </div>
 </div>
 <div className="divide-y divide-border">
 {contributors.map((c) => (
 <div key={c.userId} className="flex items-center gap-3 px-4 py-2.5">
 <Avatar id={c.userId} name={c.name} size={24} />
 <span className="flex-1 text-sm font-medium truncate">{c.name}</span>
 <span className="text-xs text-muted-foreground tabular-nums">{c.commits} commits</span>
 <span className="text-xs text-muted-foreground/70 tabular-nums">
 +{c.lines.toLocaleString()}
 </span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Recent commits */}
 {recentCommits.length > 0 && (
 <div className="rounded-lg border border-border bg-card overflow-hidden">
 <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
 <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
 Recent commits
 </div>
 <Link to="/activity/commits" className="text-[11px] text-blue-600 hover:underline">
 View all
 </Link>
 </div>
 <div className="divide-y divide-border">
 {recentCommits.map((c: any) => (
 <div key={c.id} className="flex items-center gap-3 px-4 py-2 text-xs">
 <span className="font-mono text-[10px] text-muted-foreground/70 w-16 flex-shrink-0">
 {c.sha?.slice(0, 8)}
 </span>
 <span className="flex-1 truncate">{c.message?.split('\n')[0]}</span>
 <span className="text-muted-foreground flex-shrink-0">
 {c.authorLogin ?? c.authorName ?? '—'}
 </span>
 <span className="text-[10px] text-emerald-600 tabular-nums flex-shrink-0">
 +{c.additions ?? 0}
 </span>
 <span className="text-[10px] text-rose-600 tabular-nums flex-shrink-0">
 −{c.deletions ?? 0}
 </span>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {tab === 'tasks' && (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
 {tasks.length} tasks
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={() => setIngestOpen(true)}
 className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-primary-foreground text-xs font-medium"
 >
 <Sparkles className="h-3 w-3" /> AI Generate
 </button>
 <Link
 to={`/tasks?project=${projectId}`}
 className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-xs"
 >
 Full board →
 </Link>
 </div>
 </div>
 {tasks.length === 0 ? (
 <EmptyState
 icon="🎯"
 title="No tasks yet"
 description="Generate tasks from notes with AI, or head to the full board to create manually."
 actions={
 <button
 onClick={() => setIngestOpen(true)}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-primary-foreground text-sm"
 >
 <Sparkles className="h-4 w-4" /> AI Generate
 </button>
 }
 />
 ) : (
 <TasksBoardView
 tasks={tasks as any}
 users={allUsers}
 statuses={statuses as any[]}
 density="comfortable"
 onTaskClick={(t) => setDrawerTaskId(t.id)}
 onCreateTask={async () => {
 toast.info('Use the full board view for quick-create.');
 }}
 onMoveTask={handleMoveTask}
 />
 )}
 </div>
 )}

 {tab === 'members' && (
 <div className="max-w-2xl space-y-4">
 <div className="rounded-lg border border-border bg-card overflow-hidden">
 <div className="px-4 py-2.5 border-b border-border bg-muted/30">
 <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
 Current members · {memberUsers.length}
 </div>
 </div>
 {memberUsers.length === 0 ? (
 <div className="p-6 text-center text-xs text-muted-foreground/70">No members yet</div>
 ) : (
 <div className="divide-y divide-border">
 {memberUsers.map((m) => (
 <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
 <Avatar id={m.id} name={m.name} size={28} />
 <div className="flex-1 min-w-0">
 <div className="text-sm font-medium truncate">{m.name}</div>
 {m.email && (
 <div className="text-[11px] text-muted-foreground truncate">{m.email}</div>
 )}
 </div>
 <button
 onClick={() => handleRemoveMember(m.id)}
 className="text-xs text-muted-foreground/70 hover:text-rose-600"
 >
 Remove
 </button>
 </div>
 ))}
 </div>
 )}
 </div>

 {nonMembers.length > 0 && (
 <div className="rounded-lg border border-border bg-card overflow-hidden">
 <div className="px-4 py-2.5 border-b border-border bg-muted/30">
 <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
 Add members
 </div>
 </div>
 <div className="divide-y divide-border">
 {nonMembers.map((u: any) => (
 <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
 <Avatar id={u.id} name={u.name} size={24} />
 <div className="flex-1 min-w-0">
 <div className="text-sm truncate">{u.name}</div>
 <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
 </div>
 <button
 onClick={() => handleAddMember(u.id)}
 className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
 >
 <Plus className="h-3 w-3" /> Add
 </button>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {tab === 'milestones' && (
 <div className="max-w-2xl">
 {(milestones as any[]).length === 0 ? (
 <EmptyState icon="🚩" title="No milestones yet" description="Group tasks under milestones to track phased delivery." />
 ) : (
 <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
 {(milestones as any[]).map((ms: any) => (
 <div key={ms.id} className="px-4 py-3">
 <div className="flex items-center gap-2">
 <Flag className="h-3.5 w-3.5 text-muted-foreground/70" />
 <span className="text-sm font-medium">{ms.name}</span>
 <span
 className={cn(
 'text-[10px] px-1.5 py-0.5 rounded-full ml-auto',
 ms.status === 'done'
 ? 'bg-emerald-100 text-emerald-700'
 : 'bg-blue-100 text-blue-700',
 )}
 >
 {ms.status}
 </span>
 </div>
 {ms.description && (
 <p className="text-xs text-muted-foreground mt-1 ml-5">{ms.description}</p>
 )}
 {ms.dueDate && (
 <p className="text-[10px] text-muted-foreground/70 mt-1 ml-5">Due: {ms.dueDate}</p>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {tab === 'repositories' && (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
 {(repos as any[]).length} linked repositories
 </div>
 <button
 onClick={() => setShowAddRepo(true)}
 className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-primary-foreground text-xs font-medium"
 >
 <Plus className="h-3 w-3" /> Link repository
 </button>
 </div>
 <AddRepoModal
 open={showAddRepo}
 onClose={() => setShowAddRepo(false)}
 projectId={projectId}
 onAdded={() => refetchRepos()}
 />
 {(repos as any[]).length === 0 ? (
 <EmptyState
 icon="🔗"
 title="No repositories linked"
 description="Link a GitHub repo to start syncing commits and activity."
 />
 ) : (
 <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
 {(repos as any[]).map((r: any) => (
 <div key={r.id} className="flex items-center gap-3 px-4 py-3">
 <GitBranch className="h-3.5 w-3.5 text-muted-foreground/70 flex-shrink-0" />
 <div className="flex-1 min-w-0">
 <a
 href={r.githubRepoUrl}
 target="_blank"
 rel="noopener noreferrer"
 className="text-sm font-medium text-blue-600 hover:underline truncate block"
 >
 {r.githubRepoUrl}
 </a>
 {r.label && (
 <span className="text-[10px] text-muted-foreground">{r.label}</span>
 )}
 </div>
 <button
 onClick={async () => {
 await removeProjectRepositoryApi(r.id);
 refetchRepos();
 }}
 className="text-xs text-muted-foreground/70 hover:text-rose-600"
 >
 Unlink
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 )}

 {tab === 'settings' && (
 <div className="max-w-2xl space-y-6">
 {/* Project details */}
 <div className="rounded-lg border border-border bg-card p-4">
 <div className="flex items-center justify-between mb-3">
 <h3 className="text-sm font-semibold">Project details</h3>
 {!editingProject && (
 <button onClick={startEdit} className="text-xs text-blue-600 hover:underline">
 Edit
 </button>
 )}
 </div>
 {editingProject ? (
 <div className="space-y-3">
 <div>
 <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
 Name
 </label>
 <input
 type="text"
 value={editData.name}
 onChange={(e) => setEditData({ ...editData, name: e.target.value })}
 className="w-full text-sm bg-muted/30 border border-border rounded-md px-3 py-2 outline-none focus:border-border"
 />
 </div>
 <div>
 <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">
 Description
 </label>
 <textarea
 value={editData.description}
 onChange={(e) => setEditData({ ...editData, description: e.target.value })}
 className="w-full text-sm bg-muted/30 border border-border rounded-md px-3 py-2 outline-none focus:border-border resize-y"
 rows={3}
 />
 </div>
 <div className="flex gap-2">
 <button
 onClick={handleSaveProject}
 className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-primary-foreground"
 >
 Save
 </button>
 <button
 onClick={() => setEditingProject(false)}
 className="text-xs px-3 py-1.5 rounded-md text-muted-foreground hover:bg-muted"
 >
 Cancel
 </button>
 </div>
 </div>
 ) : (
 <div className="space-y-2 text-sm">
 <div className="flex justify-between gap-3">
 <span className="text-muted-foreground text-xs">Name</span>
 <span className="font-medium">{project.name}</span>
 </div>
 <div className="flex justify-between gap-3">
 <span className="text-muted-foreground text-xs">Description</span>
 <span className="text-right flex-1">{project.description || '—'}</span>
 </div>
 <div className="flex justify-between gap-3">
 <span className="text-muted-foreground text-xs">Created</span>
 <span>
 {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : '—'}
 </span>
 </div>
 </div>
 )}
 </div>

 {/* Custom statuses */}
 <div className="rounded-lg border border-border bg-card p-4">
 <h3 className="text-sm font-semibold mb-3">Custom task statuses</h3>
 {(statuses as any[]).length > 0 && (
 <div className="space-y-1.5 mb-3">
 {(statuses as any[]).map((s: any) => (
 <div
 key={s.id}
 className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/30"
 >
 <span
 className="h-2.5 w-2.5 rounded-full"
 style={{ backgroundColor: s.color ?? '#6B7280' }}
 />
 <span className="text-xs font-medium flex-1">{s.name}</span>
 {s.isDoneState && (
 <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
 DONE
 </span>
 )}
 </div>
 ))}
 </div>
 )}
 <div className="flex items-center gap-2">
 <input
 type="color"
 value={newStatusColor}
 onChange={(e) => setNewStatusColor(e.target.value)}
 className="h-8 w-8 rounded cursor-pointer border border-border"
 />
 <input
 type="text"
 value={newStatusName}
 onChange={(e) => setNewStatusName(e.target.value)}
 placeholder="New status name…"
 className="flex-1 text-sm bg-muted/30 border border-border rounded-md px-3 py-1.5 outline-none focus:border-border"
 />
 <button
 onClick={handleCreateStatus}
 disabled={!newStatusName.trim()}
 className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-primary-foreground disabled:opacity-50"
 >
 Add
 </button>
 </div>
 </div>

 {/* Labels list */}
 <div className="rounded-lg border border-border bg-card p-4">
 <h3 className="text-sm font-semibold mb-3">Labels · {(labels as any[]).length}</h3>
 {(labels as any[]).length === 0 ? (
 <p className="text-xs text-muted-foreground/70 italic">
 No labels yet. Create them from the Tasks page.
 </p>
 ) : (
 <div className="flex flex-wrap gap-1.5">
 {(labels as any[]).map((l: any) => (
 <span
 key={l.id}
 className="text-[11px] px-2 py-0.5 rounded-full text-primary-foreground font-medium"
 style={{ backgroundColor: l.color ?? '#64748b' }}
 >
 {l.name}
 </span>
 ))}
 </div>
 )}
 </div>

 {/* Danger zone */}
 {!isArchived && (
 <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20 p-4">
 <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-300 mb-1">
 Danger zone
 </h3>
 <p className="text-xs text-muted-foreground mb-3">
 Archiving hides this project from the active list. Can be reversed from the
 archived filter.
 </p>
 <button
 onClick={handleArchive}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-primary-foreground text-xs font-medium"
 >
 <Archive className="h-3 w-3" /> Archive project
 </button>
 </div>
 )}
 </div>
 )}
 </div>

 {/* Modals */}
 <TaskDrawer
 taskId={drawerTaskId}
 onClose={() => setDrawerTaskId(null)}
 statuses={statuses as any[]}
 />
 <RequirementIngestModal
 projectId={projectId}
 open={ingestOpen}
 onClose={() => setIngestOpen(false)}
 onTasksCreated={() => {
 qc.invalidateQueries({ queryKey: ['project-tasks', projectId] });
 }}
 />
 </div>
 );
}

function StatPill({
 icon,
 label,
 value,
}: {
 icon: React.ReactNode;
 label: string;
 value: number;
}) {
 return (
 <div className="rounded-lg border border-border bg-card px-3 py-2.5">
 <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
 {icon}
 {label}
 </div>
 <div className="text-2xl font-bold tabular-nums text-foreground">
 {value.toLocaleString()}
 </div>
 </div>
 );
}
