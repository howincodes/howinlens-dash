import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TaskQuickCreateProps {
 columnName: string;
 onCreate: (title: string) => void | Promise<void>;
 autoFocus?: boolean;
}

// The inline"press C to create" input that lives at the top of every board
// column. Stays collapsed until focused, expands on focus, creates on Enter,
// clears on Escape.
export function TaskQuickCreate({ columnName, onCreate, autoFocus }: TaskQuickCreateProps) {
 const [focused, setFocused] = useState(!!autoFocus);
 const [title, setTitle] = useState('');
 const [submitting, setSubmitting] = useState(false);
 const inputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
 if (autoFocus) inputRef.current?.focus();
 }, [autoFocus]);

 const submit = async () => {
 const t = title.trim();
 if (!t || submitting) return;
 setSubmitting(true);
 try {
 await onCreate(t);
 setTitle('');
 // Keep focus — user might want to create more
 inputRef.current?.focus();
 } finally {
 setSubmitting(false);
 }
 };

 return (
 <div
 className={cn(
 'rounded-md border border-dashed transition-all',
 focused
 ? 'border-border bg-card p-2.5 shadow-sm'
 : 'border-border bg-transparent px-2.5 py-1.5 hover:border-border ',
 )}
 >
 <input
 ref={inputRef}
 type="text"
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 onFocus={() => setFocused(true)}
 onBlur={() => {
 if (!title.trim()) setFocused(false);
 }}
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 e.preventDefault();
 submit();
 } else if (e.key === 'Escape') {
 setTitle('');
 setFocused(false);
 inputRef.current?.blur();
 }
 }}
 placeholder={focused ? `New task in ${columnName}...` : `+ New task`}
 className={cn(
 'w-full bg-transparent outline-none text-[13px] placeholder:text-muted-foreground/70',
 submitting && 'opacity-50',
 )}
 disabled={submitting}
 />
 {focused && title.trim() && (
 <div className="mt-1.5 text-[10px] text-muted-foreground/70 flex items-center gap-2">
 <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Enter</kbd>
 <span>to create</span>
 <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Esc</kbd>
 <span>to cancel</span>
 </div>
 )}
 </div>
 );
}
