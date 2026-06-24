import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

interface Props {
  pattern: Record<string, number> | null;
  height?: number;
}

export default function WeeklyPatternChart({ pattern, height = 180 }: Props) {
  if (!pattern) return <div className="text-sm text-muted-foreground">No data</div>;
  const data = ORDER.map((day) => ({
    day: day.slice(0, 3),
    minutes: pattern[day] ?? 0,
  }));
  const hasAny = data.some((d) => d.minutes > 0);
  if (!hasAny) return <div className="text-sm text-muted-foreground text-center py-6">No weekly data yet.</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 6,
            fontSize: 12,
          }}
          formatter={(value) => [`${value}m`, 'Active']}
        />
        <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
