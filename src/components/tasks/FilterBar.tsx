import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { STATUS_META, PRIORITY_META, statusMeta, priorityMeta } from './tokens';

export interface TaskFilterState {
 status?: string;
 assigneeId?: number | null;
 priorityMin?: string;
 labelIds?: number[];
 dueBucket?: 'overdue' | 'today' | 'this_week' | 'no_date';
}

interface FilterBarProps {
 value: TaskFilterState;
 onChange: (next: TaskFilterState) => void;
 users: Array<{ id: number; name: string }>;
 labels: Array<{ id: number; name: string; color?: string | null }>;
 currentUserId?: number;
 onSaveView?: () => void;
}

type FilterKey = keyof TaskFilterState;

const FIELD_OPTIONS: Array<{ key: FilterKey; label: string; icon?: string }> = [
 { key: 'status', label: 'Status' },
 { key: 'assigneeId', label: 'Assignee' },
 { key: 'priorityMin', label: 'Priority' },
 { key: 'labelIds', label: 'Label' },
 { key: 'dueBucket', label: 'Due' },
];

// Composable filter chips. Click"+ Add filter" → pick a field → pick a
// value → chip appears. Click a chip to edit/remove. Changes bubble via
// onChange so parent can refetch.
export function FilterBar({
 value,
 onChange,
 users,
 labels,
 currentUserId,
 onSaveView,
}: FilterBarProps) {
 const [addOpen, setAddOpen] = useState(false);
 const [editing, setEditing] = useState<FilterKey | null>(null);
 const ref = useRef<HTMLDivElement>(null);

 useEffect(() => {
 if (!addOpen && !editing) return;
 const onClick = (e: MouseEvent) => {
 if (!ref.current?.contains(e.target as Node)) {
 setAddOpen(false);
 setEditing(null);
 }
 };
 const onKey = (e: KeyboardEvent) => {
 if (e.key === 'Escape') {
 setAddOpen(false);
 setEditing(null);
 }
 };
 document.addEventListener('mousedown', onClick);
 document.addEventListener('keydown', onKey);
 return () => {
 document.removeEventListener('mousedown', onClick);
 document.removeEventListener('keydown', onKey);
 };
 }, [addOpen, editing]);

 const activeKeys = (Object.keys(value) as FilterKey[]).filter((k) => {
 const v = value[k];
 if (v == null) return false;
 if (Array.isArray(v) && v.length === 0) return false;
 return true;
 });

 const clearFilter = (key: FilterKey) => {
 const next = { ...value };
 delete next[key];
 onChange(next);
 };

 const setFilter = (key: FilterKey, v: any) => {
 onChange({ ...value, [key]: v });
 setEditing(null);
 setAddOpen(false);
 };

 const chipLabel = (key: FilterKey): string => {
 const v = value[key];
 if (v == null) return '';
 if (key === 'status') return `Status: ${statusMeta(v as string).label}`;
 if (key === 'assigneeId') {
 if (v === currentUserId) return 'Assignee: Me';
 const u = users.find((x) => x.id === v);
 return `Assignee: ${u?.name ?? '—'}`;
 }
 if (key === 'priorityMin') return `Priority: ≥ ${priorityMeta(v as string).label}`;
 if (key === 'labelIds') {
 const names = (v as number[]).map((id) => labels.find((l) => l.id === id)?.name).filter(Boolean);
 return `Label: ${names.join(', ') || '—'}`;
 }
 if (key === 'dueBucket') {
 const m: Record<string, string> = { overdue: 'Overdue', today: 'Today', this_week: 'This week', no_date: 'No date' };
 return `Due: ${m[v as string] ?? '—'}`;
 }
 return '';
 };

 return (
 <div ref={ref} className="flex items-center gap-1.5 flex-wrap">
 {activeKeys.map((key) => (
 <Chip key={key} label={chipLabel(key)} onClick={() => setEditing(key)} onRemove={() => clearFilter(key)} />
 ))}
 <div className="relative">
 <button
 type="button"
 onClick={() => setAddOpen((v) => !v)}
 className="text-xs px-2 py-1 rounded-md border border-dashed border-border text-muted-foreground hover:border-border hover:text-foreground"
 >
 + Add filter
 </button>
 {addOpen && !editing && (
 <FieldMenu
 options={FIELD_OPTIONS}
 onPick={(key) => {
 setAddOpen(false);
 setEditing(key);
 }}
 />
 )}
 {editing && (
 <FieldValueEditor
 fieldKey={editing}
 currentValue={value[editing] as any}
 users={users}
 labels={labels}
 currentUserId={currentUserId}
 onSet={(v) => setFilter(editing, v)}
 onClose={() => setEditing(null)}
 />
 )}
 </div>
 {activeKeys.length > 0 && onSaveView && (
 <button
 type="button"
 onClick={onSaveView}
 className="text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:bg-muted/30"
 >
 Save view
 </button>
 )}
 {activeKeys.length > 0 && (
 <button
 type="button"
 onClick={() => onChange({})}
 className="text-xs px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
 >
 Clear
 </button>
 )}
 </div>
 );
}

