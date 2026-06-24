import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { devGetSuggestions, devRespondSuggestion } from '@/lib/api';

interface SuggestionsInboxProps {
 onOpenTask?: (id: number) => void;
 compact?: boolean;
}

// Section 3 — suggestions inbox for the dev dashboard Today tab. Shows
// pending AI suggestions with accept/dismiss/snooze actions. Suggestions
// never write to tasks.status silently — accepting likely_done triggers
// a status=done update with"Accepted AI suggestion" as the reason.
export function SuggestionsInbox({ onOpenTask, compact }: SuggestionsInboxProps) {
 const qc = useQueryClient();
 const { data: suggestions = [], refetch } = useQuery({
 queryKey: ['dev-suggestions'],
 queryFn: () => devGetSuggestions(),
 refetchInterval: 60_000,
 });

 const respond = async (
 id: number,
 decision: 'accepted' | 'dismissed' | 'snoozed',
 extra?: any,
 ) => {
 try {
 await devRespondSuggestion(id, { decision, ...extra });
 toast.success(
 decision === 'accepted'
 ? 'Applied'
 : decision === 'snoozed'
 ? 'Snoozed for 1 day'
 : 'Dismissed',
 );
 refetch();
 qc.invalidateQueries({ queryKey: ['dev-my-tasks'] });
 } catch (e: any) {
 toast.error(`Failed — ${e?.message ?? 'unknown'}`);
 }
 };

 const kindMeta: Record<string, { icon: string; label: string; color: string }> = {
 likely_done: {
 icon: '✓',
 label: 'Looks done',
 color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
 },
 progressed: {
 icon: '→',
 label: 'Progressed',
 color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
 },
 blocked: {
 icon: '⏸',
 label: 'Looks blocked',
 color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
 },
 mismatch: {
 icon: '?',
 label: 'Commits don\'t match',
 color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
 },
 };

 if (suggestions.length === 0) {
 if (compact) return null;
 return (
 <div className="rounded-lg border border-border p-4 text-center">
 <div className="text-2xl mb-1">💡</div>
 <div className="text-xs font-semibold text-muted-foreground">
 No AI suggestions right now
 </div>
 <div className="text-[11px] text-muted-foreground/70 mt-0.5">
 Check back after your next coding session
 </div>
 </div>
 );
 }

 return (
 <div className="rounded-lg border border-border bg-card overflow-hidden">
 <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="text-sm">💡</span>
 <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
 AI noticed
 </span>
 <span className="text-[10px] text-muted-foreground/70 tabular-nums">
 {suggestions.length} pending
 </span>
 </div>
 </div>
 <div className="divide-y divide-border">
 {suggestions.map((s: any) => {
 const meta = kindMeta[s.kind] ?? kindMeta.progressed;
 const confidence = Math.round(Number(s.confidence) * 100);
 return (
 <div key={s.id} className="p-3">
 <div className="flex items-start gap-2 mb-1.5">
 <span
 className={cn(
 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0',
 meta?.color,
 )}
 >
 <span>{meta?.icon}</span> {meta?.label}
 </span>
 <button
 onClick={() => onOpenTask?.(s.taskId)}
 className="text-xs font-semibold text-foreground hover:underline truncate flex-1 text-left"
 >
 <span className="font-mono text-[10px] text-muted-foreground/70 mr-1">
 {s.taskSlug ?? `T-${s.taskId}`}
 </span>
 {s.taskTitle}
 </button>
 <span className="text-[10px] text-muted-foreground/70 tabular-nums flex-shrink-0">{confidence}%</span>
 </div>
 {s.evidence && (
 <div className="text-[11px] text-muted-foreground italic border-l-2 border-border pl-2 mb-2">
"{s.evidence}"
 </div>
 )}
 <div className="flex items-center gap-1.5">
 {s.kind === 'likely_done' ? (
 <button
 onClick={() =>
 respond(s.id, 'accepted', {
 acceptStatus: 'done',
 acceptReason: 'Accepted AI suggestion',
 })
 }
 className="text-[11px] px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-primary-foreground"
 >
 Mark done
 </button>
 ) : s.kind === 'blocked' ? (
 <button
 onClick={() =>
 respond(s.id, 'accepted', {
 acceptStatus: 'blocked',
 acceptReason: 'Accepted AI suggestion',
 })
 }
 className="text-[11px] px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-primary-foreground"
 >
 Mark blocked
 </button>
 ) : (
 <button
 onClick={() => onOpenTask?.(s.taskId)}
 className="text-[11px] px-2 py-1 rounded border border-border hover:bg-muted/30"
 >
 Open task
 </button>
 )}
 <button
 onClick={() => respond(s.id, 'dismissed')}
 className="text-[11px] px-2 py-1 rounded text-muted-foreground hover:bg-muted"
 >
 Dismiss
 </button>
 <button
 onClick={() => respond(s.id, 'snoozed', { snoozeDays: 1 })}
 className="text-[11px] px-2 py-1 rounded text-muted-foreground hover:bg-muted"
 >
 Snooze 1d
 </button>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
}
