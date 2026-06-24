import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
 icon?: ReactNode;
 title: string;
 description?: string;
 actions?: ReactNode;
 className?: string;
}

export function EmptyState({ icon, title, description, actions, className }: EmptyStateProps) {
 return (
 <div
 className={cn(
 'flex flex-col items-center justify-center text-center py-16 px-4',
 className,
 )}
 >
 {icon && <div className="text-4xl mb-3 opacity-70">{icon}</div>}
 <h3 className="text-sm font-semibold text-foreground">{title}</h3>
 {description && (
 <p className="mt-1 text-xs text-muted-foreground max-w-sm">{description}</p>
 )}
 {actions && <div className="mt-4 flex items-center gap-2">{actions}</div>}
 </div>
 );
}
