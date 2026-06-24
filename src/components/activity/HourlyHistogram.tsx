import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  histogram: Record<string, number>;
  height?: number;
  title?: string;
}

export default function HourlyHistogram({ histogram, height = 200, title }: Props) {
  const data = Array.from({ length: 24 }, (_, h) => ({
    hour: String(h).padStart(2, '0'),
    events: histogram?.[String(h).padStart(2, '0')] ?? 0,
  }));

  const hasAnyData = data.some((d) => d.events > 0);

  return (
    <div className="w-full">
      {title && <div className="text-sm font-medium mb-2">{title}</div>}
      {!hasAnyData ? (
        <div className="text-sm text-muted-foreground text-center py-8">No hourly data.</div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 6,
                fontSize: 12,
              }}
              labelFormatter={(h) => `Hour ${h}:00`}
            />
            <Bar dataKey="events" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
