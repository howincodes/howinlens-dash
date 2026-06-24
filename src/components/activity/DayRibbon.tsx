import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getSourceStyle, SOURCE_ORDER } from '@/lib/activity-source';

// A day ribbon is a compact 24-hour timeline of one user's day.
//
// Previous version showed plain green blocks for "work windows" only —
// hard to read, no sense of intensity, no hour ticks. This version is
// richer: per-hour intensity bars derived from the histogram, labelled
// first/last markers, hour tick axis, and a total-time chip on the left.

interface WorkWindow {
  start: string;
  end: string;
  eventCount: number;
  sources: string[];
}

interface Props {
  date: string;
  timezone?: string;
  workWindows?: WorkWindow[];
  /** Optional per-hour histogram "00".."23" → event count. If present,
   *  used to render per-hour intensity bars inside the ribbon. */
  hourlyHistogram?: Record<string, number> | null;
  /** Total active minutes for the day, shown as a chip at the left. */
  activeMinutes?: number;
  /** ISO timestamp of first event on the day — drawn as a pin + label. */
  firstEventAt?: string | null;
  /** ISO timestamp of last event on the day — drawn as a pin + label. */
  lastEventAt?: string | null;
  height?: number;
  onSegmentClick?: (window: WorkWindow) => void;
}

