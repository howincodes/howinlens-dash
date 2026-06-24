import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
 getProjects,
 deleteProjectApi,
 getProjectMembersApi,
 getProjectRepositories,
 getTasksPage,
 getUsers,
} from '@/lib/api';
import CreateProjectModal from '@/components/CreateProjectModal';
import { cn } from '@/lib/utils';
import { Search, Plus, Archive, Users, GitBranch, CheckSquare, ChevronRight } from 'lucide-react';
import { AvatarStack } from '@/components/tasks/Avatar';
import { STATUS_META } from '@/components/tasks/tokens';
import { EmptyState } from '@/components/tasks/EmptyState';

// Industry-level project index — card grid with real stats per card,
// search + status filter, archived section collapsed by default.
//
// Each card shows: name, description, member avatars, repo count, task
// status breakdown (mini bars), overdue count, last activity.
export default function Projects() {
 const [showCreate, setShowCreate] = useState(false);
 const [search, setSearch] = useState('');
 const [filter, setFilter] = useState<'active' | 'archived' | 'all'>('active');

 const { data: projects = [], refetch } = useQuery({
 queryKey: ['projects'],
 queryFn: () => getProjects(),
 });

 const { data: users = [] } = useQuery({
 queryKey: ['users'],
 queryFn: () => getUsers(),
 staleTime: 60_000,
 });

 const filtered = useMemo(() => {
 let list = projects as any[];
 if (filter !== 'all') list = list.filter((p) => (p.status ?? 'active') === filter);
 if (search.trim()) {
 const q = search.toLowerCase();
 list = list.filter(
 (p) =>
 p.name.toLowerCase().includes(q) ||
 (p.description ?? '').toLowerCase().includes(q),
 );
 }
 return list;
 }, [projects, filter, search]);

 const handleArchive = async (id: number) => {
 if (!confirm('Archive this project? You can unarchive it later from Settings.')) return;
 await deleteProjectApi(id);
 refetch();
 };

 return (
 <div className="max-w-7xl mx-auto px-6 py-6">
 {/* Header */}
 <div className="flex items-start justify-between gap-3 mb-6">
 <div>
 <h1 className="text-2xl font-bold">Projects</h1>
 <p className="text-xs text-muted-foreground mt-0.5">
 {projects.length} total · {projects.filter((p: any) => (p.status ?? 'active') === 'active').length} active
 </p>
 </div>
 <button
 onClick={() => setShowCreate(true)}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-primary-foreground text-sm font-medium"
 >
 <Plus className="h-4 w-4" /> New project
 </button>
 </div>

 <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={refetch} />

 {/* Search + filter bar */}
 <div className="flex items-center gap-3 mb-6">
 <div className="relative flex-1 max-w-sm">
 <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
 <input
 type="text"
 placeholder="Search projects..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full text-sm pl-8 pr-3 py-2 rounded-md bg-muted/30 border border-border outline-none focus:border-border"
 />
 </div>
 <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md border border-border bg-muted/30">
 {(['active', 'archived', 'all'] as const).map((f) => (
 <button
 key={f}
 onClick={() => setFilter(f)}
 className={cn(
 'text-xs px-2.5 py-1 rounded transition-colors capitalize',
 filter === f
 ? 'bg-card shadow-sm text-foreground '
 : 'text-muted-foreground hover:text-foreground',
 )}
 >
 {f}
 </button>
 ))}
 </div>
 </div>

 {/* Grid */}
 {filtered.length === 0 ? (
 <EmptyState
 icon="🏗"
 title={search ? 'No projects match' : 'No projects yet'}
 description={
 search
 ? 'Try removing the search or changing the filter.'
 : 'Create your first project to start managing tasks and tracking work.'
 }
 actions={
 !search && (
 <button
 onClick={() => setShowCreate(true)}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-primary-foreground text-sm"
 >
 <Plus className="h-4 w-4" /> New project
 </button>
 )
 }
 />
 ) : (
 <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
 {filtered.map((project: any) => (
 <ProjectCard
 key={project.id}
 project={project}
 users={users}
 onArchive={() => handleArchive(project.id)}
 />
 ))}
 </div>
 )}
 </div>
 );
}

