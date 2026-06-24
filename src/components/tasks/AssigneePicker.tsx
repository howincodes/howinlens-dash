import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from './Avatar';

export interface User {
 id: number;
 name: string;
 email?: string;
}

interface AssigneePickerProps {
 users: User[];
 assigneeId?: number | null;
 onChange: (userId: number | null) => void;
 compact?: boolean;
 currentUserId?: number | null;
 trigger?: 'avatar' | 'button';
}

// Searchable user picker with"Me" and"Unassigned" shortcuts. The trigger
// is either a small avatar (board cards) or a button chip (drawer).
export function AssigneePicker({
 users,
 assigneeId,
 onChange,
 compact,
 currentUserId,
 trigger = 'button',
}: AssigneePickerProps) {
 const [open, setOpen] = useState(false);
 const [query, setQuery] = useState('');
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

 const assignee = users.find((u) => u.id === assigneeId);
 const filtered = query
 ? users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
 : users;

 const triggerEl =
 trigger === 'avatar' ? (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setOpen((v) => !v);
 }}
 className="hover:opacity-80 transition-opacity"
 title={assignee?.name ?? 'Unassigned'}
 >
 <Avatar id={assignee?.id} name={assignee?.name} size={compact ? 18 : 20} />
 </button>
 ) : (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setOpen((v) => !v);
 }}
 className={cn(
 'inline-flex items-center gap-1.5 rounded-full border transition-colors',
 compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
 assignee
 ? 'bg-muted/30 text-foreground border-border hover:bg-muted'
 : 'bg-card text-muted-foreground border-dashed border-border hover:border-border',
 )}
 >
 {assignee ? (
 <>
 <Avatar id={assignee.id} name={assignee.name} size={14} />
 <span className="truncate max-w-[100px]">{assignee.name}</span>
 </>
 ) : (
 <>
 <Avatar size={14} />
 <span>Unassigned</span>
 </>
 )}
 </button>
 );

 return (
 <div ref={ref} className="relative inline-block">
 {triggerEl}
 {open && (
 <div className="absolute z-50 mt-1 w-64 rounded-md border border-border bg-card shadow-lg">
 <div className="p-2 border-b border-border">
 <input
 ref={inputRef}
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 placeholder="Search people..."
 className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground/70"
 />
 </div>
 <div className="max-h-64 overflow-y-auto p-1">
 {currentUserId && (
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 onChange(currentUserId);
 setOpen(false);
 }}
 className={cn(
 'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted ',
 assigneeId === currentUserId && 'bg-muted ',
 )}
 >
 <Avatar id={currentUserId} name={users.find((u) => u.id === currentUserId)?.name ?? 'Me'} size={20} />
 <span className="flex-1 text-left">Me</span>
 <span className="text-[10px] text-muted-foreground/70">m</span>
 </button>
 )}
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 onChange(null);
 setOpen(false);
 }}
 className={cn(
 'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted ',
 !assigneeId && 'bg-muted ',
 )}
 >
 <Avatar size={20} />
 <span className="flex-1 text-left text-muted-foreground">Unassigned</span>
 </button>
 <div className="border-t border-border my-1" />
 {filtered.map((u) => (
 <button
 key={u.id}
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 onChange(u.id);
 setOpen(false);
 }}
 className={cn(
 'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-muted ',
 u.id === assigneeId && 'bg-muted ',
 )}
 >
 <Avatar id={u.id} name={u.name} size={20} />
 <div className="flex-1 text-left min-w-0">
 <div className="truncate">{u.name}</div>
 {u.email && (
 <div className="text-[10px] text-muted-foreground/70 truncate">{u.email}</div>
 )}
 </div>
 </button>
 ))}
 {filtered.length === 0 && (
 <div className="px-2 py-3 text-xs text-muted-foreground/70 text-center">No matches</div>
 )}
 </div>
 </div>
 )}
 </div>
 );
}
