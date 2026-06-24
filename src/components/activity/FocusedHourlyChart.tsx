import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

interface HourlyChartProps {
  /** Histogram keyed by "00".."23" → event count for that hour */
  histogram: Record<string, number>;
  height?: number;
  title?: string;
  subtitle?: string;
  className?: string;
}

// Plain uniform 24-hour bar chart. Every hour gets the same width. Hover
// reveals the exact count. Custom SVG so we control the colors, corners,
// and hover state without pulling in recharts for something this simple.
export default function FocusedHourlyChart({
  histogram,
  height = 180,
  title,
  subtitle,
  className,
}: HourlyChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const data = useMemo(() => {
    return Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      value: Number(histogram?.[String(h).padStart(2, '0')] ?? 0),
    }));
  }, [histogram]);

  const hasAny = data.some((d) => d.value > 0);
  const max = Math.max(1, ...data.map((d) => d.value));

  // SVG layout — uniform spacing
  const W = 1000;
  const padLeft = 34;
  const padRight = 12;
  const padTop = 14;
  const padBottom = 26;
  const plotW = W - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const slotW = plotW / 24;
  const barW = slotW * 0.62;
  const x = (hour: number) => padLeft + hour * slotW + (slotW - barW) / 2;

  // Y ticks
  const yTickValues: number[] = useMemo(() => {
    if (max <= 1) return [0, 1];
    if (max <= 4) return [0, max];
    const step = Math.ceil(max / 4);
    return [0, step, step * 2, step * 3, step * 4].filter((v, i, a) => i === 0 || v !== a[i - 1]);
  }, [max]);
  const yTickMax = yTickValues[yTickValues.length - 1] ?? 1;
  const y = (v: number) => padTop + plotH - (v / yTickMax) * plotH;

  return (
    <div className={cn('w-full', className)}>
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
        <div className="text-xs text-muted-foreground/70 text-center py-6">No hourly data yet</div>
      ) : (
        <svg viewBox={`0 0 ${W} ${height}`} width="100%" height={height} className="overflow-visible">
          {/* Y-axis gridlines + labels */}
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
                {v}
              </text>
            </g>
          ))}

          {/* Bars */}
          {data.map((d) => {
            const bx = x(d.hour);
            const by = y(d.value);
            const bh = y(0) - by;
            const isHover = hover === d.hour;
            return (
              <g key={d.hour}>
                {/* Hit area */}
                <rect
                  x={padLeft + d.hour * slotW}
                  y={padTop}
                  width={slotW}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHover(d.hour)}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: 'pointer' }}
                />
                <rect
                  x={bx}
                  y={by}
                  width={barW}
                  height={Math.max(bh, 0)}
                  rx={2}
                  className={
                    d.value === 0 ? 'fill-muted' : isHover ? 'fill-blue-600' : 'fill-blue-500'
                  }
                  style={{ transition: 'fill 120ms ease' }}
                />
              </g>
            );
          })}

          {/* X-axis labels — every 2 hours for readability */}
          {Array.from({ length: 13 }, (_, i) => i * 2).map((h) => {
            const cx = x(h) + barW / 2;
            return (
              <text
                key={`xl-${h}`}
                x={cx}
                y={height - 10}
                textAnchor="middle"
                fontSize={9}
                fill="currentColor"
                className="text-muted-foreground tabular-nums"
              >
                {String(h).padStart(2, '0')}
              </text>
            );
          })}

          {/* Hover tooltip */}
          {hover !== null && data[hover]!.value > 0 && (
            <g>
              {(() => {
                const bx = x(hover) + barW / 2;
                const by = y(data[hover]!.value) - 6;
                const label = `${String(hover).padStart(2, '0')}:00 · ${Math.round(data[hover]!.value)}`;
                const textW = label.length * 5.5 + 12;
                const rectX = Math.max(padLeft, Math.min(bx - textW / 2, W - padRight - textW));
                return (
                  <>
                    <rect
                      x={rectX}
                      y={by - 16}
                      width={textW}
                      height={16}
                      rx={3}
                      className="fill-popover stroke-border"
                      strokeWidth={0.5}
                    />
                    <text
                      x={rectX + textW / 2}
                      y={by - 5}
                      textAnchor="middle"
                      fontSize={10}
                      className="fill-foreground tabular-nums"
                      style={{ fontWeight: 600 }}
                    >
                      {label}
                    </text>
                  </>
                );
              })()}
            </g>
          )}
        </svg>
      )}
    </div>
  );
}