function ProjectCard({
 project,
 users,
 onArchive,
}: {
 project: any;
 users: Array<{ id: number; name: string }>;
 onArchive: () => void;
}) {
 const { data: members = [] } = useQuery({
 queryKey: ['project-members', project.id],
 queryFn: () => getProjectMembersApi(project.id),
 staleTime: 30_000,
 });
 const { data: repos = [] } = useQuery({
 queryKey: ['project-repos', project.id],
 queryFn: () => getProjectRepositories(project.id),
 staleTime: 30_000,
 });
 const { data: tasksPage } = useQuery({
 queryKey: ['project-tasks-summary', project.id],
 queryFn: () => getTasksPage(project.id, { limit: 200, orderBy: 'rank' }),
 staleTime: 30_000,
 });

 const tasks = tasksPage?.items ?? [];
 const statusCounts = tasks.reduce((acc: Record<string, number>, t: any) => {
 acc[t.status] = (acc[t.status] || 0) + 1;
 return acc;
 }, {});
 const totalTasks = tasks.length;
 const doneTasks = statusCounts.done ?? 0;
 const overdue = tasks.filter(
 (t: any) => t.dueAt && new Date(t.dueAt).getTime() < Date.now() && t.status !== 'done',
 ).length;

 const memberList = (members as any[]).map((m) => ({
 id: m.userId,
 name: m.userName ?? users.find((u) => u.id === m.userId)?.name ?? `User #${m.userId}`,
 }));

 const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

 return (
 <div className="group rounded-lg border border-border bg-card hover:border-border hover:shadow-sm transition-all overflow-hidden">
 {/* Header */}
 <Link to={`/projects/${project.id}`} className="block px-4 pt-4 pb-3">
 <div className="flex items-start justify-between gap-2 mb-1.5">
 <h3 className="font-semibold text-sm text-foreground truncate">
 {project.name}
 </h3>
 <span
 className={cn(
 'text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0',
 project.status === 'archived'
 ? 'bg-muted text-muted-foreground '
 : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
 )}
 >
 {project.status ?? 'active'}
 </span>
 </div>
 {project.description && (
 <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[2em]">
 {project.description}
 </p>
 )}
 </Link>

 {/* Task progress */}
 <div className="px-4 pb-3">
 <div className="flex items-center justify-between mb-1.5 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
 <span>Tasks</span>
 <span className="tabular-nums">{doneTasks}/{totalTasks} done</span>
 </div>
 <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden flex">
 {(['open', 'in_progress', 'blocked', 'done'] as const).map((status) => {
 const count = statusCounts[status] ?? 0;
 if (count === 0) return null;
 const pct = (count / totalTasks) * 100;
 const meta = STATUS_META[status];
 return (
 <div
 key={status}
 className={cn('h-full', meta?.bar)}
 style={{ width: `${pct}%` }}
 title={`${count} ${meta?.label.toLowerCase()}`}
 />
 );
 })}
 </div>
 <div className="flex items-center gap-2 mt-1.5 text-[10px]">
 {Object.entries(statusCounts).map(([status, count]) => (
 <span key={status} className="flex items-center gap-1 text-muted-foreground">
 <span className={cn('h-1 w-1 rounded-full', STATUS_META[status]?.dot ?? 'bg-muted-foreground/40')} />
 {count as number}
 </span>
 ))}
 {totalTasks === 0 && <span className="text-muted-foreground/70 italic">No tasks yet</span>}
 {overdue > 0 && (
 <span className="ml-auto text-rose-600 font-semibold">{overdue} overdue</span>
 )}
 </div>
 </div>

 {/* Meta row */}
 <div className="px-4 py-2.5 border-t border-border flex items-center gap-3 text-[11px] text-muted-foreground">
 <div className="flex items-center gap-1.5">
 <Users className="h-3 w-3" />
 <AvatarStack users={memberList} max={4} size={16} />
 </div>
 <div className="flex items-center gap-1 ml-auto">
 <GitBranch className="h-3 w-3" />
 <span className="tabular-nums">{repos.length ?? 0}</span>
 </div>
 <div className="flex items-center gap-1">
 <CheckSquare className="h-3 w-3" />
 <span className="tabular-nums">{totalTasks}</span>
 </div>
 </div>

 {/* Footer */}
 <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground/70 bg-muted/40">
 <span>{progress > 0 ? `${progress}% complete` : 'Not started'}</span>
 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={(e) => {
 e.preventDefault();
 onArchive();
 }}
 className="text-muted-foreground/70 hover:text-rose-600 inline-flex items-center gap-1"
 title="Archive"
 >
 <Archive className="h-3 w-3" />
 </button>
 <Link
 to={`/projects/${project.id}`}
 className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
 >
 Open <ChevronRight className="h-3 w-3" />
 </Link>
 </div>
 </div>
 </div>
 );
}