function Chip({ label, onClick, onRemove }: { label: string; onClick: () => void; onRemove: () => void }) {
 return (
 <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
 <button onClick={onClick} className="hover:underline">{label}</button>
 <button onClick={onRemove} className="text-blue-400 hover:text-blue-700" aria-label="Remove filter">
 ×
 </button>
 </span>
 );
}

function FieldMenu({
 options,
 onPick,
}: {
 options: Array<{ key: FilterKey; label: string }>;
 onPick: (key: FilterKey) => void;
}) {
 return (
 <div className="absolute z-50 mt-1 w-44 rounded-md border border-border bg-card shadow-lg p-1">
 {options.map((o) => (
 <button
 key={o.key}
 type="button"
 onClick={() => onPick(o.key)}
 className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted"
 >
 {o.label}
 </button>
 ))}
 </div>
 );
}

function FieldValueEditor({
 fieldKey,
 currentValue,
 users,
 labels,
 currentUserId,
 onSet,
 onClose: _onClose,
}: {
 fieldKey: FilterKey;
 currentValue: any;
 users: Array<{ id: number; name: string }>;
 labels: Array<{ id: number; name: string; color?: string | null }>;
 currentUserId?: number;
 onSet: (v: any) => void;
 onClose: () => void;
}) {
 if (fieldKey === 'status') {
 return (
 <div className="absolute z-50 mt-1 w-44 rounded-md border border-border bg-card shadow-lg p-1">
 {Object.keys(STATUS_META).map((k) => (
 <button
 key={k}
 type="button"
 onClick={() => onSet(k)}
 className={cn(
 'w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted ',
 currentValue === k && 'bg-muted ',
 )}
 >
 {statusMeta(k).label}
 </button>
 ))}
 </div>
 );
 }
 if (fieldKey === 'priorityMin') {
 return (
 <div className="absolute z-50 mt-1 w-44 rounded-md border border-border bg-card shadow-lg p-1">
 {Object.keys(PRIORITY_META).map((k) => (
 <button
 key={k}
 type="button"
 onClick={() => onSet(k)}
 className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted"
 >
 ≥ {priorityMeta(k).label}
 </button>
 ))}
 </div>
 );
 }
 if (fieldKey === 'assigneeId') {
 return (
 <div className="absolute z-50 mt-1 w-56 rounded-md border border-border bg-card shadow-lg p-1 max-h-64 overflow-y-auto">
 {currentUserId && (
 <button
 type="button"
 onClick={() => onSet(currentUserId)}
 className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted"
 >
 Me
 </button>
 )}
 <button
 type="button"
 onClick={() => onSet(null)}
 className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted text-muted-foreground"
 >
 Unassigned
 </button>
 <div className="h-px bg-muted my-1" />
 {users.map((u) => (
 <button
 key={u.id}
 type="button"
 onClick={() => onSet(u.id)}
 className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted"
 >
 {u.name}
 </button>
 ))}
 </div>
 );
 }
 if (fieldKey === 'labelIds') {
 const current: number[] = Array.isArray(currentValue) ? currentValue : [];
 return (
 <div className="absolute z-50 mt-1 w-56 rounded-md border border-border bg-card shadow-lg p-1 max-h-64 overflow-y-auto">
 {labels.map((l) => {
 const on = current.includes(l.id);
 return (
 <button
 key={l.id}
 type="button"
 onClick={() =>
 onSet(on ? current.filter((x) => x !== l.id) : [...current, l.id])
 }
 className={cn(
 'w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-muted ',
 on && 'bg-muted ',
 )}
 >
 <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color ?? '#94a3b8' }} />
 <span className="flex-1 text-left">{l.name}</span>
 {on && <span className="text-[10px] text-muted-foreground/70">✓</span>}
 </button>
 );
 })}
 {labels.length === 0 && <div className="text-xs text-muted-foreground/70 text-center py-2">No labels</div>}
 </div>
 );
 }
 if (fieldKey === 'dueBucket') {
 const opts: Array<{ key: 'overdue' | 'today' | 'this_week' | 'no_date'; label: string }> = [
 { key: 'overdue', label: 'Overdue' },
 { key: 'today', label: 'Today' },
 { key: 'this_week', label: 'This week' },
 { key: 'no_date', label: 'No date' },
 ];
 return (
 <div className="absolute z-50 mt-1 w-44 rounded-md border border-border bg-card shadow-lg p-1">
 {opts.map((o) => (
 <button
 key={o.key}
 type="button"
 onClick={() => onSet(o.key)}
 className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted"
 >
 {o.label}
 </button>
 ))}
 </div>
 );
 }
 return null;
}
