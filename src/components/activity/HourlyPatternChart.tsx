import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  pattern: Record<string, number> | null;
  height?: number;
}

export default function HourlyPatternChart({ pattern, height = 180 }: Props) {
  if (!pattern) return <div className="text-sm text-muted-foreground">No data</div>;
  const data = Array.from({ length: 24 }, (_, h) => ({
    hour: String(h).padStart(2, '0'),
    events: pattern[String(h).padStart(2, '0')] ?? 0,
  }));
  const hasAny = data.some((d) => d.events > 0);
  if (!hasAny) return <div className="text-sm text-muted-foreground text-center py-6">No hourly pattern yet.</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
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
        <Line type="monotone" dataKey="events" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
