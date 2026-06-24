import { getSourceStyle, SOURCE_ORDER } from '@/lib/activity-source';
import { cn } from '@/lib/utils';

interface WorkWindow {
  start: string;
  end: string;
  eventCount: number;
  sources: string[];
}

interface Props {
  windows: WorkWindow[];
  timezone?: string;
}

export default function WorkWindowList({ windows, timezone = 'Asia/Kolkata' }: Props) {
  if (!windows || windows.length === 0) {
    return <div className="text-sm text-muted-foreground">No work windows.</div>;
  }
  return (
    <div className="space-y-2">
      {windows.map((w, i) => {
        const start = new Date(w.start);
        const end = new Date(w.end);
        const durMin = Math.round((end.getTime() - start.getTime()) / 60000);
        const sortedSources = [...(w.sources ?? [])].sort(
          (a, b) => SOURCE_ORDER.indexOf(a as any) - SOURCE_ORDER.indexOf(b as any),
        );
        return (
          <div key={i} className="border border-border rounded p-3 bg-muted/10 flex items-center justify-between">
            <div className="min-w-0">
              <div className="font-mono text-sm">
                {formatTime(start, timezone)} – {formatTime(end, timezone)}
              </div>
              <div className="text-xs mt-1 flex flex-wrap gap-1">
                {sortedSources.map((s) => {
                  const st = getSourceStyle(s);
                  return (
                    <span
                      key={s}
                      className={cn(
                        'px-1.5 py-0.5 rounded border inline-flex items-center gap-1',
                        st.bgSoft,
                        st.border,
                      )}
                      title={s}
                    >
                      <span className={cn('inline-block w-1.5 h-1.5 rounded-full', st.solid)} />
                      <span className="text-foreground">{st.label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="text-right shrink-0 ml-3">
              <div className="text-sm font-semibold">{durMin}m</div>
              <div className="text-xs text-muted-foreground">{w.eventCount} events</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatTime(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
}