export default function DayRibbon({
  date,
  timezone = 'Asia/Kolkata',
  workWindows = [],
  hourlyHistogram,
  activeMinutes,
  firstEventAt,
  lastEventAt,
  height = 48,
  onSegmentClick,
}: Props) {
  const dayStartMs = useMemo(() => new Date(date + 'T00:00:00').getTime(), [date]);
  const dayMs = 24 * 60 * 60 * 1000;

  // Work windows projected to percent positions on the 24h axis
  const segments = useMemo(() => {
    return workWindows.map((w) => {
      const start = new Date(w.start).getTime();
      const end = new Date(w.end).getTime();
      const offsetPct = Math.max(0, Math.min(100, ((start - dayStartMs) / dayMs) * 100));
      const widthPct = Math.max(0.3, Math.min(100 - offsetPct, ((end - start) / dayMs) * 100));
      return { ...w, offsetPct, widthPct };
    });
  }, [workWindows, dayStartMs, dayMs]);

  // Per-hour intensity — from histogram if present, else derived from
  // workWindows by projecting event counts uniformly into the window.
  const hourBars = useMemo(() => {
    if (hourlyHistogram) {
      const vals = Array.from({ length: 24 }, (_, h) => Number(hourlyHistogram[String(h).padStart(2, '0')] ?? 0));
      const max = Math.max(1, ...vals);
      return vals.map((v) => v / max);
    }
    // Fallback: project workWindows onto hour buckets by duration weight
    const buckets = new Array(24).fill(0);
    for (const w of workWindows) {
      const s = new Date(w.start).getTime();
      const e = new Date(w.end).getTime();
      const sh = Math.max(0, Math.floor((s - dayStartMs) / (60 * 60_000)));
      const eh = Math.min(23, Math.ceil((e - dayStartMs) / (60 * 60_000)));
      const hoursSpanned = Math.max(1, eh - sh);
      const perHour = (w.eventCount ?? 1) / hoursSpanned;
      for (let h = sh; h <= eh; h++) buckets[h] += perHour;
    }
    const max = Math.max(1, ...buckets);
    return buckets.map((v) => v / max);
  }, [hourlyHistogram, workWindows, dayStartMs]);

  // First/last event percent positions
  const firstPct = useMemo(() => {
    if (!firstEventAt) return null;
    const t = new Date(firstEventAt).getTime();
    return ((t - dayStartMs) / dayMs) * 100;
  }, [firstEventAt, dayStartMs, dayMs]);
  const lastPct = useMemo(() => {
    if (!lastEventAt) return null;
    const t = new Date(lastEventAt).getTime();
    return ((t - dayStartMs) / dayMs) * 100;
  }, [lastEventAt, dayStartMs, dayMs]);

  // Derived labels
  const activeLabel = useMemo(() => {
    if (activeMinutes == null) return null;
    const h = Math.floor(activeMinutes / 60);
    const m = activeMinutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }, [activeMinutes]);

  const firstLabel = firstEventAt ? formatTime(firstEventAt, timezone) : null;
  const lastLabel = lastEventAt ? formatTime(lastEventAt, timezone) : null;

  const hasAny = workWindows.length > 0 || hourBars.some((v) => v > 0);

  return (
    <div className="w-full">
      {/* Ribbon body */}
      <div className="flex items-center gap-3">
        {/* Left totals chip */}
        {activeLabel != null && (
          <div className="flex flex-col items-end flex-shrink-0 min-w-[72px]">
            <div className="text-sm font-bold tabular-nums leading-none">{activeLabel}</div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">
              active
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="relative flex-1" style={{ height }}>
          {/* Background + hour grid */}
          <div className="absolute inset-0 rounded bg-muted/20 border border-border/40 overflow-hidden">
            {/* Major gridlines every 6h */}
            {[6, 12, 18].map((h) => (
              <div
                key={`grid-${h}`}
                className="absolute top-0 bottom-0 border-l border-border/40"
                style={{ left: `${(h / 24) * 100}%` }}
              />
            ))}
            {/* Minor hour ticks */}
            {Array.from({ length: 23 }, (_, i) => i + 1)
              .filter((h) => h !== 6 && h !== 12 && h !== 18)
              .map((h) => (
                <div
                  key={`tick-${h}`}
                  className="absolute top-0 h-1 w-px bg-border/30"
                  style={{ left: `${(h / 24) * 100}%` }}
                />
              ))}

            {/* Per-hour intensity bars — sit at the bottom half of the ribbon */}
            {hourBars.map((intensity, h) => (
              <div
                key={`hb-${h}`}
                className={cn(
                  'absolute bg-blue-500/70 rounded-sm transition-colors hover:bg-blue-600',
                  intensity === 0 && 'bg-transparent',
                )}
                style={{
                  left: `${(h / 24) * 100 + 0.2}%`,
                  width: `${100 / 24 - 0.4}%`,
                  bottom: 4,
                  height: intensity === 0 ? 0 : Math.max(3, (height - 14) * intensity),
                }}
                title={`${String(h).padStart(2, '0')}:00`}
              />
            ))}

            {/* Work window outlines — translucent underlay so users still see
                continuous periods of work over the intensity bars.
                A thin stripe on top shows the event-source mix for the window. */}
            {segments.map((s, i) => {
              const sortedSources = [...(s.sources ?? [])].sort(
                (a, b) => SOURCE_ORDER.indexOf(a as any) - SOURCE_ORDER.indexOf(b as any),
              );
              const stripeWidth = sortedSources.length > 0
                ? 100 / sortedSources.length
                : 100;
              return (
                <div
                  key={`seg-${i}`}
                  className="absolute bg-blue-500/10 border border-blue-500/30 rounded-sm cursor-pointer hover:bg-blue-500/20 transition-colors overflow-hidden"
                  style={{
                    left: `${s.offsetPct}%`,
                    width: `${s.widthPct}%`,
                    top: 3,
                    bottom: 3,
                  }}
                  title={`${formatTime(s.start, timezone)} – ${formatTime(s.end, timezone)}  ·  ${s.eventCount} events  ·  ${s.sources.join(', ')}`}
                  onClick={() => onSegmentClick?.(s)}
                >
                  {/* Top stripe: per-source color bands proportional to source count */}
                  <div className="absolute top-0 left-0 right-0 h-1 flex">
                    {sortedSources.map((src) => {
                      const st = getSourceStyle(src);
                      return (
                        <div
                          key={src}
                          className={cn('h-full', st.solid)}
                          style={{ width: `${stripeWidth}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* First event marker */}
            {firstPct != null && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-emerald-500"
                style={{ left: `${firstPct}%` }}
              >
                <div className="absolute -top-0.5 -left-1 h-1.5 w-2 rounded-full bg-emerald-500" />
              </div>
            )}

            {/* Last event marker */}
            {lastPct != null && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-rose-500"
                style={{ left: `${lastPct}%` }}
              >
                <div className="absolute -bottom-0.5 -right-1 h-1.5 w-2 rounded-full bg-rose-500" />
              </div>
            )}

            {!hasAny && (
              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground/60">
                No activity
              </div>
            )}
          </div>

          {/* Hour labels below the ribbon */}
          <div className="absolute left-0 right-0 top-full mt-0.5 flex text-[9px] text-muted-foreground/70 tabular-nums">
            {[0, 6, 12, 18, 24].map((h) => (
              <span
                key={`lbl-${h}`}
                className="absolute"
                style={{ left: `${(h / 24) * 100}%`, transform: 'translateX(-50%)' }}
              >
                {String(h).padStart(2, '0')}
              </span>
            ))}
          </div>
        </div>

        {/* Right first/last times */}
        {(firstLabel || lastLabel) && (
          <div className="flex flex-col items-start flex-shrink-0 min-w-[80px] text-[10px] tabular-nums">
            {firstLabel && (
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">first</span>
                <span className="text-foreground font-semibold">{firstLabel}</span>
              </div>
            )}
            {lastLabel && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                <span className="text-muted-foreground">last</span>
                <span className="text-foreground font-semibold">{lastLabel}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}
