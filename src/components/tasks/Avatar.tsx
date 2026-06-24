import { cn } from '@/lib/utils';
import { avatarColor, initialsFor } from './tokens';

interface AvatarProps {
 id?: number | null;
 name?: string | null;
 size?: number;
 className?: string;
 title?: string;
}

// Tiny avatar with consistent per-user color + initials. We don't fetch real
// avatar images — the org is small and initials read well at 16-24px.
export function Avatar({ id, name, size = 20, className, title }: AvatarProps) {
 if (!id || !name) {
 return (
 <div
 className={cn(
 'rounded-full bg-muted text-muted-foreground/70 flex items-center justify-center font-medium',
 className,
 )}
 style={{ width: size, height: size, fontSize: Math.max(9, size * 0.45) }}
 title={title ?? 'Unassigned'}
 >
 ?
 </div>
 );
 }
 return (
 <div
 className={cn(
 'rounded-full text-primary-foreground flex items-center justify-center font-semibold select-none',
 avatarColor(id),
 className,
 )}
 style={{ width: size, height: size, fontSize: Math.max(9, size * 0.45) }}
 title={title ?? name}
 >
 {initialsFor(name)}
 </div>
 );
}

interface AvatarStackProps {
 users: Array<{ id: number; name: string }>;
 max?: number;
 size?: number;
}

export function AvatarStack({ users, max = 3, size = 20 }: AvatarStackProps) {
 const shown = users.slice(0, max);
 const extra = users.length - shown.length;
 return (
 <div className="flex -space-x-1.5">
 {shown.map((u) => (
 <Avatar
 key={u.id}
 id={u.id}
 name={u.name}
 size={size}
 className="ring-2 ring-background"
 />
 ))}
 {extra > 0 && (
 <div
 className="rounded-full bg-muted text-muted-foreground flex items-center justify-center font-medium ring-2 ring-background"
 style={{ width: size, height: size, fontSize: Math.max(9, size * 0.4) }}
 >
 +{extra}
 </div>
 )}
 </div>
 );
}
