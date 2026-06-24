import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
 submitRequirement,
 getRequirement,
 approveRequirementSuggestions,
 rejectRequirementSuggestions,
 getProjectMembersApi,
 getUsers,
} from '@/lib/api';
import { PriorityChip } from './PriorityChip';
import { AssigneePicker } from './AssigneePicker';

interface RequirementIngestModalProps {
 projectId: number;
 open: boolean;
 onClose: () => void;
 onTasksCreated?: (taskIds: number[]) => void;
}

type Stage = 'input' | 'generating' | 'review' | 'saving';

// End-to-end paste-to-tasks flow. Three stages:
// 1. Input — textarea + optional target assignees + submit
// 2. Generating — polls every 2s, shows a spinner + elapsed time
// 3. Review — editable suggestion cards, checkbox selection, save
//
// Handles edge cases: AI returns zero tasks (empty state + retry), errors
// (inline banner + retry), long requirements (cost hint).
export function RequirementIngestModal({
 projectId,
 open,
 onClose,
 onTasksCreated,
}: RequirementIngestModalProps) {
 const [stage, setStage] = useState<Stage>('input');
 const [content, setContent] = useState('');
 const [requirementId, setRequirementId] = useState<number | null>(null);
 const [requirement, setRequirement] = useState<any>(null);
 // members is the canonical assignee list — only users already on the project.
 // `users` is the full directory, used only to resolve names/emails.
 const [members, setMembers] = useState<any[]>([]);
 const [users, setUsers] = useState<any[]>([]);
 const [error, setError] = useState<string | null>(null);
 const [elapsed, setElapsed] = useState(0);
 const [edits, setEdits] = useState<Record<number, any>>({});
 const [rejectedIds, setRejectedIds] = useState<Set<number>>(new Set());
 const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
 const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
 const startRef = useRef<number>(0);

 useEffect(() => {
 if (open) {
 setStage('input');
 setContent('');
 setRequirementId(null);
 setRequirement(null);
 setError(null);
 setElapsed(0);
 setEdits({});
 setRejectedIds(new Set());
 setSelectedIds(new Set());
 // Fetch project members + full user directory in parallel.
 Promise.all([
 getProjectMembersApi(projectId).catch(() => []),
 getUsers().catch(() => []),
 ]).then(([m, u]) => {
 setMembers(Array.isArray(m) ? m : []);
 setUsers(Array.isArray(u) ? u : []);
 });
 }
 return () => {
 if (pollRef.current) clearInterval(pollRef.current);
 };
 }, [open, projectId]);

 useEffect(() => {
 if (!open) return;
 const onKey = (e: KeyboardEvent) => {
 if (e.key === 'Escape' && stage !== 'generating') onClose();
 };
 document.addEventListener('keydown', onKey);
 return () => document.removeEventListener('keydown', onKey);
 }, [open, stage, onClose]);

 const tokensEstimate = Math.ceil(content.length / 4);
 const costHint = tokensEstimate > 5000;

 const handleSubmit = async () => {
 if (!content.trim()) return;
 setError(null);
 setStage('generating');
 startRef.current = Date.now();
 try {
 // Always pass the full project member list as targets — the AI can
 // only assign to someone who's actually on the project, but the final
 // human assignment happens per-task in the review screen.
 const targetAssigneeIds = members.map((m: any) => m.userId);
 const res = await submitRequirement({
 projectId,
 content: content.trim(),
 targetAssigneeIds: targetAssigneeIds.length ? targetAssigneeIds : undefined,
 });
 setRequirementId(res.id);
 startPolling(res.id);
 } catch (e: any) {
 setError(e?.message ?? 'Failed to submit');
 setStage('input');
 }
 };

 const startPolling = (id: number) => {
 if (pollRef.current) clearInterval(pollRef.current);
 pollRef.current = setInterval(async () => {
 try {
 const full = await getRequirement(id);
 setElapsed(Math.round((Date.now() - startRef.current) / 1000));
 if (full.status === 'ready') {
 setRequirement(full);
 setSelectedIds(
 new Set(
 full.suggestions
 .filter((s: any) => Number(s.confidence) >= 0.6)
 .map((s: any) => s.id),
 ),
 );
 setStage('review');
 clearInterval(pollRef.current!);
 pollRef.current = null;
 } else if (full.status === 'failed') {
 setError(full.error || 'AI failed to generate suggestions');
 setStage('input');
 clearInterval(pollRef.current!);
 pollRef.current = null;
 }
 } catch (e) {
 // transient, keep polling
 }
 }, 2000);
 };

 const handleApprove = async () => {
 if (!requirementId || !requirement) return;
 setStage('saving');
 try {
 const { createdTaskIds } = await approveRequirementSuggestions(requirementId, {
 selectedIds: Array.from(selectedIds),
 edits,
 });
 toast.success(`${createdTaskIds.length} tasks created`);
 onTasksCreated?.(createdTaskIds);
 onClose();
 } catch (e: any) {
 setError(e?.message ?? 'Failed to approve');
 setStage('review');
 }
 };

 const handleReject = async () => {
 if (!requirementId) return;
 if (!confirm('Reject all suggestions and discard?')) return;
 await rejectRequirementSuggestions(requirementId);
 onClose();
 };

 const toggleSelected = (id: number) => {
 setSelectedIds((prev) => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 return next;
 });
 };

 const removeSuggestion = (id: number) => {
 setRejectedIds((prev) => new Set(prev).add(id));
 setSelectedIds((prev) => {
 const next = new Set(prev);
 next.delete(id);
 return next;
 });
 };

 const updateEdit = (id: number, patch: any) => {
 setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
 };

 if (!open) return null;

 const visibleSuggestions = (requirement?.suggestions ?? []).filter(
 (s: any) => !rejectedIds.has(s.id),
 );

 return (
 <div
 className="fixed inset-0 z-50 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[5vh]"
 onClick={() => stage !== 'generating' && onClose()}
 >
 <div
 className="w-full max-w-3xl mx-4 max-h-[90vh] rounded-xl shadow-2xl bg-card border border-border flex flex-col"
 onClick={(e) => e.stopPropagation()}
 >
 {/* Header */}
 <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
 <div>
 <h2 className="text-lg font-bold flex items-center gap-2">
 <span className="text-purple-500">✨</span> AI task generator
 </h2>
 <p className="text-xs text-muted-foreground mt-0.5">
 Paste notes, PRDs, or feature descriptions — AI turns them into tasks
 </p>
 </div>
 <button
 onClick={onClose}
 disabled={stage === 'generating'}
 className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30"
 >
 ×
 </button>
 </div>

 {error && (
 <div className="mx-5 mt-3 px-3 py-2 rounded border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
 {error}
 </div>
 )}

 {/* Body */}
 <div className="flex-1 overflow-y-auto px-5 py-4">
 {stage === 'input' && (
 <div className="space-y-4">
 <div>
 <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
 Raw input
 </label>
 <textarea
 value={content}
 onChange={(e) => setContent(e.target.value)}
 placeholder={
 'Paste meeting notes, a PRD, a feature request, or an email thread…\n\nExample:\n"Password reset flow needs implementing. POST /auth/reset with email verification, rate-limited at 3/hour. Also need an email template that matches the design system. And update the rate-limit config for the new endpoint."'
 }
 className="w-full min-h-[220px] text-sm bg-muted/30 border border-border rounded-md px-3 py-2 outline-none focus:border-border resize-y font-mono"
 />
 <div className="flex justify-between mt-1">
 <div className="text-[10px] text-muted-foreground/70">
 {content.length.toLocaleString()} chars · ~{tokensEstimate.toLocaleString()} tokens
 </div>
 {costHint && (
 <div className="text-[10px] text-amber-600">
 ⚠ Long input — consider splitting into smaller sections
 </div>
 )}
 </div>
 </div>

 <div className="text-[11px] text-muted-foreground/70 italic">
 AI will generate tasks. You can assign them to project members after
 review in the next step.
 </div>
 </div>
 )}

 {stage === 'generating' && (
 <div className="flex flex-col items-center justify-center py-16">
 <div className="text-4xl mb-4 animate-pulse">✨</div>
 <div className="text-sm font-semibold">Reading your requirements…</div>
 <div className="text-xs text-muted-foreground mt-1">
 {elapsed > 0 ? `${elapsed}s elapsed` : 'Waiting in queue…'}
 </div>
 <div className="mt-6 w-48 h-1 bg-muted rounded overflow-hidden">
 <div className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500 animate-pulse" style={{ width: '60%' }} />
 </div>
 </div>
 )}

 {stage === 'review' && requirement && (
 <div className="space-y-4">
 {requirement.aiSummary && (
 <div className="rounded-md border border-border bg-muted/30 p-3">
 <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
 AI summary
 </div>
 <div className="text-xs text-foreground">{requirement.aiSummary}</div>
 </div>
 )}

 {visibleSuggestions.length === 0 ? (
 <div className="text-center py-12">
 <div className="text-4xl mb-2">🤷</div>
 <div className="text-sm font-semibold">No tasks found</div>
 <div className="text-xs text-muted-foreground mt-1">
 AI didn't find anything actionable. Try rewording or a more specific section.
 </div>
 </div>
 ) : (
 <>
 <div className="text-xs text-muted-foreground mb-2">
 Generated {visibleSuggestions.length} task(s) · {selectedIds.size} selected
 </div>
 {visibleSuggestions.map((s: any) => {
 const edit = edits[s.id] ?? {};
 const selected = selectedIds.has(s.id);
 const confidence = Number(s.confidence ?? 0);
 const currentAssigneeId =
 edit.assigneeId !== undefined ? edit.assigneeId : (s.suggestedAssigneeId ?? null);
 return (
 <div
 key={s.id}
 className={cn(
 'rounded-md border p-3 transition-colors',
 selected
 ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900'
 : 'border-border bg-card ',
 )}
 >
 <div className="flex items-start gap-2">
 <input
 type="checkbox"
 checked={selected}
 onChange={() => toggleSelected(s.id)}
 className="mt-1 flex-shrink-0"
 />
 <div className="flex-1 min-w-0">
 <input
 value={edit.title ?? s.title}
 onChange={(e) => updateEdit(s.id, { title: e.target.value })}
 className="w-full text-sm font-semibold bg-transparent outline-none border-b border-transparent focus:border-border pb-0.5"
 />
 <textarea
 value={edit.description ?? s.description ?? ''}
 onChange={(e) => updateEdit(s.id, { description: e.target.value })}
 placeholder="Description…"
 className="w-full text-xs text-muted-foreground bg-transparent outline-none mt-1 resize-none"
 rows={2}
 />
 <div className="flex items-center gap-2 flex-wrap mt-2">
 <PriorityChip
 priority={edit.priority ?? s.suggestedPriority}
 onChange={(p) => updateEdit(s.id, { priority: p })}
 compact
 />
 <AssigneePicker
 users={members.map((m: any) => ({
 id: m.userId,
 name:
 m.userName ??
 users.find((u: any) => u.id === m.userId)?.name ??
 `User #${m.userId}`,
 email: users.find((u: any) => u.id === m.userId)?.email,
 }))}
 assigneeId={currentAssigneeId}
 onChange={(id) => updateEdit(s.id, { assigneeId: id })}
 compact
 />
 {(s.suggestedLabelNames ?? []).map((n: string) => (
 <span
 key={n}
 className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
 >
 {n}
 </span>
 ))}
 {s.suggestedDueHint && (
 <span className="text-[10px] text-muted-foreground/70 italic">
 Due: {s.suggestedDueHint}
 </span>
 )}
 </div>
 <div className="mt-2 flex items-center gap-2">
 <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
 <div
 className={cn(
 'h-full',
 confidence >= 0.8
 ? 'bg-emerald-500'
 : confidence >= 0.6
 ? 'bg-amber-500'
 : 'bg-muted-foreground/40',
 )}
 style={{ width: `${Math.round(confidence * 100)}%` }}
 />
 </div>
 <span className="text-[10px] text-muted-foreground/70 tabular-nums">
 {Math.round(confidence * 100)}%
 </span>
 <button
 onClick={() => removeSuggestion(s.id)}
 className="text-[10px] text-muted-foreground/70 hover:text-red-500 ml-2"
 >
 Remove
 </button>
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </>
 )}
 </div>
 )}

 {stage === 'saving' && (
 <div className="flex flex-col items-center justify-center py-16">
 <div className="text-4xl mb-4 animate-bounce">💾</div>
 <div className="text-sm font-semibold">Creating tasks…</div>
 </div>
 )}
 </div>

 {/* Footer */}
 <div className="flex items-center justify-between px-5 py-3 border-t border-border flex-shrink-0">
 <div className="text-[10px] text-muted-foreground/70">
 {stage === 'input' && 'AI will respond in ~10s'}
 {stage === 'generating' && 'Polling every 2s'}
 {stage === 'review' && `${selectedIds.size} of ${visibleSuggestions.length} selected`}
 </div>
 <div className="flex gap-2">
 {stage === 'input' && (
 <>
 <button
 onClick={onClose}
 className="text-xs px-3 py-1.5 rounded-md text-muted-foreground hover:bg-muted"
 >
 Cancel
 </button>
 <button
 onClick={handleSubmit}
 disabled={!content.trim()}
 className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-primary-foreground disabled:opacity-50"
 >
 Generate tasks
 </button>
 </>
 )}
 {stage === 'review' && (
 <>
 <button
 onClick={handleReject}
 className="text-xs px-3 py-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
 >
 Reject all
 </button>
 <button
 onClick={() => setStage('input')}
 className="text-xs px-3 py-1.5 rounded-md text-muted-foreground hover:bg-muted"
 >
 Edit raw input
 </button>
 <button
 onClick={handleApprove}
 disabled={selectedIds.size === 0}
 className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-primary-foreground disabled:opacity-50"
 >
 Save {selectedIds.size} task(s)
 </button>
 </>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}
