import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { PRIORITY_META, priorityMeta, type TaskPriority } from './tokens';

interface PriorityChipProps {
 priority?: string | null;
 onChange?: (priority: TaskPriority) => void;
 compact?: boolean;
 showLabel?: boolean;
 disabled?: boolean;
}

export function PriorityChip({
 priority,
 onChange,
 compact,
 showLabel = true,
 disabled,
}: PriorityChipProps) {
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

 const meta = priorityMeta(priority);

 const chip = (
 <span
 className={cn(
 'inline-flex items-center gap-1.5 rounded-full border font-medium',
 compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
 meta.chip,
 onChange && !disabled ? 'cursor-pointer hover:opacity-80 transition-opacity' : '',
 )}
 >
 <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
 {showLabel && meta.label}
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
 >
 {chip}
 </button>
 {open && (
 <div className="absolute z-50 mt-1 w-36 rounded-md border border-border bg-card shadow-lg p-1">
 {(Object.keys(PRIORITY_META) as TaskPriority[]).map((k) => {
 const m = PRIORITY_META[k];
 const active = k === priority;
 return (
 <button
 key={k}
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 onChange(k);
 setOpen(false);
 }}
 className={cn(
 'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded text-left',
 'hover:bg-muted ',
 active && 'bg-muted ',
 )}
 >
 <span className={cn('h-2 w-2 rounded-full', m.dot)} />
 <span className="flex-1">{m.label}</span>
 </button>
 );
 })}
 </div>
 )}
 </div>
 );
}
