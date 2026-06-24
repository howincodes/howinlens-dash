import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { cn } from '@/lib/utils';
import { formatDueRelative } from './tokens';

interface DueDatePickerProps {
 dueAt?: string | Date | null;
 onChange: (iso: string | null) => void;
 label?: string;
 compact?: boolean;
}

// Due date chip — shows relative formatting ("in 3d","Today","Overdue 2d")
// with color tone by urgency. Click opens a popover with quick presets +
// calendar.
export function DueDatePicker({ dueAt, onChange, label = 'Due', compact }: DueDatePickerProps) {
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

 const { label: relLabel, className } = formatDueRelative(dueAt ?? undefined);
 const selected = dueAt ? new Date(dueAt) : undefined;

 const setRelative = (days: number) => {
 const d = new Date();
 d.setHours(17, 0, 0, 0); // default to end of workday
 d.setDate(d.getDate() + days);
 onChange(d.toISOString());
 setOpen(false);
 };

 const clear = () => {
 onChange(null);
 setOpen(false);
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
 'inline-flex items-center gap-1.5 rounded-full border transition-colors font-medium',
 compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
 dueAt
 ? className
 : 'bg-card text-muted-foreground border-dashed border-border hover:border-border',
 )}
 >
 {dueAt ? (
 <>
 <span className="text-[10px] uppercase tracking-wide opacity-75">{label}</span>
 <span>{relLabel}</span>
 </>
 ) : (
 <>+ Due date</>
 )}
 </button>
 {open && (
 <div className="absolute z-50 mt-1 w-72 rounded-md border border-border bg-card shadow-lg p-2">
 <div className="grid grid-cols-2 gap-1 mb-2">
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setRelative(0);
 }}
 className="text-xs px-2 py-1 rounded hover:bg-muted text-left"
 >
 Today
 </button>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setRelative(1);
 }}
 className="text-xs px-2 py-1 rounded hover:bg-muted text-left"
 >
 Tomorrow
 </button>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setRelative(3);
 }}
 className="text-xs px-2 py-1 rounded hover:bg-muted text-left"
 >
 In 3 days
 </button>
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setRelative(7);
 }}
 className="text-xs px-2 py-1 rounded hover:bg-muted text-left"
 >
 Next week
 </button>
 </div>
 <div className="border-t border-border pt-2">
 <DayPicker
 mode="single"
 selected={selected}
 onSelect={(d) => {
 if (!d) return;
 const iso = new Date(d);
 iso.setHours(17, 0, 0, 0);
 onChange(iso.toISOString());
 setOpen(false);
 }}
 classNames={{
 caption: 'flex justify-between items-center text-xs font-medium mb-2',
 nav_button: 'h-5 w-5 text-muted-foreground/70 hover:text-foreground',
 table: 'w-full text-[11px]',
 head_cell: 'text-muted-foreground/70 font-normal',
 day: 'p-1 rounded hover:bg-muted cursor-pointer',
 day_selected: 'bg-blue-600 text-primary-foreground hover:bg-blue-700',
 day_today: 'font-bold text-blue-600',
 }}
 />
 </div>
 {dueAt && (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 clear();
 }}
 className="w-full text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded px-2 py-1 mt-1"
 >
 Clear
 </button>
 )}
 </div>
 )}
 </div>
 );
}
