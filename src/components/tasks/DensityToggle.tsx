import { cn } from '@/lib/utils';
import type { DensityMode } from './tokens';

interface DensityToggleProps {
 value: DensityMode;
 onChange: (m: DensityMode) => void;
}

export function DensityToggle({ value, onChange }: DensityToggleProps) {
 const options: Array<{ key: DensityMode; label: string; icon: string }> = [
 { key: 'compact', label: 'Compact', icon: '≡' },
 { key: 'comfortable', label: 'Comfortable', icon: '☰' },
 { key: 'spacious', label: 'Spacious', icon: '≋' },
 ];
 return (
 <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md border border-border bg-muted/30">
 {options.map((o) => (
 <button
 key={o.key}
 type="button"
 onClick={() => onChange(o.key)}
 title={o.label}
 className={cn(
 'px-2 py-1 text-xs rounded transition-colors',
 value === o.key
 ? 'bg-card shadow-sm text-foreground '
 : 'text-muted-foreground hover:text-foreground ',
 )}
 >
 {o.icon}
 </button>
 ))}
 </div>
 );
}
