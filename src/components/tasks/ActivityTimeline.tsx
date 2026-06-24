import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from './Avatar';

export interface ActivityEntry {
 id: number;
 action: string;
 userId: number;
 userName?: string | null;
 oldValue?: string | null;
 newValue?: string | null;
 reason?: string | null;
 createdAt: string;
}

export interface CommentEntry {
 id: number;
 userId: number;
 userName?: string | null;
 content: string;
 createdAt: string;
}

interface ActivityTimelineProps {
 activity: ActivityEntry[];
 comments: CommentEntry[];
 resolveUserName?: (id: number) => string | undefined;
 filter?: 'all' | 'comments' | 'status_changes' | 'assignments';
}

// Unified stream: activity log entries + comments, merged and sorted
// chronologically. Groups by day ("Today","Yesterday","Apr 10").
export function ActivityTimeline({
 activity,
 comments,
 resolveUserName,
 filter = 'all',
}: ActivityTimelineProps) {
 const entries = useMemo(() => {
 const actEntries: Array<{ kind: 'activity'; sortKey: number; data: ActivityEntry }> = activity
 .filter((a) => {
 if (filter === 'comments') return a.action === 'commented';
 if (filter === 'status_changes') return a.action === 'status_changed';
 if (filter === 'assignments') return a.action === 'assigned';
 return true;
 })
 .map((a) => ({ kind: 'activity' as const, sortKey: new Date(a.createdAt).getTime(), data: a }));
 const commentEntries: Array<{ kind: 'comment'; sortKey: number; data: CommentEntry }> = (filter === 'all' || filter === 'comments'
 ? comments
 : []
 ).map((c) => ({ kind: 'comment' as const, sortKey: new Date(c.createdAt).getTime(), data: c }));
 return [...actEntries, ...commentEntries].sort((a, b) => b.sortKey - a.sortKey);
 }, [activity, comments, filter]);

 const grouped = useMemo(() => {
 const byDay: Record<string, typeof entries> = {};
 for (const e of entries) {
 const d = new Date(e.sortKey);
 const key = d.toDateString();
 if (!byDay[key]) byDay[key] = [];
 byDay[key]!.push(e);
 }
 return Object.entries(byDay);
 }, [entries]);

 const dayLabel = (key: string) => {
 const today = new Date().toDateString();
 const yesterday = new Date(Date.now() - 86_400_000).toDateString();
 if (key === today) return 'Today';
 if (key === yesterday) return 'Yesterday';
 return new Date(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
 };

 return (
 <div className="space-y-5">
 {grouped.map(([dayKey, dayEntries]) => (
 <div key={dayKey}>
 <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
 {dayLabel(dayKey)}
 </div>
 <div className="space-y-2">
 {dayEntries.map((e) => {
 if (e.kind === 'comment') return <CommentBubble key={`c-${e.data.id}`} c={e.data} resolveUserName={resolveUserName} />;
 return <ActivityRow key={`a-${e.data.id}`} a={e.data} resolveUserName={resolveUserName} />;
 })}
 </div>
 </div>
 ))}
 {entries.length === 0 && (
 <div className="text-center text-xs text-muted-foreground/70 py-6">No activity yet</div>
 )}
 </div>
 );
}

function ActivityRow({ a, resolveUserName }: { a: ActivityEntry; resolveUserName?: (id: number) => string | undefined }) {
 const iconMap: Record<string, string> = {
 created: '✨',
 status_changed: '↻',
 assigned: '👤',
 commented: '💬',
 priority_changed: '⚡',
 due_changed: '📅',
 deleted: '🗑',
 restored: '♻',
 };
 const icon = iconMap[a.action] ?? '•';
 const userName = a.userName ?? resolveUserName?.(a.userId) ?? `User #${a.userId}`;
 const time = new Date(a.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

 const resolveValue = (v: string | null | undefined) => {
 if (!v) return v;
 if (a.action === 'assigned') {
 const n = parseInt(v, 10);
 return Number.isFinite(n) ? resolveUserName?.(n) ?? v : v;
 }
 return v;
 };

 const oldV = resolveValue(a.oldValue);
 const newV = resolveValue(a.newValue);

 return (
 <div className="flex items-start gap-2 text-xs text-muted-foreground">
 <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] flex-shrink-0">
 {icon}
 </div>
 <div className="flex-1 min-w-0">
 <div>
 <span className="font-medium text-foreground">{userName}</span>{' '}
 <span>{a.action.replace('_', ' ')}</span>
 {oldV && <span className="mx-1 line-through text-muted-foreground/70">{oldV}</span>}
 {newV && <span className="font-medium text-foreground">{newV}</span>}
 <span className="ml-2 text-[10px] text-muted-foreground/70 tabular-nums">{time}</span>
 </div>
 {a.reason && (
 <div className="mt-0.5 italic text-muted-foreground border-l-2 border-border pl-2">
"{a.reason}"
 </div>
 )}
 </div>
 </div>
 );
}

function CommentBubble({ c, resolveUserName }: { c: CommentEntry; resolveUserName?: (id: number) => string | undefined }) {
 const userName = c.userName ?? resolveUserName?.(c.userId) ?? `User #${c.userId}`;
 const time = new Date(c.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
 return (
 <div className="flex items-start gap-2">
 <Avatar id={c.userId} name={userName} size={20} className="mt-0.5" />
 <div className={cn('flex-1 min-w-0 rounded-lg bg-muted/30 border border-border p-2.5')}>
 <div className="flex items-center gap-2 mb-1">
 <span className="text-[11px] font-semibold text-foreground">{userName}</span>
 <span className="text-[10px] text-muted-foreground/70 tabular-nums">{time}</span>
 </div>
 <div className="text-xs text-foreground whitespace-pre-wrap">{c.content}</div>
 </div>
 </div>
 );
}
