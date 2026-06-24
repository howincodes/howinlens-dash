import { useEffect, useState, useMemo } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { TaskCardData } from './TaskCard';

interface CommandPaletteProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 tasks: TaskCardData[];
 projects: Array<{ id: number; name: string }>;
 onCreateTask?: () => void;
 onOpenTask?: (taskId: number) => void;
 onSwitchProject?: (projectId: number) => void;
 onToggleView?: (view: 'board' | 'list') => void;
 currentView?: 'board' | 'list';
}

export function CommandPalette({
 open,
 onOpenChange,
 tasks,
 projects,
 onCreateTask,
 onOpenTask,
 onSwitchProject,
 onToggleView,
 currentView,
}: CommandPaletteProps) {
 const navigate = useNavigate();
 const [search, setSearch] = useState('');

 // Toggle with Cmd+K from anywhere
 useEffect(() => {
 const onKey = (e: KeyboardEvent) => {
 if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
 e.preventDefault();
 onOpenChange(!open);
 }
 };
 document.addEventListener('keydown', onKey);
 return () => document.removeEventListener('keydown', onKey);
 }, [open, onOpenChange]);

 // Recent tasks from localStorage
 const recent = useMemo(() => {
 try {
 const raw = localStorage.getItem('howinlens.recent_tasks');
 const ids: number[] = raw ? JSON.parse(raw) : [];
 return ids.map((id) => tasks.find((t) => t.id === id)).filter(Boolean) as TaskCardData[];
 } catch {
 return [];
 }
 }, [tasks, open]);

 if (!open) return null;

 return (
 <div
 className="fixed inset-0 z-[100] bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh]"
 onClick={() => onOpenChange(false)}
 >
 <div
 className="w-full max-w-xl mx-4 rounded-xl shadow-2xl bg-card border border-border overflow-hidden"
 onClick={(e) => e.stopPropagation()}
 >
 <Command shouldFilter loop>
 <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
 <span className="text-muted-foreground/70 text-lg">⌘</span>
 <Command.Input
 value={search}
 onValueChange={setSearch}
 placeholder="Type a command or search tasks…"
 className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/70"
 autoFocus
 />
 <kbd className="text-[10px] text-muted-foreground/70 px-1.5 py-0.5 rounded border border-border">
 Esc
 </kbd>
 </div>
 <Command.List className="max-h-[50vh] overflow-y-auto p-1">
 <Command.Empty className="px-4 py-6 text-center text-xs text-muted-foreground/70">
 No results.
 </Command.Empty>

 <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/70">
 {onCreateTask && (
 <Item
 icon="✨"
 label="Create new task"
 shortcut="C"
 onSelect={() => {
 onCreateTask();
 onOpenChange(false);
 }}
 />
 )}
 {onToggleView && (
 <Item
 icon="☰"
 label={`Switch to ${currentView === 'board' ? 'List' : 'Board'} view`}
 shortcut="V"
 onSelect={() => {
 onToggleView(currentView === 'board' ? 'list' : 'board');
 onOpenChange(false);
 }}
 />
 )}
 <Item
 icon="📋"
 label="Go to Tasks"
 onSelect={() => {
 navigate('/tasks');
 onOpenChange(false);
 }}
 />
 <Item
 icon="🏗"
 label="Go to Projects"
 onSelect={() => {
 navigate('/projects');
 onOpenChange(false);
 }}
 />
 <Item
 icon="📈"
 label="Go to AI Insights"
 onSelect={() => {
 navigate('/ai-insights');
 onOpenChange(false);
 }}
 />
 </Command.Group>

 {recent.length > 0 && (
 <Command.Group heading="Recent tasks">
 {recent.map((t) => (
 <Item
 key={`recent-${t.id}`}
 icon="⏱"
 label={`${t.slug ?? `T-${t.id}`} · ${t.title}`}
 onSelect={() => {
 onOpenTask?.(t.id);
 onOpenChange(false);
 }}
 />
 ))}
 </Command.Group>
 )}

 <Command.Group heading="Tasks">
 {tasks.slice(0, 20).map((t) => (
 <Item
 key={`task-${t.id}`}
 icon="▪"
 label={`${t.slug ?? `T-${t.id}`} · ${t.title}`}
 onSelect={() => {
 onOpenTask?.(t.id);
 onOpenChange(false);
 }}
 />
 ))}
 </Command.Group>

 {projects.length > 0 && (
 <Command.Group heading="Projects">
 {projects.map((p) => (
 <Item
 key={`proj-${p.id}`}
 icon="🏗"
 label={p.name}
 onSelect={() => {
 onSwitchProject?.(p.id);
 onOpenChange(false);
 }}
 />
 ))}
 </Command.Group>
 )}
 </Command.List>
 </Command>
 </div>
 </div>
 );
}

function Item({
 icon,
 label,
 shortcut,
 onSelect,
}: {
 icon?: string;
 label: string;
 shortcut?: string;
 onSelect: () => void;
}) {
 return (
 <Command.Item
 onSelect={onSelect}
 className={cn(
 'flex items-center gap-2 px-2 py-1.5 text-sm rounded cursor-pointer',
 'aria-selected:bg-muted aria-selected:',
 )}
 >
 {icon && <span className="w-4 text-center text-xs text-muted-foreground">{icon}</span>}
 <span className="flex-1 truncate">{label}</span>
 {shortcut && (
 <kbd className="text-[10px] text-muted-foreground/70 px-1.5 py-0.5 rounded border border-border">
 {shortcut}
 </kbd>
 )}
 </Command.Item>
 );
}
