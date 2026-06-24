import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface Label {
 id: number;
 name: string;
 color?: string | null;
 projectId?: number;
}

interface LabelPickerProps {
 projectLabels: Label[];
 selectedIds: number[];
 onChange: (ids: number[]) => void;
 onCreate?: (name: string) => Promise<Label>;
 compact?: boolean;
}

// Multi-select label picker with inline"create new" fallback. Shows
// existing labels as toggles; typing a query that matches none exposes a
//"Create 'x'" action.
export function LabelPicker({
 projectLabels,
 selectedIds,
 onChange,
 onCreate,
 compact,
}: LabelPickerProps) {
 const [open, setOpen] = useState(false);
 const [query, setQuery] = useState('');
 const [creating, setCreating] = useState(false);
 const ref = useRef<HTMLDivElement>(null);
 const inputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
 if (!open) return;
 inputRef.current?.focus();
 const onClick = (e: MouseEvent) => {
 if (!ref.current?.contains(e.target as Node)) setOpen(false);
 };
 const onKey = (e: KeyboardEvent) => {
 if (e.key === 'Escape') setOpen(false);
 };
 document.addEventListener('mousedown', onClick);
 document.addEventListener('keydown', onKey);
 return () => {
 document.removeEventListener('mousedown', onClick);
 document.removeEventListener('keydown', onKey);
 };
 }, [open]);

 const q = query.trim().toLowerCase();
 const filtered = q
 ? projectLabels.filter((l) => l.name.toLowerCase().includes(q))
 : projectLabels;
 const exactMatch = projectLabels.some((l) => l.name.toLowerCase() === q);

 const toggle = (id: number) => {
 onChange(
 selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
 );
 };

 const handleCreate = async () => {
 if (!q || exactMatch || !onCreate) return;
 setCreating(true);
 try {
 const created = await onCreate(query.trim());
 if (created?.id) onChange([...selectedIds, created.id]);
 setQuery('');
 } finally {
 setCreating(false);
 }
 };

 return (
 <div ref={ref} className="relative inline-block">
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setOpen((v) => !v);
 }}
 className={cn(
 'inline-flex items-center gap-1 rounded-full border border-dashed border-border text-muted-foreground hover:border-border hover:text-foreground transition-colors',
 compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
 )}
 >
 + Label
 </button>
 {open && (
 <div className="absolute z-50 mt-1 w-64 rounded-md border border-border bg-card shadow-lg">
 <div className="p-2 border-b border-border">
 <input
 ref={inputRef}
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter' && q && !exactMatch && onCreate) {
 e.preventDefault();
 handleCreate();
 }
 }}
 placeholder="Search or create label..."
 className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground/70"
 />
 </div>
 <div className="max-h-64 overflow-y-auto p-1">
 {filtered.map((l) => {
 const on = selectedIds.includes(l.id);
 return (
 <button
 key={l.id}
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 toggle(l.id);
 }}
 className={cn(
 'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted ',
 on && 'bg-muted ',
 )}
 >
 <span
 className="h-3 w-3 rounded-full flex-shrink-0 border border-border"
 style={{ backgroundColor: l.color ?? '#94a3b8' }}
 />
 <span className="flex-1 text-left truncate">{l.name}</span>
 {on && <span className="text-[10px] text-muted-foreground/70">✓</span>}
 </button>
 );
 })}
 {q && !exactMatch && onCreate && (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 handleCreate();
 }}
 disabled={creating}
 className="w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted text-muted-foreground border-t border-border mt-1"
 >
 <span className="text-muted-foreground/70">+</span>
 <span className="flex-1 text-left">
 Create <strong>"{query.trim()}"</strong>
 </span>
 </button>
 )}
 {filtered.length === 0 && !q && (
 <div className="px-2 py-3 text-xs text-muted-foreground/70 text-center">
 No labels in this project yet.
 <br />
 Start typing to create one.
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 );
}

interface LabelChipProps {
 label: Label;
 onRemove?: () => void;
 compact?: boolean;
}

export function LabelChip({ label, onRemove, compact }: LabelChipProps) {
 return (
 <span
 className={cn(
 'inline-flex items-center gap-1 rounded-full border font-medium text-primary-foreground',
 compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
 )}
 style={{
 backgroundColor: label.color ?? '#64748b',
 borderColor: label.color ?? '#64748b',
 }}
 >
 {label.name}
 {onRemove && (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 onRemove();
 }}
 className="hover:opacity-80 transition-opacity"
 aria-label="Remove label"
 >
 ×
 </button>
 )}
 </span>
 );
}
