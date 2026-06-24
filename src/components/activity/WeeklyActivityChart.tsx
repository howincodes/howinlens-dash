import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

interface WeeklyActivityChartProps {
  /** { monday: 120, tuesday: 80, ... } — avg active minutes per day-of-week */
  pattern: Record<string, number> | null;
  height?: number;
  title?: string;
  subtitle?: string;
}

// Clean SVG bar chart for weekly pattern. Mon→Sun, today highlighted.
// Custom SVG instead of recharts to match the other activity charts and
// get pixel-perfect control over the colors, corner radius, and label
// alignment. Zero external deps.
const DAYS: Array<{ key: string; short: string; dowIdx: number }> = [
  { key: 'monday', short: 'Mon', dowIdx: 1 },
  { key: 'tuesday', short: 'Tue', dowIdx: 2 },
  { key: 'wednesday', short: 'Wed', dowIdx: 3 },
  { key: 'thursday', short: 'Thu', dowIdx: 4 },
  { key: 'friday', short: 'Fri', dowIdx: 5 },
  { key: 'saturday', short: 'Sat', dowIdx: 6 },
  { key: 'sunday', short: 'Sun', dowIdx: 0 },
];

export default function WeeklyActivityChart({
  pattern,
  height = 180,
  title,
  subtitle,
}: WeeklyActivityChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const data = useMemo(() => {
    return DAYS.map((d) => ({
      ...d,
      value: Number(pattern?.[d.key] ?? 0),
    }));
  }, [pattern]);

  const todayDow = new Date().getDay();
  const hasAny = data.some((d) => d.value > 0);
  const max = Math.max(1, ...data.map((d) => d.value));

  const W = 560;
  const padLeft = 34;
  const padRight = 12;
  const padTop = 14;
  const padBottom = 28;
  const plotW = W - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const barSlot = plotW / DAYS.length;
  const barWidth = Math.min(40, barSlot * 0.62);
  const x = (i: number) => padLeft + i * barSlot + (barSlot - barWidth) / 2;

  const yTickValues = useMemo(() => {
    if (max <= 10) return [0, Math.ceil(max)];
    const step = Math.ceil(max / 4 / 15) * 15;
    return [0, step, step * 2, step * 3, step * 4];
  }, [max]);
  const yMax = yTickValues[yTickValues.length - 1] ?? 1;
  const y = (v: number) => padTop + plotH - (v / yMax) * plotH;

  return (
    <div className="w-full">
      {(title || subtitle) && (
        <div className="mb-2 flex items-baseline justify-between">
          {title && (
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </div>
          )}
          {subtitle && <div className="text-[10px] text-muted-foreground/70">{subtitle}</div>}
        </div>
      )}
      {!hasAny ? (
        <div className="text-xs text-muted-foreground/70 text-center py-6">No weekly pattern yet</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height}>
          {/* Y gridlines */}
          {yTickValues.map((v) => (
            <g key={v}>
              <line
                x1={padLeft}
                x2={W - padRight}
                y1={y(v)}
                y2={y(v)}
                stroke="currentColor"
                className="text-border"
                strokeDasharray={v === 0 ? '0' : '2 3'}
                strokeWidth={v === 0 ? 1 : 0.5}
              />
              <text
                x={padLeft - 6}
                y={y(v) + 3}
                textAnchor="end"
                fontSize={9}
                fill="currentColor"
                className="text-muted-foreground/70 tabular-nums"
              >
                {v}m
              </text>
            </g>
          ))}

          {/* Bars */}
          {data.map((d, i) => {
            const bx = x(i);
            const by = y(d.value);
            const bh = y(0) - by;
            const isToday = d.dowIdx === todayDow;
            const isHover = hover === i;
            return (
              <g key={d.key}>
                <rect
                  x={padLeft + i * barSlot}
                  y={padTop}
                  width={barSlot}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: 'pointer' }}
                />
                {d.value > 0 && (
                  <rect
                    x={bx}
                    y={by}
                    width={barWidth}
                    height={Math.max(bh, 2)}
                    rx={3}
                    className={cn(
                      isToday
                        ? isHover
                          ? 'fill-blue-600'
                          : 'fill-blue-500'
                        : isHover
                          ? 'fill-slate-500'
                          : 'fill-slate-400',
                    )}
                    style={{ transition: 'fill 120ms ease' }}
                  />
                )}
                <text
                  x={bx + barWidth / 2}
                  y={height - 12}
                  textAnchor="middle"
                  fontSize={10}
                  className={cn(
                    'tabular-nums',
                    isToday ? 'fill-foreground font-semibold' : 'fill-muted-foreground',
                  )}
                >
                  {d.short}
                </text>
                {d.value > 0 && (
                  <text
                    x={bx + barWidth / 2}
                    y={by - 4}
                    textAnchor="middle"
                    fontSize={9}
                    fill="currentColor"
                    className="text-muted-foreground tabular-nums"
                  >
                    {Math.round(d.value)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
