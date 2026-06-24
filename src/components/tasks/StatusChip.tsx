import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { statusMeta, STATUS_META } from './tokens';

interface StatusChipProps {
 status: string;
 onChange?: (status: string) => void;
 statuses?: Array<{ name: string; color?: string | null; isDoneState?: boolean }>;
 compact?: boolean;
 disabled?: boolean;
}

// Static + interactive status chip. Without onChange, it's display-only.
// With onChange, clicking opens a popover of available statuses.
//
// We respect project-configured statuses via the `statuses` prop; when absent
// we fall back to the built-in open/in_progress/blocked/done set, which
// matches what task_status_configs defaults to on fresh projects.
export function StatusChip({
 status,
 onChange,
 statuses,
 compact,
 disabled,
}: StatusChipProps) {
 const [open, setOpen] = useState(false);
 const ref = useRef<HTMLDivElement>(null);

 useEffect(() => {
 if (!open) return;
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

 const meta = statusMeta(status);
 const options =
 statuses && statuses.length > 0
 ? statuses.map((s) => ({ key: s.name, label: s.name.replace('_', ' ') }))
 : Object.entries(STATUS_META).map(([key, m]) => ({ key, label: m.label }));

 const chip = (
 <span
 className={cn(
 'inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors',
 compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
 meta.chip,
 onChange && !disabled ? 'cursor-pointer hover:opacity-80' : '',
 )}
 >
 <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
 {meta.label}
 </span>
 );

 if (!onChange || disabled) return chip;

 return (
 <div ref={ref} className="relative inline-block">
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setOpen((v) => !v);
 }}
 className="inline-flex items-center"
 >
 {chip}
 </button>
 {open && (
 <div className="absolute z-50 mt-1 w-44 rounded-md border border-border bg-card shadow-lg p-1">
 {options.map((o) => {
 const m = statusMeta(o.key);
 const active = o.key === status;
 return (
 <button
 key={o.key}
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 onChange(o.key);
 setOpen(false);
 }}
 className={cn(
 'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded text-left',
 'hover:bg-muted ',
 active && 'bg-muted ',
 )}
 >
 <span className={cn('h-2 w-2 rounded-full', m.dot)} />
 <span className="capitalize flex-1">{o.label}</span>
 {active && <span className="text-[10px] text-muted-foreground/70">•</span>}
 </button>
 );
 })}
 </div>
 )}
 </div>
 );
}
