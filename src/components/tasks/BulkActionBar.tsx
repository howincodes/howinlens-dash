import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AssigneePicker } from './AssigneePicker';
import { STATUS_META, PRIORITY_META, statusMeta, priorityMeta } from './tokens';

interface BulkActionBarProps {
 selectedIds: number[];
 users: Array<{ id: number; name: string }>;
 currentUserId?: number;
 onAction: (action: 'assign' | 'status' | 'priority' | 'delete', value?: any, reason?: string) => Promise<void> | void;
 onClear: () => void;
}

// Slides up from bottom when >= 1 tasks are selected. Hosts all bulk
// operations in one bar so users don't hunt for them.
export function BulkActionBar({ selectedIds, users, currentUserId, onAction, onClear }: BulkActionBarProps) {
 const [statusOpen, setStatusOpen] = useState(false);
 const [priorityOpen, setPriorityOpen] = useState(false);
 const [reason, setReason] = useState('');
 const [needsReason, setNeedsReason] = useState<null | { action: 'assign' | 'status'; value: any }>(null);

 if (selectedIds.length === 0) return null;

 const confirmReassign = () => {
 if (!needsReason) return;
 onAction(needsReason.action, needsReason.value, reason || undefined);
 setNeedsReason(null);
 setReason('');
 };

 return (
 <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
 <div className="rounded-xl bg-card text-primary-foreground shadow-2xl border border-border flex items-center gap-1.5 px-2 py-1.5 backdrop-blur">
 <span className="text-xs font-semibold px-2">
 {selectedIds.length} selected
 </span>
 <div className="h-5 w-px bg-border" />

 {/* Assign */}
 <div className="relative">
 <AssigneePicker
 users={users}
 assigneeId={null}
 currentUserId={currentUserId}
 onChange={(id) => setNeedsReason({ action: 'assign', value: id })}
 trigger="button"
 />
 </div>

 {/* Status */}
 <div className="relative">
 <button
 onClick={() => setStatusOpen((v) => !v)}
 className="text-xs px-2 py-1 rounded hover:bg-accent"
 >
 Status ▾
 </button>
 {statusOpen && (
 <div className="absolute bottom-full mb-1 left-0 w-36 rounded-md border border-border bg-card shadow-lg p-1 text-foreground">
 {Object.keys(STATUS_META).map((k) => (
 <button
 key={k}
 onClick={() => {
 setStatusOpen(false);
 setNeedsReason({ action: 'status', value: k });
 }}
 className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted"
 >
 {statusMeta(k).label}
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Priority */}
 <div className="relative">
 <button
 onClick={() => setPriorityOpen((v) => !v)}
 className="text-xs px-2 py-1 rounded hover:bg-accent"
 >
 Priority ▾
 </button>
 {priorityOpen && (
 <div className="absolute bottom-full mb-1 left-0 w-36 rounded-md border border-border bg-card shadow-lg p-1 text-foreground">
 {Object.keys(PRIORITY_META).map((k) => (
 <button
 key={k}
 onClick={() => {
 setPriorityOpen(false);
 onAction('priority', k);
 }}
 className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted"
 >
 {priorityMeta(k).label}
 </button>
 ))}
 </div>
 )}
 </div>

 <div className="h-5 w-px bg-border" />

 <button
 onClick={() => {
 if (!confirm(`Delete ${selectedIds.length} task(s)? (Soft delete, can undo.)`)) return;
 onAction('delete');
 }}
 className="text-xs px-2 py-1 rounded hover:bg-red-600 hover:text-primary-foreground transition-colors"
 >
 Delete
 </button>

 <button
 onClick={onClear}
 className={cn(
 'text-xs px-2 py-1 rounded hover:bg-accent ',
 )}
 >
 Clear
 </button>
 </div>

 {/* Reason prompt (bulk reassign/status with existing values) */}
 {needsReason && (
 <div className="mt-2 rounded-xl bg-amber-50 dark:bg-amber-950 border border-amber-300 dark:border-amber-900 p-3 shadow-lg">
 <div className="text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">
 Reason? (optional — lands in activity log for all {selectedIds.length})
 </div>
 <input
 value={reason}
 onChange={(e) => setReason(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') confirmReassign();
 if (e.key === 'Escape') {
 setNeedsReason(null);
 setReason('');
 }
 }}
 placeholder="e.g. rebalancing sprint load"
 className="w-full text-xs bg-card border border-amber-200 dark:border-amber-900 rounded px-2 py-1.5 outline-none"
 autoFocus
 />
 <div className="flex gap-2 mt-2">
 <button
 onClick={confirmReassign}
 className="text-xs px-3 py-1 bg-amber-600 hover:bg-amber-700 text-primary-foreground rounded"
 >
 Confirm
 </button>
 <button
 onClick={() => {
 setNeedsReason(null);
 setReason('');
 }}
 className="text-xs px-3 py-1 text-muted-foreground hover:bg-muted rounded"
 >
 Skip
 </button>
 </div>
 </div>
 )}
 </div>
 );
}
